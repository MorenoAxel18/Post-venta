"""Importa todos los modelos para que SQLAlchemy y Alembic los registren."""
from app.auth.modelos import Permiso, Rol, Usuario, rol_permiso  # noqa: F401
from app.campanas.modelos import Campana, Destinatario, Plantilla  # noqa: F401
from app.comun.auditoria import Auditoria  # noqa: F401
