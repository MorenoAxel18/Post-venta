"""Punto único de salida hacia WhatsApp.

Hoy responde FakeMessagingGateway (no envía nada real). Cuando se conecte Treble se agrega
TrebleMessagingGateway con la misma interfaz y se elige en get_gateway().
"""
import logging
import random
import uuid
from dataclasses import dataclass
from typing import Protocol

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class ResultadoEnvio:
    exitoso: bool
    mensaje_id: str | None = None
    error: str | None = None


class MessagingGateway(Protocol):
    def enviar_plantilla(self, telefono_10_digitos: str, plantilla: str, variables: dict[str, str]) -> ResultadoEnvio: ...


class FakeMessagingGateway:
    """Simula el envío. Falla ~2 % de las veces para ver envíos fallidos en la interfaz."""

    def __init__(self, tasa_fallo: float = 0.02):
        self.tasa_fallo = tasa_fallo

    def enviar_plantilla(self, telefono_10_digitos: str, plantilla: str, variables: dict[str, str]) -> ResultadoEnvio:
        if random.random() < self.tasa_fallo:
            return ResultadoEnvio(False, error="Simulado: el número no tiene WhatsApp")
        log.debug("[SIMULADO] %s -> 52%s %s", plantilla, telefono_10_digitos, variables)
        return ResultadoEnvio(True, mensaje_id=f"fake-{uuid.uuid4()}")


_gateway: MessagingGateway = FakeMessagingGateway()


def get_gateway() -> MessagingGateway:
    return _gateway
