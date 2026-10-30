"""Indicadores de campañas. Solo lectura: agrega lo que ya existe en campana y destinatario.

Los días se cuentan en hora del centro de México. Desde 2022 no hay horario de verano,
así que el desfase es fijo (UTC-6) y se puede usar sin base de zonas horarias.
"""
import re
from collections import Counter
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.campanas.modelos import Campana, Destinatario, EstadoCampana as E, EstadoEnvio as EE
from app.comun.errores import ApiError
from app.integracion.gateway import FakeMessagingGateway, get_gateway
from app.monitoreo.esquemas import FilaCampana, MonitoreoCampanas, MotivoError, PuntoDia, Resumen

ZONA_MX = timezone(timedelta(hours=-6))
DIAS_DEFAULT = 30
DIAS_MAXIMO = 366
TOP_ERRORES = 5

ENVIADOS = (EE.ENVIADO, EE.ENTREGADO, EE.LEIDO)
ACTIVAS = (E.PROGRAMADA, E.EN_EJECUCION, E.PAUSADA)

# "Teléfono duplicado (fila 3)" y "(fila 7)" son el mismo motivo
_FILA = re.compile(r"\s*\(fila \d+\)")


def campanas(db: Session, desde: date | None, hasta: date | None, objetivo: str | None) -> MonitoreoCampanas:
    hasta = hasta or datetime.now(ZONA_MX).date()
    desde = desde or hasta - timedelta(days=DIAS_DEFAULT - 1)
    if desde > hasta:
        raise ApiError.invalido("La fecha inicial no puede ser posterior a la final.")
    if (hasta - desde).days + 1 > DIAS_MAXIMO:
        raise ApiError.invalido(f"El periodo no puede ser mayor a {DIAS_MAXIMO} días.")

    inicio = datetime.combine(desde, time.min, ZONA_MX)
    fin = datetime.combine(hasta + timedelta(days=1), time.min, ZONA_MX)
    obj = objetivo.strip() if objetivo and objetivo.strip() else None

    def filtro_objetivo(stmt):
        return stmt.where(Campana.objetivo == obj) if obj else stmt

    en_periodo = (Destinatario.enviado_en >= inicio, Destinatario.enviado_en < fin)

    # ---- Envíos del periodo por día y estado ----
    dia = _dia_local(db, Destinatario.enviado_en)
    filas = db.execute(filtro_objetivo(
        select(dia, Destinatario.estado_envio, func.count())
        .join(Campana, Campana.id == Destinatario.campana_id)
        .where(*en_periodo)
        .group_by(dia, Destinatario.estado_envio)
    )).all()

    por_dia = {desde + timedelta(days=i): [0, 0] for i in range((hasta - desde).days + 1)}
    por_estado: Counter[EE] = Counter()
    for d, estado, total in filas:
        por_estado[estado] += total
        punto = por_dia.get(_a_fecha(d))
        if punto is None:
            continue
        if estado in ENVIADOS:
            punto[0] += total
        elif estado == EE.FALLIDO:
            punto[1] += total

    enviados = sum(por_estado[e] for e in ENVIADOS)
    fallidos = por_estado[EE.FALLIDO]

    # ---- Campañas: activas ahora o con envíos dentro del periodo ----
    con_envios = select(Destinatario.campana_id).where(*en_periodo).distinct()
    lista = db.scalars(filtro_objetivo(
        select(Campana)
        .where(or_(Campana.estado.in_(ACTIVAS), Campana.id.in_(con_envios)))
        .order_by(Campana.fecha_inicio_envio.desc().nulls_first(), Campana.id.desc())
    )).unique().all()

    conteos: dict[int, Counter[EE]] = {c.id: Counter() for c in lista}
    if lista:
        for cid, estado, total in db.execute(
            select(Destinatario.campana_id, Destinatario.estado_envio, func.count())
            .where(Destinatario.campana_id.in_(conteos), Destinatario.valido.is_(True))
            .group_by(Destinatario.campana_id, Destinatario.estado_envio)
        ):
            conteos[cid][estado] = total

    tabla = [
        FilaCampana(
            id=c.id, nombre=c.nombre, objetivo=c.objetivo, estado=c.estado,
            fecha_inicio_envio=c.fecha_inicio_envio, fecha_fin_envio=c.fecha_fin_envio,
            destinatarios=c.registros_validos,
            enviados=sum(conteos[c.id][e] for e in ENVIADOS), fallidos=conteos[c.id][EE.FALLIDO],
            pendientes=conteos[c.id][EE.PENDIENTE], cancelados=conteos[c.id][EE.CANCELADO],
        )
        for c in lista
    ]

    completadas = db.scalar(filtro_objetivo(
        select(func.count(Campana.id))
        .where(Campana.estado == E.COMPLETADA, Campana.fecha_fin_envio >= inicio, Campana.fecha_fin_envio < fin)
    )) or 0

    return MonitoreoCampanas(
        desde=desde, hasta=hasta,
        envio_simulado=isinstance(get_gateway(), FakeMessagingGateway),
        resumen=Resumen(
            enviados=enviados, fallidos=fallidos,
            tasa_fallo=round(fallidos / (enviados + fallidos), 4) if enviados + fallidos else 0.0,
            entregados=por_estado[EE.ENTREGADO] + por_estado[EE.LEIDO], leidos=por_estado[EE.LEIDO],
            pendientes=sum(f.pendientes for f in tabla if f.estado in ACTIVAS),
            campanas_activas=sum(f.estado in ACTIVAS for f in tabla),
            campanas_completadas=completadas,
        ),
        por_dia=[PuntoDia(fecha=d, enviados=v[0], fallidos=v[1]) for d, v in por_dia.items()],
        campanas=tabla,
        errores_cartera=_top(db, filtro_objetivo(
            select(Destinatario.error, func.count())
            .join(Campana, Campana.id == Destinatario.campana_id)
            .where(Destinatario.valido.is_(False), Campana.creada >= inicio, Campana.creada < fin)
            .group_by(Destinatario.error)
        )),
        errores_envio=_top(db, filtro_objetivo(
            select(Destinatario.error_envio, func.count())
            .join(Campana, Campana.id == Destinatario.campana_id)
            .where(Destinatario.estado_envio == EE.FALLIDO, *en_periodo)
            .group_by(Destinatario.error_envio)
        )),
    )


def _dia_local(db: Session, columna):
    """Expresión SQL con el día (en hora de México) de una fecha guardada en UTC."""
    if db.get_bind().dialect.name == "postgresql":
        return func.date(func.timezone("America/Mexico_City", columna))
    return func.date(columna, "-6 hours")  # SQLite (pruebas)


def _a_fecha(valor) -> date:
    return valor if isinstance(valor, date) else date.fromisoformat(str(valor))


def _top(db: Session, stmt) -> list[MotivoError]:
    motivos: Counter[str] = Counter()
    for motivo, total in db.execute(stmt):
        motivos[_FILA.sub("", motivo or "Sin detalle")] += total
    return [MotivoError(motivo=m, total=t) for m, t in motivos.most_common(TOP_ERRORES)]
