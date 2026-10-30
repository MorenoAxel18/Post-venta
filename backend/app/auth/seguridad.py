import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import timedelta
from functools import lru_cache
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, Header, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.modelos import Usuario
from app.comun.errores import ApiError
from app.config import get_settings
from app.db import ahora, get_db


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


@lru_cache
def hash_relleno() -> str:
    """Hash contra el que se compara cuando el correo no existe: el login tarda lo mismo
    y no se puede adivinar qué correos están registrados midiendo el tiempo."""
    return hash_password("relleno-sin-usuario")


class LimitadorIntentos:
    """Cuenta logins fallidos por clave en una ventana de tiempo. Vive en memoria del proceso:
    se reinicia con el backend y no se comparte entre réplicas (ver spec 005)."""

    def __init__(self, reloj=time.monotonic):
        self._reloj = reloj
        self._fallos: dict[str, deque[float]] = {}
        self._candado = threading.Lock()

    def _vigentes(self, clave: str, ventana: float) -> deque[float]:
        fallos = self._fallos.setdefault(clave, deque())
        limite = self._reloj() - ventana
        while fallos and fallos[0] <= limite:
            fallos.popleft()
        return fallos

    def bloqueado(self, claves: dict[str, int], ventana: float) -> bool:
        """claves: clave -> máximo de fallos permitidos."""
        with self._candado:
            return any(len(self._vigentes(c, ventana)) >= maximo for c, maximo in claves.items())

    def fallo(self, *claves: str) -> None:
        with self._candado:
            for c in claves:
                self._fallos.setdefault(c, deque()).append(self._reloj())

    def limpiar(self, clave: str) -> None:
        with self._candado:
            self._fallos.pop(clave, None)

    def reiniciar(self) -> None:
        with self._candado:
            self._fallos.clear()


limitador_login = LimitadorIntentos()


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


def usuario_actual(db: Annotated[Session, Depends(get_db)],
                   authorization: Annotated[str | None, Header()] = None) -> UsuarioPrincipal:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError.no_autenticado()
    u = leer_token(authorization[7:])
    if u is None:
        raise ApiError.no_autenticado()
    # Los permisos vienen del token, pero un usuario desactivado pierde el acceso al instante
    if not db.scalar(select(Usuario.activo).where(Usuario.id == u.id)):  # None si ya no existe
        raise ApiError(status.HTTP_401_UNAUTHORIZED, "Tu usuario está desactivado. Contacta a un administrador.")
    return u


UsuarioActual = Annotated[UsuarioPrincipal, Depends(usuario_actual)]


def requiere(*permisos: str):
    """Dependencia que exige al menos uno de los permisos indicados."""

    def _verificar(u: UsuarioActual) -> UsuarioPrincipal:
        if not any(u.tiene(p) for p in permisos):
            raise ApiError.sin_permiso()
        return u

    return Depends(_verificar)
