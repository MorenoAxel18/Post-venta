from pydantic import Field

from app.comun.esquemas import CamelModel


class LoginRequest(CamelModel):
    correo: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=1)


class UsuarioResponse(CamelModel):
    id: int
    nombre: str
    correo: str
    rol: str
    permisos: list[str]


class LoginResponse(CamelModel):
    token: str
    usuario: UsuarioResponse
