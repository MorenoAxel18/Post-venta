from datetime import datetime

from pydantic import Field

from app.comun.esquemas import CamelModel

# ---------- Peticiones ----------


class UsuarioRequest(CamelModel):
    nombre: str = Field(min_length=1, max_length=120)
    correo: str = Field(min_length=3, max_length=160, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    rol_id: int
    activo: bool = True


class UsuarioNuevoRequest(UsuarioRequest):
    password: str = Field(min_length=8, max_length=72)  # bcrypt solo usa los primeros 72 bytes


class PasswordRequest(CamelModel):
    password: str = Field(min_length=8, max_length=72)


class RolRequest(CamelModel):
    nombre: str = Field(min_length=1, max_length=60)
    permisos: list[str]


class RolNuevoRequest(RolRequest):
    # El código no se edita después: el frontend y los catálogos lo usan como identificador
    codigo: str = Field(min_length=2, max_length=30, pattern=r"^[A-Z0-9_]+$")


class PlantillaRequest(CamelModel):
    nombre: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9_]+$")
    descripcion: str | None = Field(default=None, max_length=200)
    cuerpo: str = Field(min_length=1, max_length=1024)
    activa: bool = True


# ---------- Respuestas ----------


class UsuarioAdmin(CamelModel):
    id: int
    nombre: str
    correo: str
    rol_id: int
    rol: str
    activo: bool
    ultimo_acceso: datetime | None
    creado: datetime


class PermisoDto(CamelModel):
    codigo: str
    descripcion: str


class RolAdmin(CamelModel):
    id: int
    codigo: str
    nombre: str
    permisos: list[str]
    usuarios: int


class PlantillaAdmin(CamelModel):
    id: int
    nombre: str
    descripcion: str | None
    cuerpo: str
    variables: list[str]
    activa: bool
    en_uso: bool  # la usa una campaña que aún no termina: no se puede cambiar el texto


class RegistroAuditoria(CamelModel):
    id: int
    fecha: datetime
    usuario: str | None
    entidad: str
    entidad_id: int | None
    accion: str
    detalle: str | None
