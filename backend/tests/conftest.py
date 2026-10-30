"""Las pruebas usan SQLite en un archivo temporal, salvo que se defina TEST_DATABASE_URL
(por ejemplo, una base PostgreSQL vacía) para probar contra el motor real."""
import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp())
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{_tmp / 'pruebas.db'}")
os.environ["SCHEDULER_ACTIVO"] = "false"
os.environ["DATOS_DEMO"] = "true"
os.environ["JWT_SECRET"] = "secreto-solo-para-pruebas-con-32-caracteres-o-mas"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import modelos  # noqa: E402,F401
from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session", autouse=True)
def esquema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def limitador_limpio():
    """Todas las pruebas comparten IP: sin esto, los logins fallidos de una bloquearían a las demás."""
    from app.auth.seguridad import limitador_login
    limitador_login.reiniciar()
    yield
    limitador_login.reiniciar()


@pytest.fixture(scope="session")
def client(esquema):
    with TestClient(app) as c:  # el "with" ejecuta el arranque (catálogos y usuarios demo)
        yield c


def _token(client: TestClient, correo: str) -> dict[str, str]:
    r = client.post("/api/auth/login", json={"correo": correo, "password": "Postventa2026"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _token(client, "admin@fincomun.test")


@pytest.fixture(scope="session")
def supervisor(client):
    return _token(client, "supervisor@fincomun.test")


@pytest.fixture(scope="session")
def agente(client):
    return _token(client, "agente@fincomun.test")


@pytest.fixture
def cartera_prueba() -> bytes:
    return (RAIZ / "docs" / "cartera_prueba.csv").read_bytes()
