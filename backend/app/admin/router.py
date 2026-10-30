from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.admin import servicio
from app.admin.esquemas import (
    PasswordRequest, PermisoDto, PlantillaAdmin, PlantillaRequest, RegistroAuditoria, RolAdmin,
    RolNuevoRequest, RolRequest, UsuarioAdmin, UsuarioNuevoRequest, UsuarioRequest,
)
from app.auth.seguridad import UsuarioPrincipal, requiere
from app.db import get_db

router = APIRouter(prefix="/api/admin", tags=["Administración"])

Db = Annotated[Session, Depends(get_db)]
Usuarios = Annotated[UsuarioPrincipal, requiere("ADMIN_USUARIOS")]
Reglas = Annotated[UsuarioPrincipal, requiere("ADMIN_REGLAS")]

# ---------- Usuarios ----------


@router.get("/usuarios", response_model=list[UsuarioAdmin])
def listar_usuarios(db: Db, _: Usuarios, q: str | None = None):
    return servicio.listar_usuarios(db, q)


@router.post("/usuarios", response_model=UsuarioAdmin, status_code=201)
def crear_usuario(req: UsuarioNuevoRequest, db: Db, u: Usuarios):
    return servicio.crear_usuario(db, req, u)


@router.put("/usuarios/{id}", response_model=UsuarioAdmin)
def actualizar_usuario(id: int, req: UsuarioRequest, db: Db, u: Usuarios):
    return servicio.actualizar_usuario(db, id, req, u)


@router.put("/usuarios/{id}/password", status_code=204)
def cambiar_password(id: int, req: PasswordRequest, db: Db, u: Usuarios):
    servicio.cambiar_password(db, id, req, u)


# ---------- Perfiles ----------


@router.get("/permisos", response_model=list[PermisoDto])
def listar_permisos(db: Db, _: Usuarios):
    return servicio.listar_permisos(db)


@router.get("/roles", response_model=list[RolAdmin])
def listar_roles(db: Db, _: Usuarios):
    return servicio.listar_roles(db)


@router.post("/roles", response_model=RolAdmin, status_code=201)
def crear_rol(req: RolNuevoRequest, db: Db, u: Usuarios):
    return servicio.crear_rol(db, req, u)


@router.put("/roles/{id}", response_model=RolAdmin)
def actualizar_rol(id: int, req: RolRequest, db: Db, u: Usuarios):
    return servicio.actualizar_rol(db, id, req, u)


# ---------- Plantillas ----------


@router.get("/plantillas", response_model=list[PlantillaAdmin])
def listar_plantillas(db: Db, _: Reglas):
    return servicio.listar_plantillas(db)


@router.post("/plantillas", response_model=PlantillaAdmin, status_code=201)
def crear_plantilla(req: PlantillaRequest, db: Db, u: Reglas):
    return servicio.crear_plantilla(db, req, u)


@router.put("/plantillas/{id}", response_model=PlantillaAdmin)
def actualizar_plantilla(id: int, req: PlantillaRequest, db: Db, u: Reglas):
    return servicio.actualizar_plantilla(db, id, req, u)


# ---------- Bitácora ----------


@router.get("/auditoria", response_model=list[RegistroAuditoria])
def auditoria(db: Db, _: Usuarios, entidad: str | None = None, limite: Annotated[int, Query(ge=1, le=500)] = 200):
    return servicio.auditoria(db, entidad, limite)
