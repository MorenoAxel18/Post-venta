import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import catalogos, modelos  # noqa: F401  (registra los modelos)
from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.campanas import envio
from app.campanas.router import router as campanas_router, router_plantillas
from app.comun.errores import registrar_manejadores
from app.config import get_settings
from app.db import SessionLocal
from app.integracion.gateway import get_gateway
from app.monitoreo.router import router as monitoreo_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    s = get_settings()
    with SessionLocal() as db, db.begin():
        catalogos.sembrar(db, s.datos_demo)

    scheduler = None
    if s.scheduler_activo:
        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(envio.ciclo, "interval", seconds=s.intervalo_scheduler_segundos,
                          args=[SessionLocal, s.lote_envio, get_gateway()],
                          max_instances=1, coalesce=True, id="campanas")
        scheduler.start()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


def crear_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title="Plataforma de Postventa API",
        version="0.1.0",
        description="Campañas, atención humana y monitoreo de WhatsApp",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origenes,
        allow_methods=["*"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Content-Disposition"],
    )
    registrar_manejadores(app)
    app.include_router(auth_router)
    app.include_router(campanas_router)
    app.include_router(router_plantillas)
    app.include_router(admin_router)
    app.include_router(monitoreo_router)

    @app.get("/api/salud", tags=["Sistema"])
    def salud():
        return {"estado": "ok"}

    return app


app = crear_app()
