import pytest

from app.campanas.telefono import normalizar


@pytest.mark.parametrize("entrada, esperado", [
    ("5512345678", "5512345678"),
    ("+52 55 1234 5678", "5512345678"),
    ("525512345678", "5512345678"),
    ("521 5512345678", "5512345678"),
    ("(55) 1234.5678", "5512345678"),
    ("55-1234-5678", "5512345678"),
])
def test_validos(entrada, esperado):
    r = normalizar(entrada)
    assert r.valido and r.numero == esperado


@pytest.mark.parametrize("entrada, error", [
    (None, "Teléfono vacío"),
    ("   ", "Teléfono vacío"),
    ("551234567", "Número incompleto"),
    ("55AB123456", "Formato inválido"),
    ("15512345678", "Formato inválido"),
])
def test_invalidos(entrada, error):
    r = normalizar(entrada)
    assert not r.valido and r.error == error
