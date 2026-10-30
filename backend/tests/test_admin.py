from app.admin.servicio import variables_de


def _rol(client, admin, codigo):
    return next(r for r in client.get("/api/admin/roles", headers=admin).json() if r["codigo"] == codigo)


def _yo(client, admin):
    return next(x for x in client.get("/api/admin/usuarios", headers=admin).json()
                if x["correo"] == "admin@fincomun.test")


def test_solo_admin_entra(client, supervisor, agente):
    for h in (supervisor, agente):
        assert client.get("/api/admin/usuarios", headers=h).status_code == 403
        assert client.get("/api/admin/plantillas", headers=h).status_code == 403


def test_crear_usuario_y_entrar(client, admin):
    agente = _rol(client, admin, "AGENTE")
    r = client.post("/api/admin/usuarios", headers=admin, json={
        "nombre": "Marta Gómez", "correo": "Marta@Fincomun.test", "rolId": agente["id"], "password": "Segura2026",
    })
    assert r.status_code == 201, r.text
    nuevo = r.json()
    assert nuevo["correo"] == "marta@fincomun.test" and nuevo["rol"] == "AGENTE" and nuevo["activo"]

    login = {"correo": "marta@fincomun.test", "password": "Segura2026"}
    assert client.post("/api/auth/login", json=login).status_code == 200

    # Correo repetido (sin importar mayúsculas)
    r = client.post("/api/admin/usuarios", headers=admin, json={
        "nombre": "Otra", "correo": "MARTA@fincomun.test", "rolId": agente["id"], "password": "Segura2026",
    })
    assert r.status_code == 409

    # Cambiar contraseña y desactivar
    r = client.put(f"/api/admin/usuarios/{nuevo['id']}/password", headers=admin, json={"password": "Nueva20266"})
    assert r.status_code == 204
    assert client.post("/api/auth/login", json=login).status_code == 401
    r = client.put(f"/api/admin/usuarios/{nuevo['id']}", headers=admin, json={
        "nombre": "Marta Gómez", "correo": "marta@fincomun.test", "rolId": agente["id"], "activo": False,
    })
    assert r.status_code == 200 and not r.json()["activo"]
    r = client.post("/api/auth/login", json={"correo": "marta@fincomun.test", "password": "Nueva20266"})
    assert r.status_code == 403

    acciones = {(a["entidad"], a["accion"]) for a in
                client.get("/api/admin/auditoria?entidad=USUARIO", headers=admin).json()}
    assert {("USUARIO", "CREAR"), ("USUARIO", "EDITAR"), ("USUARIO", "CAMBIAR_PASSWORD")} <= acciones


def test_validaciones_usuario(client, admin):
    agente = _rol(client, admin, "AGENTE")
    r = client.post("/api/admin/usuarios", headers=admin, json={
        "nombre": "X", "correo": "sin-arroba", "rolId": agente["id"], "password": "corta",
    })
    assert r.status_code == 400 and {"correo", "password"} <= set(r.json()["campos"])


def test_no_puede_bloquearse_a_si_mismo(client, admin):
    yo = _yo(client, admin)
    base = {"nombre": yo["nombre"], "correo": yo["correo"], "rolId": yo["rolId"], "activo": True}
    assert client.put(f"/api/admin/usuarios/{yo['id']}", headers=admin, json={**base, "activo": False}).status_code == 409
    agente = _rol(client, admin, "AGENTE")
    r = client.put(f"/api/admin/usuarios/{yo['id']}", headers=admin, json={**base, "rolId": agente["id"]})
    assert r.status_code == 409


def test_siempre_queda_un_admin(client, admin):
    rol = _rol(client, admin, "ADMIN")
    sin_admin = [p for p in rol["permisos"] if p != "ADMIN_USUARIOS"]
    r = client.put(f"/api/admin/roles/{rol['id']}", headers=admin, json={"nombre": rol["nombre"], "permisos": sin_admin})
    assert r.status_code == 409
    assert "ADMIN_USUARIOS" in _rol(client, admin, "ADMIN")["permisos"]


def test_crear_y_editar_perfil(client, admin):
    r = client.post("/api/admin/roles", headers=admin,
                    json={"codigo": "CONSULTA", "nombre": "Consulta", "permisos": ["CAMPANA_VER", "MONITOREO_VER"]})
    assert r.status_code == 201, r.text
    rol = r.json()
    assert rol["permisos"] == ["CAMPANA_VER", "MONITOREO_VER"] and rol["usuarios"] == 0

    assert client.post("/api/admin/roles", headers=admin,
                       json={"codigo": "CONSULTA", "nombre": "Otro", "permisos": []}).status_code == 409
    r = client.put(f"/api/admin/roles/{rol['id']}", headers=admin, json={"nombre": "Solo consulta", "permisos": ["NO_EXISTE"]})
    assert r.status_code == 400

    r = client.put(f"/api/admin/roles/{rol['id']}", headers=admin, json={"nombre": "Solo consulta", "permisos": ["CAMPANA_VER"]})
    assert r.status_code == 200 and r.json()["permisos"] == ["CAMPANA_VER"]


def test_plantillas(client, admin):
    r = client.post("/api/admin/plantillas", headers=admin, json={
        "nombre": "fc_prueba_admin_v1", "cuerpo": "Hola {{nombre}}, tu pago es el {{fecha}}. Gracias {{nombre}}.",
    })
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["variables"] == ["nombre", "fecha"] and p["activa"] and not p["enUso"]

    # Desactivada ya no aparece para las campañas
    r = client.put(f"/api/admin/plantillas/{p['id']}", headers=admin,
                   json={"nombre": p["nombre"], "cuerpo": p["cuerpo"], "activa": False})
    assert r.status_code == 200
    assert p["nombre"] not in {x["nombre"] for x in client.get("/api/plantillas", headers=admin).json()}

    r = client.post("/api/admin/plantillas", headers=admin, json={"nombre": "Con Espacios", "cuerpo": "x"})
    assert r.status_code == 400


def test_variables_de():
    assert variables_de("{{a}} {{b}} {{a}} {{ c }}") == ["a", "b"]
