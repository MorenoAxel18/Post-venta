"""Reglas de validación de la cartera.

Las columnas obligatorias aceptan varios nombres comunes. Cuando el negocio confirme el
formato real de la cartera, se ajustan aquí.
"""
from dataclasses import dataclass

from app.campanas import telefono
from app.campanas.cartera import ArchivoCartera
from app.campanas.modelos import Destinatario
from app.comun.errores import ApiError

ALIAS_ID = ("id_cliente", "cliente_id", "numero_cliente", "no_cliente", "id")
ALIAS_NOMBRE = ("nombre", "nombre_cliente", "nombre_completo", "cliente")
ALIAS_TELEFONO = ("telefono", "celular", "telefono_celular", "movil", "whatsapp", "numero")


@dataclass
class ResultadoValidacion:
    destinatarios: list[Destinatario]
    validos: int
    errores: int


def _buscar(columnas: list[str], alias: tuple[str, ...], esperado: str) -> str:
    for a in alias:
        if a in columnas:
            return a
    raise ApiError.invalido(f'Falta la columna "{esperado}". Descarga la plantilla de ejemplo para ver el formato.')


def _recortar(s: str | None, maximo: int) -> str | None:
    return s[:maximo] if s else s


def validar(campana_id: int, archivo: ArchivoCartera) -> ResultadoValidacion:
    col_id = _buscar(archivo.columnas, ALIAS_ID, "id_cliente")
    col_nombre = _buscar(archivo.columnas, ALIAS_NOMBRE, "nombre")
    col_tel = _buscar(archivo.columnas, ALIAS_TELEFONO, "telefono")

    vistos: dict[str, int] = {}
    lista: list[Destinatario] = []
    validos = 0

    for fila in archivo.filas:
        v = fila.valores
        tel = telefono.normalizar(v.get(col_tel))

        error = None
        if not tel.valido:
            error = tel.error
        elif tel.numero in vistos:
            error = f"Teléfono duplicado (fila {vistos[tel.numero]})"
        elif not v.get(col_id):
            error = "ID de cliente vacío"
        elif not v.get(col_nombre):
            error = "Nombre vacío"

        if tel.valido:
            vistos.setdefault(tel.numero, fila.numero)

        lista.append(Destinatario(
            campana_id=campana_id,
            fila=fila.numero,
            id_cliente=_recortar(v.get(col_id), 60),
            nombre=_recortar(v.get(col_nombre), 150),
            telefono_original=_recortar(v.get(col_tel), 40),
            telefono=tel.numero,
            datos=dict(v),
            valido=error is None,
            error=error,
        ))
        validos += error is None

    return ResultadoValidacion(lista, validos, len(lista) - validos)
