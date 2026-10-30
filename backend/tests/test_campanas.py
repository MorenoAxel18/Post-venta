from datetime import datetime, timedelta, timezone

from app.campanas import envio
from app.db import SessionLocal
from app.integracion.gateway import FakeMessagingGateway


def _crear_campana_lista(client, admin, cartera_prueba, inmediata=True):
    r = client.post("/api/campanas", headers=admin,
                    json={"nombre": "Recordatorio primer pago", "objetivo": "Recordatorio de pago"})
    assert r.status_code == 201, r.text
    cid = r.json()["id"]

    r = client.post(f"/api/campanas/{cid}/cartera", headers=admin,
                    files={"archivo": ("cartera_prueba.csv", cartera_prueba, "text/csv")})
    assert r.status_code == 200, r.text

    plantilla = next(p for p in client.get("/api/plantillas", headers=admin).json()
                     if p["nombre"] == "fc_postventa_recordatorio_v1")
    r = client.put(f"/api/campanas/{cid}/mensaje", headers=admin, json={
        "plantillaId": plantilla["id"],
        "mapeo": {"nombre": "nombre", "fecha_primer_pago": "fecha_primer_pago", "enlace": "enlace"},
    })
    assert r.status_code == 200, r.text

    cuerpo = {"inmediata": True} if inmediata else {
        "inmediata": False,
        "fechaProgramada": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
    }
    r = client.put(f"/api/campanas/{cid}/programacion", headers=admin, json=cuerpo)
    assert r.status_code == 200, r.text
    return cid


def test_flujo_completo(client, admin, supervisor, cartera_prueba):
    cid = _crear_campana_lista(client, admin, cartera_prueba)

    d = client.get(f"/api/campanas/{cid}", headers=admin).json()
    assert (d["totalRegistros"], d["registrosValidos"], d["registrosError"]) == (9, 4, 5)
    assert d["estado"] == "BORRADOR" and d["acciones"]["enviarAprobacion"]

    errores = client.get(f"/api/campanas/{cid}/errores", headers=admin).json()
    assert {e["error"] for e in errores} == {
        "Teléfono vacío", "Número incompleto", "Teléfono duplicado (fila 2)", "Formato inválido",
        "ID de cliente vacío",
    }
    csv_errores = client.get(f"/api/campanas/{cid}/errores/export", headers=admin)
    assert csv_errores.status_code == 200 and "Número incompleto" in csv_errores.content.decode("utf-8-sig")

    muestra = client.get(f"/api/campanas/{cid}/muestra", headers=admin).json()
    assert "Hola María López" in muestra["mensaje"]

    d = client.post(f"/api/campanas/{cid}/enviar-aprobacion", headers=admin).json()
    assert d["estado"] == "PENDIENTE_APROBACION"
    assert d["acciones"]["aprobar"] is False and "Otra persona" in d["acciones"]["motivoNoAprobar"]

    # El autor no puede autoaprobarse
    assert client.post(f"/api/campanas/{cid}/aprobar", headers=admin).status_code == 409
    # Ya no se puede editar
    assert client.put(f"/api/campanas/{cid}/info", headers=admin,
                      json={"nombre": "x", "objetivo": "y"}).status_code == 409

    d = client.post(f"/api/campanas/{cid}/aprobar", headers=supervisor).json()
    assert d["estado"] == "PROGRAMADA" and d["aprobadaPor"] == "Sofía Ramírez"

    gateway = FakeMessagingGateway(tasa_fallo=0)
    envio.ciclo(SessionLocal, tamano_lote=3, gateway=gateway)  # arranca y envía 3
    d = client.get(f"/api/campanas/{cid}", headers=admin).json()
    assert d["estado"] == "EN_EJECUCION" and d["envios"] == {"ENVIADO": 3, "PENDIENTE": 1}

    envio.ciclo(SessionLocal, tamano_lote=3, gateway=gateway)  # envía el último
    envio.ciclo(SessionLocal, tamano_lote=3, gateway=gateway)  # no hay pendientes: completa
    d = client.get(f"/api/campanas/{cid}", headers=admin).json()
    assert d["estado"] == "COMPLETADA" and d["envios"] == {"ENVIADO": 4}
    assert d["fechaFinEnvio"] is not None


def test_rechazo_regresa_a_borrador(client, admin, supervisor, cartera_prueba):
    cid = _crear_campana_lista(client, admin, cartera_prueba, inmediata=False)
    client.post(f"/api/campanas/{cid}/enviar-aprobacion", headers=admin)

    r = client.post(f"/api/campanas/{cid}/rechazar", headers=supervisor, json={"motivo": "Cambiar la fecha"})
    assert r.json()["estado"] == "BORRADOR"
    # Quien la preparó la ve editable otra vez, con el motivo
    d = client.get(f"/api/campanas/{cid}", headers=admin).json()
    assert d["motivoRechazo"] == "Cambiar la fecha" and d["acciones"]["editar"]


def test_cancelar_programada(client, admin, supervisor, cartera_prueba):
    cid = _crear_campana_lista(client, admin, cartera_prueba, inmediata=False)
    client.post(f"/api/campanas/{cid}/enviar-aprobacion", headers=admin)
    client.post(f"/api/campanas/{cid}/aprobar", headers=supervisor)

    d = client.post(f"/api/campanas/{cid}/cancelar", headers=admin).json()
    assert d["estado"] == "CANCELADA" and d["envios"] == {"CANCELADO": 4}


def test_fecha_en_el_pasado(client, admin):
    cid = client.post("/api/campanas", headers=admin, json={"nombre": "X", "objetivo": "Informativa"}).json()["id"]
    pasado = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    r = client.put(f"/api/campanas/{cid}/programacion", headers=admin,
                   json={"inmediata": False, "fechaProgramada": pasado})
    assert r.status_code == 400 and "futuro" in r.json()["mensaje"]


def test_listado_y_filtros(client, admin):
    todas = client.get("/api/campanas", headers=admin).json()
    assert len(todas) >= 1
    borradores = client.get("/api/campanas", headers=admin, params={"estado": "BORRADOR"}).json()
    assert all(c["estado"] == "BORRADOR" for c in borradores)
    assert client.get("/api/campanas", headers=admin, params={"q": "no-existe-xyz"}).json() == []
