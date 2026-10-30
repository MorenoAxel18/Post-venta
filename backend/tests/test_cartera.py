import io
from datetime import datetime

import pytest
from openpyxl import Workbook

from app.campanas import cartera, validador
from app.comun.errores import ApiError


def test_csv_punto_y_coma_y_latin1():
    contenido = "ID Cliente;Nombre;Teléfono\n1;José Pérez;5512345678\n".encode("latin-1")
    a = cartera.leer("cartera.csv", contenido, 100)
    assert a.columnas == ["id_cliente", "nombre", "telefono"]
    assert a.filas[0].valores["nombre"] == "José Pérez"
    assert a.filas[0].numero == 2


def test_excel_con_numeros_y_fechas():
    wb = Workbook()
    ws = wb.active
    ws.append(["id_cliente", "nombre", "Celular", "Fecha primer pago"])
    ws.append([10234, "María", 5512345678, datetime(2026, 11, 20)])
    ws.append([None, None, None, None])  # fila vacía: se ignora
    buf = io.BytesIO()
    wb.save(buf)

    a = cartera.leer("cartera.xlsx", buf.getvalue(), 100)
    assert len(a.filas) == 1
    fila = a.filas[0].valores
    assert fila == {"id_cliente": "10234", "nombre": "María", "celular": "5512345678",
                    "fecha_primer_pago": "20/11/2026"}

    r = validador.validar(1, a)  # "celular" se acepta como alias de teléfono
    assert r.validos == 1


def test_encabezado_repetido():
    with pytest.raises(ApiError, match="repetida"):
        cartera.leer("c.csv", b"nombre,Nombre,telefono\na,b,5512345678\n", 100)


def test_falta_columna_obligatoria():
    a = cartera.leer("c.csv", b"nombre,telefono\nAna,5512345678\n", 100)
    with pytest.raises(ApiError, match="id_cliente"):
        validador.validar(1, a)


def test_formato_no_soportado():
    with pytest.raises(ApiError, match="Formato no soportado"):
        cartera.leer("cartera.pdf", b"x", 100)


def test_duplicados():
    a = cartera.leer("c.csv", b"id_cliente,nombre,telefono\n1,A,5512345678\n2,B,+52 55 1234 5678\n", 100)
    r = validador.validar(1, a)
    assert r.validos == 1
    assert r.destinatarios[1].error == "Teléfono duplicado (fila 2)"
