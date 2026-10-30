"""Datos base que la aplicación necesita para funcionar. Se ejecuta al arrancar y es idempotente:
solo inserta lo que falta, nunca modifica ni borra lo que ya existe en la base de datos."""
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.modelos import Permiso, Rol, Usuario
from app.auth.seguridad import hash_password
from app.campanas.modelos import Plantilla

log = logging.getLogger(__name__)

PERMISOS = {
    "CAMPANA_VER": "Ver campañas",
    "CAMPANA_CREAR": "Crear y editar campañas",
    "CAMPANA_APROBAR": "Aprobar o rechazar campañas",
    "CONVERSACION_VER_PROPIAS": "Ver conversaciones asignadas",
    "CONVERSACION_RESPONDER": "Responder conversaciones",
    "CONVERSACION_VER_TODAS": "Ver todas las conversaciones",
    "CONVERSACION_REASIGNAR": "Reasignar conversaciones",
    "MONITOREO_VER": "Ver monitoreo y reportes",
    "ADMIN_USUARIOS": "Administrar usuarios y perfiles",
    "ADMIN_REGLAS": "Administrar reglas de asignación y parámetros",
}

# Permisos iniciales de cada perfil (después se administran desde la base de datos)
ROLES = {
    "ADMIN": ("Administrador", list(PERMISOS)),
    # Pendiente de confirmar si el supervisor también crea campañas
    "SUPERVISOR": ("Supervisor", [
        "CAMPANA_VER", "CAMPANA_APROBAR",
        "CONVERSACION_VER_PROPIAS", "CONVERSACION_RESPONDER",
        "CONVERSACION_VER_TODAS", "CONVERSACION_REASIGNAR",
        "MONITOREO_VER",
    ]),
    "AGENTE": ("Agente de Postventa", ["CONVERSACION_VER_PROPIAS", "CONVERSACION_RESPONDER"]),
}

PASSWORD_DEMO = "Postventa2026"
USUARIOS_DEMO = [
    ("Laura Castillo", "admin@fincomun.test", "ADMIN"),
    ("Sofía Ramírez", "supervisor@fincomun.test", "SUPERVISOR"),
    ("Juan Pérez", "agente@fincomun.test", "AGENTE"),
]

# Plantillas ficticias mientras se confirman las reales de Treble
PLANTILLAS_DEMO = [
    ("fc_postventa_recordatorio_v1", "Recordatorio de primer pago",
     "Hola {{nombre}},\n\nTe recordamos que tu primer pago está programado para el {{fecha_primer_pago}}.\n\n"
     "Si tienes alguna duda, puedes consultar la información aquí: {{enlace}}\n\n¡Gracias por tu confianza!",
     ["nombre", "fecha_primer_pago", "enlace"]),
    ("fc_postventa_encuesta_v1", "Encuesta de satisfacción",
     "Hola {{nombre}}, en Fincomún queremos saber cómo fue tu experiencia. ¿Nos ayudas respondiendo una "
     "breve encuesta? Solo toma un minuto.",
     ["nombre"]),
    ("fc_postventa_seguimiento_v1", "Seguimiento posdesembolso",
     "Hola {{nombre}}, tu crédito ya fue depositado. Si tienes cualquier duda sobre tus pagos, responde "
     "este mensaje y un asesor te atenderá.",
     ["nombre"]),
]


def sembrar(db: Session, datos_demo: bool) -> None:
    existentes = set(db.scalars(select(Permiso.codigo)))
    for codigo, descripcion in PERMISOS.items():
        if codigo not in existentes:
            db.add(Permiso(codigo=codigo, descripcion=descripcion))
    db.flush()

    permisos = {p.codigo: p for p in db.scalars(select(Permiso))}
    for codigo, (nombre, lista) in ROLES.items():
        if db.scalar(select(Rol).where(Rol.codigo == codigo)) is None:
            db.add(Rol(codigo=codigo, nombre=nombre, permisos=[permisos[p] for p in lista]))
    db.flush()

    if not datos_demo:
        return

    for nombre, correo, rol_codigo in USUARIOS_DEMO:
        if db.scalar(select(Usuario).where(Usuario.correo == correo)) is None:
            rol = db.scalar(select(Rol).where(Rol.codigo == rol_codigo))
            db.add(Usuario(nombre=nombre, correo=correo, password_hash=hash_password(PASSWORD_DEMO), rol=rol))
            log.info("Usuario demo creado: %s (%s)", correo, rol_codigo)

    for nombre, descripcion, cuerpo, variables in PLANTILLAS_DEMO:
        if db.scalar(select(Plantilla).where(Plantilla.nombre_externo == nombre)) is None:
            db.add(Plantilla(nombre_externo=nombre, descripcion=descripcion, cuerpo=cuerpo, variables=variables))
