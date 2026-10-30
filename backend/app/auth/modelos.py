from datetime import datetime

from sqlalchemy import Boolean, Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, FechaUTC, IdPK, ahora

rol_permiso = Table(
    "rol_permiso",
    Base.metadata,
    Column("rol_id", ForeignKey("rol.id", ondelete="CASCADE"), primary_key=True),
    Column("permiso_codigo", ForeignKey("permiso.codigo", ondelete="CASCADE"), primary_key=True),
)


class Permiso(Base):
    __tablename__ = "permiso"

    codigo: Mapped[str] = mapped_column(String(50), primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(200))


class Rol(Base):
    __tablename__ = "rol"

    id: Mapped[int] = mapped_column(IdPK, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    nombre: Mapped[str] = mapped_column(String(60))
    permisos: Mapped[list[Permiso]] = relationship(secondary=rol_permiso, lazy="selectin")


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(IdPK, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    correo: Mapped[str] = mapped_column(String(160), unique=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    rol_id: Mapped[int] = mapped_column(ForeignKey("rol.id"))
    rol: Mapped[Rol] = relationship(lazy="joined")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    ultimo_acceso: Mapped[datetime | None] = mapped_column(FechaUTC)
    creado: Mapped[datetime] = mapped_column(FechaUTC, default=ahora)

    def permisos(self) -> list[str]:
        return sorted(p.codigo for p in self.rol.permisos)
