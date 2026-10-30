"""Ejecución de campañas: el scheduler arranca las programadas y envía por lotes.

Cada lote corre en su propia transacción. Con una sola instancia del backend basta;
si se escalan réplicas, hay que agregar un candado (por ejemplo, un advisory lock de PostgreSQL).
"""
import logging
from collections.abc import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.campanas.modelos import Campana, Destinatario, EstadoCampana as E, EstadoEnvio
from app.campanas.plantillas import resolver_variables
from app.db import ahora
from app.integracion.gateway import MessagingGateway

log = logging.getLogger(__name__)


def iniciar_programadas(db: Session) -> list[int]:
    campanas = db.scalars(select(Campana).where(Campana.estado == E.PROGRAMADA,
                                                Campana.fecha_programada <= ahora())).unique().all()
    for c in campanas:
        c.estado = E.EN_EJECUCION
        c.fecha_inicio_envio = ahora()
        log.info("Campaña %s iniciada", c.id)
    return [c.id for c in campanas]


def enviar_lote(db: Session, campana_id: int, tamano: int, gateway: MessagingGateway) -> None:
    c = db.get(Campana, campana_id)
    if c is None or c.estado != E.EN_EJECUCION:  # pudo pausarse o cancelarse
        return
    lote = db.scalars(
        select(Destinatario)
        .where(Destinatario.campana_id == campana_id, Destinatario.valido.is_(True),
               Destinatario.estado_envio == EstadoEnvio.PENDIENTE)
        .order_by(Destinatario.id).limit(tamano)
    ).all()

    if not lote:
        c.estado = E.COMPLETADA
        c.fecha_fin_envio = ahora()
        log.info("Campaña %s completada", campana_id)
        return

    for d in lote:
        variables = resolver_variables(c.plantilla, c.mapeo_variables or {}, d.datos or {})
        r = gateway.enviar_plantilla(d.telefono, c.plantilla.nombre_externo, variables)
        d.estado_envio = EstadoEnvio.ENVIADO if r.exitoso else EstadoEnvio.FALLIDO
        d.mensaje_externo_id = r.mensaje_id
        d.error_envio = r.error
        d.enviado_en = ahora()


def ciclo(crear_sesion: Callable[[], Session], tamano_lote: int, gateway: MessagingGateway) -> None:
    """Un ciclo del scheduler: arranca programadas y envía un lote de cada campaña en ejecución."""
    with crear_sesion() as db, db.begin():
        iniciar_programadas(db)
    with crear_sesion() as db:
        en_ejecucion = db.scalars(select(Campana.id).where(Campana.estado == E.EN_EJECUCION)).all()
    for campana_id in en_ejecucion:
        try:
            with crear_sesion() as db, db.begin():
                enviar_lote(db, campana_id, tamano_lote, gateway)
        except Exception:
            log.exception("Error procesando la campaña %s", campana_id)
