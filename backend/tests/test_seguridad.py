import time

from fastapi.testclient import TestClient

from app.auth.seguridad import LimitadorIntentos
from app.config import get_settings
from app.main import crear_app

LOGIN = "/api/auth/login"


def _intento(client, correo, password="mala"):
    return client.post(LOGIN, json={"correo": correo, "password": password})


def test_bloqueo_tras_intentos_fallidos(client):
    for _ in range(5):
        assert _intento(client, "supervisor@fincomun.test").status_code == 401
    # Bloqueado aunque ahora la contraseña sea correcta
    r = _intento(client, "supervisor@fincomun.test", "Postventa2026")
    assert r.status_code == 429 and "Demasiados intentos" in r.json()["mensaje"]
    # Otro correo desde la misma IP todavía puede entrar (el límite por IP es 4 veces mayor)
    assert _intento(client, "admin@fincomun.test", "Postventa2026").status_code == 200


def test_bloqueo_por_ip_con_correos_distintos(client):
    for i in range(20):
        assert _intento(client, f"inventado{i}@fincomun.test").status_code == 401
    assert _intento(client, "admin@fincomun.test", "Postventa2026").status_code == 429


def test_login_correcto_limpia_el_contador(client):
    for _ in range(4):
        _intento(client, "supervisor@fincomun.test")
    assert _intento(client, "supervisor@fincomun.test", "Postventa2026").status_code == 200
    for _ in range(4):
        assert _intento(client, "supervisor@fincomun.test").status_code == 401  # no se acumulan los anteriores


def test_bloqueo_expira_con_la_ventana():
    reloj = [0.0]
    lim = LimitadorIntentos(reloj=lambda: reloj[0])
    for _ in range(5):
        lim.fallo("a")
    assert lim.bloqueado({"a": 5}, ventana=900)
    reloj[0] = 901
    assert not lim.bloqueado({"a": 5}, ventana=900)


def test_correo_inexistente_tarda_lo_mismo(client):
    _intento(client, "nadie@fincomun.test")  # calienta el hash de relleno

    def medir(correo):
        inicio = time.perf_counter()
        assert _intento(client, correo).status_code == 401
        return time.perf_counter() - inicio

    existe, no_existe = medir("agente@fincomun.test"), medir("nadie@fincomun.test")
    # Sin hash de relleno, el correo inexistente responde ~100 veces más rápido
    assert no_existe > existe * 0.5


def test_usuario_desactivado_pierde_la_sesion(client, admin):
    agente = next(r for r in client.get("/api/admin/roles", headers=admin).json() if r["codigo"] == "AGENTE")
    datos = {"nombre": "Temporal Sesión", "correo": "temporal@fincomun.test", "rolId": agente["id"]}
    u = client.post("/api/admin/usuarios", headers=admin, json={**datos, "password": "Temporal2026"}).json()
    token = _intento(client, datos["correo"], "Temporal2026").json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=h).status_code == 200

    client.put(f"/api/admin/usuarios/{u['id']}", headers=admin, json={**datos, "activo": False})
    r = client.get("/api/auth/me", headers=h)
    assert r.status_code == 401 and "desactivado" in r.json()["mensaje"]


def test_docs_se_pueden_apagar():
    s = get_settings()
    s.docs_activos = False
    try:
        c = TestClient(crear_app())  # sin "with": no hace falta el arranque
        assert all(c.get(u).status_code == 404 for u in ("/docs", "/redoc", "/openapi.json"))
    finally:
        s.docs_activos = True
