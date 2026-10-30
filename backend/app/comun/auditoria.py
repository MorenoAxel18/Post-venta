from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.db import Base, FechaUTC, IdPK, ahora


class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(IdPK, primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuario.id"))
    entidad: Mapped[str] = mapped_column(String(40))
    entidad_id: Mapped[int | None]
    accion: Mapped[str] = mapped_column(String(40))
    detalle: Mapped[str | None] = mapped_column(String(500))
    fecha: Mapped[datetime] = mapped_column(FechaUTC, default=ahora)


def registrar(db: Session, usuario_id: int | None, entidad: str, entidad_id: int | None,
              accion: str, detalle: str | None = None) -> None:
    db.add(Auditoria(usuario_id=usuario_id, entidad=entidad, entidad_id=entidad_id,
                     accion=accion, detalle=detalle[:500] if detalle else None))
