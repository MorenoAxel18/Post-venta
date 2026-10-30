from dataclasses import dataclass, field
from datetime import timedelta
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, Header

from app.comun.errores import ApiError
from app.config import get_settings
from app.db import ahora


@dataclass(frozen=True)
class UsuarioPrincipal:
    """Usuario autenticado tal como viaja en el JWT (no se consulta la BD en cada petición)."""

    id: int
    correo: str
    nombre: str
    rol: str
    permisos: frozenset[str] = field(default_factory=frozenset)

    def tiene(self, permiso: str) -> bool:
        return permiso in self.permisos


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verificar_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def generar_token(u: UsuarioPrincipal) -> str:
    s = get_settings()
    momento = ahora()
    payload = {
        "sub": str(u.id),
        "correo": u.correo,
        "nombre": u.nombre,
        "rol": u.rol,
        "permisos": sorted(u.permisos),
        "iat": momento,
        "exp": momento + timedelta(minutes=s.jwt_expiracion_minutos),
    }
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256")


def leer_token(token: str) -> UsuarioPrincipal | None:
    try:
        c = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        return UsuarioPrincipal(int(c["sub"]), c["correo"], c["nombre"], c["rol"], frozenset(c.get("permisos", [])))
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def usuario_actual(authorization: Annotated[str | None, Header()] = None) -> UsuarioPrincipal:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError.no_autenticado()
    u = leer_token(authorization[7:])
    if u is None:
        raise ApiError.no_autenticado()
    return u


UsuarioActual = Annotated[UsuarioPrincipal, Depends(usuario_actual)]


def requiere(*permisos: str):
    """Dependencia que exige al menos uno de los permisos indicados."""

    def _verificar(u: UsuarioActual) -> UsuarioPrincipal:
        if not any(u.tiene(p) for p in permisos):
            raise ApiError.sin_permiso()
        return u

    return Depends(_verificar)
