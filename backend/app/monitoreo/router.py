from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.seguridad import UsuarioPrincipal, requiere
from app.db import get_db
from app.monitoreo import servicio
from app.monitoreo.esquemas import MonitoreoCampanas

router = APIRouter(prefix="/api/monitoreo", tags=["Monitoreo"])

Db = Annotated[Session, Depends(get_db)]
Ver = Annotated[UsuarioPrincipal, requiere("MONITOREO_VER")]


@router.get("/campanas", response_model=MonitoreoCampanas)
def campanas(db: Db, _: Ver, desde: date | None = None, hasta: date | None = None, objetivo: str | None = None):
    """Indicadores de campañas. Sin fechas: últimos 30 días (hora del centro de México)."""
    return servicio.campanas(db, desde, hasta, objetivo)
