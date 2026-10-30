from datetime import date, datetime, timedelta

from app.campanas import envio
from app.db import SessionLocal
from app.integracion.gateway import FakeMessagingGateway
from app.monitoreo.servicio import ZONA_MX
from tests.test_campanas import _crear_campana_lista

# Objetivo exclusivo de esta prueba: la base es compartida con las demás pruebas
OBJETIVO = "Prueba de monitoreo"


def test_permisos(client, agente, supervisor):
    assert client.get("/api/monitoreo/campanas", headers=agente).status_code == 403
    assert client.get("/api/monitoreo/campanas", headers=supervisor).status_code == 200


def test_periodo_invalido(client, admin):
    r = client.get("/api/monitoreo/campanas?desde=2026-10-10&hasta=2026-10-01", headers=admin)
    assert r.status_code == 400
    r = client.get("/api/monitoreo/campanas?desde=2024-01-01&hasta=2026-01-01", headers=admin)
    assert r.status_code == 400


def test_indicadores_de_una_campana(client, admin, supervisor, cartera_prueba):
    cid = _crear_campana_lista(client, admin, cartera_prueba)
    client.put(f"/api/campanas/{cid}/info", headers=admin, json={"nombre": "Monitoreada", "objetivo": OBJETIVO})
    client.post(f"/api/campanas/{cid}/enviar-aprobacion", headers=admin)
    assert client.post(f"/api/campanas/{cid}/aprobar", headers=supervisor).json()["estado"] == "PROGRAMADA"

    # Antes de enviar ya cuenta como activa y con pendientes
    r = client.get(f"/api/monitoreo/campanas?objetivo={OBJETIVO}", headers=supervisor).json()
    assert r["resumen"]["campanasActivas"] == 1 and r["resumen"]["pendientes"] == 4

    envio.ciclo(SessionLocal, tamano_lote=1, gateway=FakeMessagingGateway(tasa_fallo=1))  # 1 fallido
    envio.ciclo(SessionLocal, tamano_lote=10, gateway=FakeMessagingGateway(tasa_fallo=0))  # 3 enviados
    envio.ciclo(SessionLocal, tamano_lote=10, gateway=FakeMessagingGateway(tasa_fallo=0))  # completa

    r = client.get(f"/api/monitoreo/campanas?objetivo={OBJETIVO}", headers=supervisor).json()
    hoy = datetime.now(ZONA_MX).date()
    assert r["hasta"] == hoy.isoformat() and len(r["porDia"]) == 30 and r["envioSimulado"]

    res = r["resumen"]
    assert (res["enviados"], res["fallidos"], res["tasaFallo"]) == (3, 1, 0.25)
    assert (res["campanasActivas"], res["campanasCompletadas"], res["pendientes"]) == (0, 1, 0)
    assert r["porDia"][-1] == {"fecha": hoy.isoformat(), "enviados": 3, "fallidos": 1}

    [fila] = r["campanas"]
    assert fila["id"] == cid and fila["estado"] == "COMPLETADA"
    assert (fila["destinatarios"], fila["enviados"], fila["fallidos"], fila["pendientes"]) == (4, 3, 1, 0)

    motivos = {m["motivo"]: m["total"] for m in r["erroresCartera"]}
    assert motivos["Teléfono duplicado"] == 1  # sin el "(fila N)"
    assert r["erroresEnvio"] == [{"motivo": "Simulado: el número no tiene WhatsApp", "total": 1}]

    # Fuera del periodo no aparece nada
    ayer = hoy - timedelta(days=1)
    r = client.get(f"/api/monitoreo/campanas?objetivo={OBJETIVO}&desde={date(2026, 1, 1)}&hasta={ayer}",
                   headers=supervisor).json()
    assert r["resumen"]["enviados"] == 0 and r["campanas"] == []
