from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.esquemas import LoginRequest, LoginResponse, UsuarioResponse
from app.auth.modelos import Usuario
from app.auth.seguridad import (
    UsuarioActual, UsuarioPrincipal, generar_token, hash_relleno, limitador_login, verificar_password,
)
from app.comun.errores import ApiError
from app.config import get_settings
from app.db import ahora, get_db

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


def _respuesta(p: UsuarioPrincipal) -> UsuarioResponse:
    return UsuarioResponse(id=p.id, nombre=p.nombre, correo=p.correo, rol=p.rol, permisos=sorted(p.permisos))


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, request: Request, db: Annotated[Session, Depends(get_db)]):
    s = get_settings()
    correo = req.correo.strip().lower()
    ip = request.client.host if request.client else "desconocida"
    clave_correo, clave_ip = f"{correo}|{ip}", f"ip|{ip}"
    if limitador_login.bloqueado({clave_correo: s.login_max_intentos, clave_ip: s.login_max_intentos * 4},
                                 s.login_bloqueo_minutos * 60):
        raise ApiError(status.HTTP_429_TOO_MANY_REQUESTS,
                       f"Demasiados intentos fallidos. Espera {s.login_bloqueo_minutos} minutos e inténtalo de nuevo.")

    u = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo))
    # Siempre se compara un hash, exista o no el correo, para que el tiempo de respuesta no lo delate
    valida = verificar_password(req.password, u.password_hash if u else hash_relleno())
    if u is None or not valida:
        limitador_login.fallo(clave_correo, clave_ip)
        raise ApiError(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    limitador_login.limpiar(clave_correo)
    if not u.activo:
        raise ApiError(status.HTTP_403_FORBIDDEN, "Tu usuario está desactivado. Contacta a un administrador.")
    u.ultimo_acceso = ahora()
    p = UsuarioPrincipal(u.id, u.correo, u.nombre, u.rol.codigo, frozenset(u.permisos()))
    return LoginResponse(token=generar_token(p), usuario=_respuesta(p))


@router.get("/me", response_model=UsuarioResponse)
def me(u: UsuarioActual):
    return _respuesta(u)
