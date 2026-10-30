from datetime import date, datetime

from app.campanas.modelos import EstadoCampana
from app.comun.esquemas import CamelModel


class Resumen(CamelModel):
    enviados: int  # incluye entregados y leídos
    fallidos: int
    tasa_fallo: float  # 0 a 1, sobre enviados + fallidos
    entregados: int
    leidos: int
    pendientes: int  # en cola de campañas programadas, en ejecución o pausadas
    campanas_activas: int
    campanas_completadas: int


class PuntoDia(CamelModel):
    fecha: date  # día en hora del centro de México
    enviados: int
    fallidos: int


class FilaCampana(CamelModel):
    id: int
    nombre: str
    objetivo: str
    estado: EstadoCampana
    fecha_inicio_envio: datetime | None
    fecha_fin_envio: datetime | None
    destinatarios: int
    enviados: int
    fallidos: int
    pendientes: int
    cancelados: int


class MotivoError(CamelModel):
    motivo: str
    total: int


class MonitoreoCampanas(CamelModel):
    desde: date
    hasta: date
    envio_simulado: bool  # sin Treble no hay entregados ni leídos
    resumen: Resumen
    por_dia: list[PuntoDia]
    campanas: list[FilaCampana]
    errores_cartera: list[MotivoError]
    errores_envio: list[MotivoError]
