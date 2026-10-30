from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy.orm import Session

from app.auth.seguridad import UsuarioPrincipal, requiere
from app.campanas import servicio
from app.campanas.esquemas import (
    CampanaDetalle, CampanaResumen, CargaResultado, ErrorRegistro, InfoRequest, MensajeRequest,
    Muestra, PlantillaDto, ProgramacionRequest, RechazoRequest,
)
from app.campanas.modelos import EstadoCampana
from app.db import get_db

router = APIRouter(prefix="/api/campanas", tags=["Campañas"])
router_plantillas = APIRouter(prefix="/api/plantillas", tags=["Campañas"])

Db = Annotated[Session, Depends(get_db)]
Ver = Annotated[UsuarioPrincipal, requiere("CAMPANA_VER")]
Crear = Annotated[UsuarioPrincipal, requiere("CAMPANA_CREAR")]
Aprobar = Annotated[UsuarioPrincipal, requiere("CAMPANA_APROBAR")]
Gestionar = Annotated[UsuarioPrincipal, requiere("CAMPANA_CREAR", "CAMPANA_APROBAR")]

# ---------- Consulta ----------


@router.get("", response_model=list[CampanaResumen])
def listar(db: Db, _: Ver, estado: EstadoCampana | None = None, q: str | None = None):
    return servicio.listar(db, estado, q)


@router.get("/{id}", response_model=CampanaDetalle)
def detalle(id: int, db: Db, u: Ver):
    return servicio.detalle(db, id, u)


@router.get("/{id}/errores", response_model=list[ErrorRegistro])
def errores(id: int, db: Db, _: Ver):
    return servicio.errores(db, id)


@router.get("/{id}/errores/export")
def exportar_errores(id: int, db: Db, _: Ver):
    return Response(
        content=servicio.exportar_errores(db, id),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="errores_campana_{id}.csv"'},
    )


@router.get("/{id}/muestra", response_model=Muestra)
def muestra(id: int, db: Db, _: Ver):
    return servicio.muestra(db, id)


@router_plantillas.get("", response_model=list[PlantillaDto])
def plantillas(db: Db, _: Ver):
    return servicio.plantillas(db)


# ---------- Wizard ----------


@router.post("", response_model=CampanaDetalle, status_code=201)
def crear(req: InfoRequest, db: Db, u: Crear):
    return servicio.crear(db, req, u)


@router.put("/{id}/info", response_model=CampanaDetalle)
def actualizar_info(id: int, req: InfoRequest, db: Db, u: Crear):
    return servicio.actualizar_info(db, id, req, u)


@router.post("/{id}/cartera", response_model=CargaResultado)
async def cargar_cartera(id: int, db: Db, u: Crear, archivo: UploadFile = File(...)):
    contenido = await archivo.read()
    return servicio.cargar_cartera(db, id, archivo.filename or "", contenido, u)


@router.put("/{id}/mensaje", response_model=CampanaDetalle)
def actualizar_mensaje(id: int, req: MensajeRequest, db: Db, u: Crear):
    return servicio.actualizar_mensaje(db, id, req, u)


@router.put("/{id}/programacion", response_model=CampanaDetalle)
def actualizar_programacion(id: int, req: ProgramacionRequest, db: Db, u: Crear):
    return servicio.actualizar_programacion(db, id, req, u)


# ---------- Flujo ----------


@router.post("/{id}/enviar-aprobacion", response_model=CampanaDetalle)
def enviar_aprobacion(id: int, db: Db, u: Crear):
    return servicio.enviar_aprobacion(db, id, u)


@router.post("/{id}/aprobar", response_model=CampanaDetalle)
def aprobar(id: int, db: Db, u: Aprobar):
    return servicio.aprobar(db, id, u)


@router.post("/{id}/rechazar", response_model=CampanaDetalle)
def rechazar(id: int, req: RechazoRequest, db: Db, u: Aprobar):
    return servicio.rechazar(db, id, req.motivo, u)


@router.post("/{id}/pausar", response_model=CampanaDetalle)
def pausar(id: int, db: Db, u: Gestionar):
    return servicio.pausar(db, id, u)


@router.post("/{id}/reanudar", response_model=CampanaDetalle)
def reanudar(id: int, db: Db, u: Gestionar):
    return servicio.reanudar(db, id, u)


@router.post("/{id}/cancelar", response_model=CampanaDetalle)
def cancelar(id: int, db: Db, u: Gestionar):
    return servicio.cancelar(db, id, u)
