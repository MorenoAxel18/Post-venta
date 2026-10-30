def test_sin_token(client):
    r = client.get("/api/campanas")
    assert r.status_code == 401 and "mensaje" in r.json()


def test_token_invalido(client):
    assert client.get("/api/campanas", headers={"Authorization": "Bearer basura"}).status_code == 401


def test_login_incorrecto(client):
    r = client.post("/api/auth/login", json={"correo": "admin@fincomun.test", "password": "mala"})
    assert r.status_code == 401


def test_agente_no_entra_a_campanas(client, agente):
    r = client.get("/api/campanas", headers=agente)
    assert r.status_code == 403 and "permiso" in r.json()["mensaje"]
    me = client.get("/api/auth/me", headers=agente).json()
    assert me["rol"] == "AGENTE" and "CAMPANA_VER" not in me["permisos"]


def test_supervisor_ve_pero_no_crea(client, supervisor):
    assert client.get("/api/campanas", headers=supervisor).status_code == 200
    r = client.post("/api/campanas", headers=supervisor, json={"nombre": "X", "objetivo": "Y"})
    assert r.status_code == 403


def test_validacion_devuelve_campos(client, admin):
    r = client.post("/api/campanas", headers=admin, json={"nombre": "", "objetivo": "Y"})
    assert r.status_code == 400 and "nombre" in r.json()["campos"]
