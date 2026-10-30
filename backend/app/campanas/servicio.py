"""Reglas de negocio de campañas. Las funciones reciben la sesión y el usuario actual."""
import csv
import io
from datetime import timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.auth.modelos import Usuario
from app.auth.seguridad import UsuarioPrincipal
from app.campanas import cartera, validador
from app.campanas.esquemas import (
    Acciones, CampanaDetalle, CampanaResumen, CargaResultado, ErrorRegistro, InfoRequest,
    MensajeRequest, Muestra, PlantillaDto, ProgramacionRequest,
)
from app.campanas.modelos import Campana, Destinatario, EstadoCampana as E, EstadoEnvio, Plantilla
from app.campanas.plantillas import renderizar, resolver_variables
from app.comun.auditoria import registrar
from app.comun.errores import ApiError
from app.config import get_settings
from app.db import ahora

ENTIDAD = "CAMPANA"

# ===================== Consultas =====================


def listar(db: Session, estado: E | None, q: str | None) -> list[CampanaResumen]:
    stmt = select(Campana).order_by(Campana.creada.desc(), Campana.id.desc())
    if estado:
        stmt = stmt.where(Campana.estado == estado)
    if q and q.strip():
        stmt = stmt.where(func.lower(Campana.nombre).contains(q.strip().lower()))
    return [
        CampanaResumen(
            id=c.id, nombre=c.nombre, objetivo=c.objetivo, estado=c.estado, creada=c.creada,
            fecha_programada=c.fecha_programada, ejecucion_inmediata=c.ejecucion_inmediata,
            destinatarios=c.registros_validos,
        )
        for c in db.scalars(stmt).unique()
    ]


def detalle(db: Session, id: int, u: UsuarioPrincipal) -> CampanaDetalle:
    return _a_detalle(db, _obtener(db, id), u)


def errores(db: Session, id: int) -> list[ErrorRegistro]:
    _obtener(db, id)
    stmt = (select(Destinatario)
            .where(Destinatario.campana_id == id, Destinatario.valido.is_(False))
            .order_by(Destinatario.fila))
    return [ErrorRegistro(fila=d.fila, id_cliente=d.id_cliente, telefono=d.telefono_original, error=d.error)
            for d in db.scalars(stmt)]


def exportar_errores(db: Session, id: int) -> bytes:
    salida = io.StringIO()
    w = csv.writer(salida)
    w.writerow(["fila", "id_cliente", "telefono", "error"])
    for e in errores(db, id):
        w.writerow([e.fila, e.id_cliente or "", e.telefono or "", e.error or ""])
    return ("\ufeff" + salida.getvalue()).encode("utf-8")  # BOM para que Excel respete acentos


def muestra(db: Session, id: int) -> Muestra:
    c = _obtener(db, id)
    d = db.scalar(select(Destinatario)
                  .where(Destinatario.campana_id == id, Destinatario.valido.is_(True))
                  .order_by(Destinatario.fila).limit(1))
    datos = d.datos if d else {}
    mensaje = None
    if c.plantilla:
        mensaje = renderizar(c.plantilla.cuerpo, resolver_variables(c.plantilla, c.mapeo_variables or {}, datos))
    return Muestra(datos=datos, mensaje=mensaje)


def plantillas(db: Session) -> list[PlantillaDto]:
    return [_plantilla_dto(p) for p in
            db.scalars(select(Plantilla).where(Plantilla.activa.is_(True)).order_by(Plantilla.nombre_externo))]


# ===================== Wizard (solo en BORRADOR) =====================


def crear(db: Session, req: InfoRequest, u: UsuarioPrincipal) -> CampanaDetalle:
    c = Campana(creada_por=u.id, estado=E.BORRADOR, columnas=[], mapeo_variables={})
    _aplicar_info(c, req)
    db.add(c)
    db.flush()
    registrar(db, u.id, ENTIDAD, c.id, "CREAR", c.nombre)
    return _a_detalle(db, c, u)


