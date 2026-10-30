from datetime import datetime

from pydantic import Field

from app.campanas.modelos import EstadoCampana, EstadoEnvio
from app.comun.esquemas import CamelModel

# ---------- Peticiones ----------


class InfoRequest(CamelModel):
    nombre: str = Field(min_length=1, max_length=150)
    objetivo: str = Field(min_length=1, max_length=60)
    descripcion: str | None = Field(default=None, max_length=500)


class MensajeRequest(CamelModel):
    plantilla_id: int
    mapeo: dict[str, str]


class ProgramacionRequest(CamelModel):
    inmediata: bool = False
    fecha_programada: datetime | None = None


class RechazoRequest(CamelModel):
    motivo: str = Field(min_length=1, max_length=500)


# ---------- Respuestas ----------


class PlantillaDto(CamelModel):
    id: int
    nombre: str
    descripcion: str | None
    cuerpo: str
    variables: list[str]


class CampanaResumen(CamelModel):
    id: int
    nombre: str
    objetivo: str
    estado: EstadoCampana
    creada: datetime
    fecha_programada: datetime | None
    ejecucion_inmediata: bool
    destinatarios: int


class Acciones(CamelModel):
    """Qué puede hacer el usuario actual con la campaña (el frontend solo pinta botones)."""

    editar: bool
    enviar_aprobacion: bool
    aprobar: bool
    rechazar: bool
    pausar: bool
    reanudar: bool
    cancelar: bool
    motivo_no_aprobar: str | None


class CampanaDetalle(CamelModel):
    id: int
    nombre: str
    objetivo: str
    descripcion: str | None
    estado: EstadoCampana
    archivo_nombre: str | None
    columnas: list[str]
    total_registros: int
    registros_validos: int
    registros_error: int
    plantilla: PlantillaDto | None
    mapeo_variables: dict[str, str]
    ejecucion_inmediata: bool
    fecha_programada: datetime | None
    fecha_inicio_envio: datetime | None
    fecha_fin_envio: datetime | None
    creada_por: str | None
    aprobada_por: str | None
    fecha_aprobacion: datetime | None
    motivo_rechazo: str | None
    creada: datetime
    envios: dict[EstadoEnvio, int]
    acciones: Acciones


class CargaResultado(CamelModel):
    archivo: str
    total: int
    validos: int
    errores: int
    columnas: list[str]


class ErrorRegistro(CamelModel):
    fila: int
    id_cliente: str | None
    telefono: str | None
    error: str | None


class Muestra(CamelModel):
    datos: dict[str, str]
    mensaje: str | None
