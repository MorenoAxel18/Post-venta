from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída de variables de entorno o del archivo .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postventa:postventa@localhost:5433/postventa"

    jwt_secret: str = "cambia-este-secreto-de-desarrollo-por-uno-largo-y-seguro"
    jwt_expiracion_minutos: int = 480

    # Fuerza bruta: intentos fallidos por correo+IP antes de bloquear (por IP sola se permite 4 veces más)
    login_max_intentos: int = 5
    login_bloqueo_minutos: int = 15

    # Swagger (/docs) y openapi.json: apagar fuera de desarrollo
    docs_activos: bool = True

    cors_origenes: list[str] = ["http://localhost:5173"]

    # Pendiente de confirmar con el negocio: ¿quien prepara una campaña puede aprobarla?
    permitir_autoaprobacion: bool = False
    # Mensajes enviados por cada ciclo del scheduler (control de velocidad)
    lote_envio: int = 50
    intervalo_scheduler_segundos: int = 30
    scheduler_activo: bool = True

    # Crea usuarios y plantillas de prueba al arrancar (solo desarrollo)
    datos_demo: bool = True

    max_tamano_archivo: int = 10 * 1024 * 1024
    max_filas_cartera: int = 50_000


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if len(s.jwt_secret) < 32:
        raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
    return s
