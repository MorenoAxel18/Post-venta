from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.esquemas import LoginRequest, LoginResponse, UsuarioResponse
from app.auth.modelos import Usuario
from app.auth.seguridad import UsuarioActual, UsuarioPrincipal, generar_token, verificar_password
from app.comun.errores import ApiError
from app.db import ahora, get_db

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


def _respuesta(p: UsuarioPrincipal) -> UsuarioResponse:
    return UsuarioResponse(id=p.id, nombre=p.nombre, correo=p.correo, rol=p.rol, permisos=sorted(p.permisos))


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    u = db.scalar(select(Usuario).where(func.lower(Usuario.correo) == req.correo.strip().lower()))
    if u is None or not verificar_password(req.password, u.password_hash):
        raise ApiError(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    if not u.activo:
        raise ApiError(status.HTTP_403_FORBIDDEN, "Tu usuario está desactivado. Contacta a un administrador.")
    u.ultimo_acceso = ahora()
    p = UsuarioPrincipal(u.id, u.correo, u.nombre, u.rol.codigo, frozenset(u.permisos()))
    return LoginResponse(token=generar_token(p), usuario=_respuesta(p))


@router.get("/me", response_model=UsuarioResponse)
def me(u: UsuarioActual):
    return _respuesta(u)