def actualizar_info(db: Session, id: int, req: InfoRequest, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _editable(db, id)
    _aplicar_info(c, req)
    return _a_detalle(db, c, u)


def cargar_cartera(db: Session, id: int, nombre_archivo: str, contenido: bytes,
                   u: UsuarioPrincipal) -> CargaResultado:
    s = get_settings()
    c = _editable(db, id)
    if len(contenido) > s.max_tamano_archivo:
        raise ApiError(413, "El archivo supera el tamaño máximo de 10 MB.")

    leido = cartera.leer(nombre_archivo, contenido, s.max_filas_cartera)
    r = validador.validar(id, leido)

    db.execute(delete(Destinatario).where(Destinatario.campana_id == id))
    db.add_all(r.destinatarios)

    c.archivo_nombre = nombre_archivo
    c.columnas = list(leido.columnas)
    c.total_registros = len(r.destinatarios)
    c.registros_validos = r.validos
    c.registros_error = r.errores
    # Si cambió la cartera, el mapeo anterior puede apuntar a columnas que ya no existen
    c.mapeo_variables = {k: v for k, v in (c.mapeo_variables or {}).items() if v in leido.columnas}

    registrar(db, u.id, ENTIDAD, id, "CARGAR_CARTERA",
              f"{nombre_archivo} ({r.validos} válidos, {r.errores} con error)")
    return CargaResultado(archivo=nombre_archivo, total=c.total_registros, validos=r.validos,
                          errores=r.errores, columnas=c.columnas)


def actualizar_mensaje(db: Session, id: int, req: MensajeRequest, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _editable(db, id)
    p = db.get(Plantilla, req.plantilla_id)
    if p is None or not p.activa:
        raise ApiError.no_encontrado("La plantilla")
    if not c.columnas:
        raise ApiError.conflicto("Primero carga la cartera de clientes.")

    mapeo: dict[str, str] = {}
    for variable in p.variables:
        col = (req.mapeo.get(variable) or "").strip()
        if not col:
            raise ApiError.invalido(f"Elige la columna para la variable {{{{{variable}}}}}.")
        if col not in c.columnas:
            raise ApiError.invalido(f'La columna "{col}" no existe en la cartera cargada.')
        mapeo[variable] = col

    c.plantilla = p
    c.mapeo_variables = mapeo
    return _a_detalle(db, c, u)


def actualizar_programacion(db: Session, id: int, req: ProgramacionRequest, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _editable(db, id)
    if req.inmediata:
        c.ejecucion_inmediata = True
        c.fecha_programada = None
    else:
        if req.fecha_programada is None:
            raise ApiError.invalido("Elige la fecha y hora de envío.")
        if req.fecha_programada.tzinfo is None:
            raise ApiError.invalido("La fecha debe incluir zona horaria.")
        if req.fecha_programada < ahora() + timedelta(minutes=5):
            raise ApiError.invalido("La fecha de envío debe ser al menos 5 minutos en el futuro.")
        c.ejecucion_inmediata = False
        c.fecha_programada = req.fecha_programada
    return _a_detalle(db, c, u)


# ===================== Aprobación y ejecución =====================


def enviar_aprobacion(db: Session, id: int, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _editable(db, id)
    if c.registros_validos == 0:
        raise ApiError.conflicto("La campaña no tiene destinatarios válidos.")
    if not c.tiene_mensaje_completo():
        raise ApiError.conflicto("Completa la plantilla y sus variables.")
    if not c.tiene_programacion():
        raise ApiError.conflicto("Define cuándo se enviará la campaña.")
    _cambiar_estado(c, E.PENDIENTE_APROBACION)
    c.enviada_aprobacion_por = u.id
    c.motivo_rechazo = None
    registrar(db, u.id, ENTIDAD, id, "ENVIAR_APROBACION")
    return _a_detalle(db, c, u)


def aprobar(db: Session, id: int, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _obtener(db, id)
    motivo = _motivo_no_aprobar(c, u)
    if motivo:
        raise ApiError.conflicto(motivo)
    if c.ejecucion_inmediata:
        c.fecha_programada = ahora()
    elif c.fecha_programada < ahora():
        raise ApiError.conflicto("La fecha programada ya pasó. Pide que se reprograme la campaña.")
    _cambiar_estado(c, E.PROGRAMADA)
    c.aprobada_por = u.id
    c.fecha_aprobacion = ahora()
    registrar(db, u.id, ENTIDAD, id, "APROBAR")
    return _a_detalle(db, c, u)


def rechazar(db: Session, id: int, motivo: str, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _obtener(db, id)
    if c.estado != E.PENDIENTE_APROBACION:
        raise ApiError.conflicto("Solo se pueden rechazar campañas pendientes de aprobación.")
    _cambiar_estado(c, E.BORRADOR)
    c.motivo_rechazo = motivo.strip()
    registrar(db, u.id, ENTIDAD, id, "RECHAZAR", motivo)
    return _a_detalle(db, c, u)


def pausar(db: Session, id: int, u: UsuarioPrincipal) -> CampanaDetalle:
    return _transicion_simple(db, id, E.PAUSADA, "PAUSAR", u)


def reanudar(db: Session, id: int, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _obtener(db, id)
    if c.estado != E.PAUSADA:
        raise ApiError.conflicto("Solo se pueden reanudar campañas pausadas.")
    return _transicion_simple(db, id, E.EN_EJECUCION, "REANUDAR", u)


def cancelar(db: Session, id: int, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _obtener(db, id)
    _cambiar_estado(c, E.CANCELADA)
    db.execute(update(Destinatario)
               .where(Destinatario.campana_id == id, Destinatario.valido.is_(True),
                      Destinatario.estado_envio == EstadoEnvio.PENDIENTE)
               .values(estado_envio=EstadoEnvio.CANCELADO))
    registrar(db, u.id, ENTIDAD, id, "CANCELAR")
    return _a_detalle(db, c, u)


# ===================== Apoyo =====================


def _obtener(db: Session, id: int) -> Campana:
    c = db.get(Campana, id)
    if c is None:
        raise ApiError.no_encontrado("La campaña")
    return c


def _editable(db: Session, id: int) -> Campana:
    c = _obtener(db, id)
    if c.estado != E.BORRADOR:
        raise ApiError.conflicto("Solo se pueden editar campañas en borrador.")
    return c


def _cambiar_estado(c: Campana, destino: E) -> None:
    if not c.estado.puede_pasar_a(destino):
        raise ApiError.conflicto(f"No se puede pasar de {c.estado.value} a {destino.value}.")
    c.estado = destino


def _transicion_simple(db: Session, id: int, destino: E, accion: str, u: UsuarioPrincipal) -> CampanaDetalle:
    c = _obtener(db, id)
    _cambiar_estado(c, destino)
    registrar(db, u.id, ENTIDAD, id, accion)
    return _a_detalle(db, c, u)


def _aplicar_info(c: Campana, req: InfoRequest) -> None:
    nombre = req.nombre.strip()
    if not nombre:
        raise ApiError.invalido("Escribe el nombre de la campaña.")
    c.nombre = nombre
    c.objetivo = req.objetivo.strip()
    c.descripcion = (req.descripcion or "").strip() or None


def _motivo_no_aprobar(c: Campana, u: UsuarioPrincipal) -> str | None:
    """None si el usuario puede aprobar; si no, la razón para mostrarla en pantalla."""
    if c.estado != E.PENDIENTE_APROBACION:
        return "La campaña no está pendiente de aprobación."
    if not u.tiene("CAMPANA_APROBAR"):
        return "Tu perfil no puede aprobar campañas."
    es_autor = u.id in (c.creada_por, c.enviada_aprobacion_por)
    if es_autor and not get_settings().permitir_autoaprobacion:
        return "Otra persona debe aprobar esta campaña porque tú la preparaste."
    return None


def _plantilla_dto(p: Plantilla | None) -> PlantillaDto | None:
    if p is None:
        return None
    return PlantillaDto(id=p.id, nombre=p.nombre_externo, descripcion=p.descripcion,
                        cuerpo=p.cuerpo, variables=list(p.variables))


def _nombre_usuario(db: Session, id: int | None) -> str | None:
    if id is None:
        return None
    u = db.get(Usuario, id)
    return u.nombre if u else None


def _a_detalle(db: Session, c: Campana, u: UsuarioPrincipal) -> CampanaDetalle:
    db.flush()
    conteos = db.execute(
        select(Destinatario.estado_envio, func.count())
        .where(Destinatario.campana_id == c.id, Destinatario.valido.is_(True))
        .group_by(Destinatario.estado_envio)
    ).all()
    puede_crear = u.tiene("CAMPANA_CREAR")
    puede_gestionar = puede_crear or u.tiene("CAMPANA_APROBAR")
    motivo = _motivo_no_aprobar(c, u)

    return CampanaDetalle(
        id=c.id, nombre=c.nombre, objetivo=c.objetivo, descripcion=c.descripcion, estado=c.estado,
        archivo_nombre=c.archivo_nombre, columnas=list(c.columnas or []),
        total_registros=c.total_registros, registros_validos=c.registros_validos,
        registros_error=c.registros_error,
        plantilla=_plantilla_dto(c.plantilla), mapeo_variables=dict(c.mapeo_variables or {}),
        ejecucion_inmediata=c.ejecucion_inmediata, fecha_programada=c.fecha_programada,
        fecha_inicio_envio=c.fecha_inicio_envio, fecha_fin_envio=c.fecha_fin_envio,
        creada_por=_nombre_usuario(db, c.creada_por), aprobada_por=_nombre_usuario(db, c.aprobada_por),
        fecha_aprobacion=c.fecha_aprobacion, motivo_rechazo=c.motivo_rechazo, creada=c.creada,
        envios={estado: total for estado, total in conteos},
        acciones=Acciones(
            editar=puede_crear and c.estado == E.BORRADOR,
            enviar_aprobacion=puede_crear and c.estado == E.BORRADOR,
            aprobar=motivo is None,
            rechazar=c.estado == E.PENDIENTE_APROBACION and u.tiene("CAMPANA_APROBAR"),
            pausar=puede_gestionar and c.estado.puede_pasar_a(E.PAUSADA),
            reanudar=puede_gestionar and c.estado == E.PAUSADA,
            cancelar=puede_gestionar and c.estado.puede_pasar_a(E.CANCELADA),
            motivo_no_aprobar=motivo if c.estado == E.PENDIENTE_APROBACION else None,
        ),
    )
