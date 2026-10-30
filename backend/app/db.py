from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import JSON, BigInteger, DateTime, Integer, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from app.config import get_settings

# JSONB en PostgreSQL; JSON genérico en SQLite (pruebas)
JsonB = JSON().with_variant(JSONB(), "postgresql")

# BIGINT en PostgreSQL; INTEGER en SQLite para que el autoincremento funcione en pruebas
IdPK = BigInteger().with_variant(Integer(), "sqlite")


class FechaUTC(TypeDecorator):
    """Guarda fechas con zona horaria y siempre las devuelve en UTC (también en SQLite)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


def ahora() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


engine = create_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
