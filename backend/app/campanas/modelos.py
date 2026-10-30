import enum
from datetime import datetime

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, FechaUTC, IdPK, JsonB, ahora


class EstadoCampana(str, enum.Enum):
    BORRADOR = "BORRADOR"
    PENDIENTE_APROBACION = "PENDIENTE_APROBACION"
    PROGRAMADA = "PROGRAMADA"
    EN_EJECUCION = "EN_EJECUCION"
    PAUSADA = "PAUSADA"
    COMPLETADA = "COMPLETADA"
    CANCELADA = "CANCELADA"

    def puede_pasar_a(self, destino: "EstadoCampana") -> bool:
        return destino in TRANSICIONES[self]


E = EstadoCampana
TRANSICIONES: dict[EstadoCampana, set[EstadoCampana]] = {
    E.BORRADOR: {E.PENDIENTE_APROBACION, E.CANCELADA},
    E.PENDIENTE_APROBACION: {E.PROGRAMADA, E.BORRADOR, E.CANCELADA},
    E.PROGRAMADA: {E.EN_EJECUCION, E.CANCELADA},
    E.EN_EJECUCION: {E.PAUSADA, E.COMPLETADA, E.CANCELADA},
    E.PAUSADA: {E.EN_EJECUCION, E.CANCELADA},
    E.COMPLETADA: set(),
    E.CANCELADA: set(),
}


class EstadoEnvio(str, enum.Enum):
    """ENTREGADO y LEIDO llegarán por el webhook de Treble."""

    PENDIENTE = "PENDIENTE"
    ENVIADO = "ENVIADO"
    ENTREGADO = "ENTREGADO"
    LEIDO = "LEIDO"
    FALLIDO = "FALLIDO"
    CANCELADO = "CANCELADO"


def _enum(tipo: type[enum.Enum], largo: int) -> Enum:
    # Se guarda como texto (VARCHAR), no como tipo ENUM de PostgreSQL, para migrar sin dolor
    return Enum(tipo, native_enum=False, length=largo, validate_strings=True)


class Plantilla(Base):
    __tablename__ = "plantilla"

    id: Mapped[int] = mapped_column(IdPK, primary_key=True)
    nombre_externo: Mapped[str] = mapped_column(String(120), unique=True)  # nombre en Treble / Meta
    descripcion: Mapped[str | None] = mapped_column(String(200))
    cuerpo: Mapped[str] = mapped_column(Text)  # texto con variables {{variable}}
    variables: Mapped[list[str]] = mapped_column(JsonB, default=list)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)


class Campana(Base):
    __tablename__ = "campana"
    __table_args__ = (Index("idx_campana_estado_fecha", "estado", "fecha_programada"),)

    id: Mapped[int] = mapped_column(IdPK, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    objetivo: Mapped[str] = mapped_column(String(60))
    descripcion: Mapped[str | None] = mapped_column(String(500))
    estado: Mapped[EstadoCampana] = mapped_column(_enum(EstadoCampana, 30), default=EstadoCampana.BORRADOR)

    # Cartera
    archivo_nombre: Mapped[str | None] = mapped_column(String(255))
    columnas: Mapped[list[str]] = mapped_column(JsonB, default=list)
    total_registros: Mapped[int] = mapped_column(Integer, default=0)
    registros_validos: Mapped[int] = mapped_column(Integer, default=0)
    registros_error: Mapped[int] = mapped_column(Integer, default=0)

    # Mensaje: variable de la plantilla -> columna de la cartera
    plantilla_id: Mapped[int | None] = mapped_column(ForeignKey("plantilla.id"))
    plantilla: Mapped[Plantilla | None] = relationship(lazy="joined")
    mapeo_variables: Mapped[dict[str, str]] = mapped_column(JsonB, default=dict)

    # Programación
    ejecucion_inmediata: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_programada: Mapped[datetime | None] = mapped_column(FechaUTC)
    fecha_inicio_envio: Mapped[datetime | None] = mapped_column(FechaUTC)
    fecha_fin_envio: Mapped[datetime | None] = mapped_column(FechaUTC)

    # Aprobación
    creada_por: Mapped[int] = mapped_column(ForeignKey("usuario.id"))
    enviada_aprobacion_por: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    aprobada_por: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    fecha_aprobacion: Mapped[datetime | None] = mapped_column(FechaUTC)
    motivo_rechazo: Mapped[str | None] = mapped_column(String(500))

    creada: Mapped[datetime] = mapped_column(FechaUTC, default=ahora)
    actualizada: Mapped[datetime] = mapped_column(FechaUTC, default=ahora, onupdate=ahora)

    def tiene_mensaje_completo(self) -> bool:
        return self.plantilla is not None and all(
            (self.mapeo_variables or {}).get(v) for v in self.plantilla.variables
        )

    def tiene_programacion(self) -> bool:
        return self.ejecucion_inmediata or self.fecha_programada is not None


class Destinatario(Base):
    __tablename__ = "destinatario"
    __table_args__ = (
        Index("idx_destinatario_campana", "campana_id", "valido", "estado_envio"),
        Index("idx_destinatario_enviado_en", "enviado_en"),
    )

    id: Mapped[int] = mapped_column(IdPK, primary_key=True)
    campana_id: Mapped[int] = mapped_column(ForeignKey("campana.id", ondelete="CASCADE"))
    fila: Mapped[int] = mapped_column(Integer)
    id_cliente: Mapped[str | None] = mapped_column(String(60))
    nombre: Mapped[str | None] = mapped_column(String(150))
    telefono_original: Mapped[str | None] = mapped_column(String(40))
    telefono: Mapped[str | None] = mapped_column(String(15))  # normalizado a 10 dígitos
    datos: Mapped[dict[str, str]] = mapped_column(JsonB, default=dict)  # todas las columnas del archivo
    valido: Mapped[bool] = mapped_column(Boolean)
    error: Mapped[str | None] = mapped_column(String(200))
    estado_envio: Mapped[EstadoEnvio] = mapped_column(_enum(EstadoEnvio, 20), default=EstadoEnvio.PENDIENTE)
    mensaje_externo_id: Mapped[str | None] = mapped_column(String(120))
    error_envio: Mapped[str | None] = mapped_column(String(300))
    # Cuándo se intentó el envío (ENVIADO o FALLIDO); base de las gráficas de monitoreo
    enviado_en: Mapped[datetime | None] = mapped_column(FechaUTC)
    actualizado: Mapped[datetime] = mapped_column(FechaUTC, default=ahora, onupdate=ahora)
