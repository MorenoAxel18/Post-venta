import re
from dataclasses import dataclass

_SEPARADORES = re.compile(r"[\s\-().]")


@dataclass(frozen=True)
class ResultadoTelefono:
    numero: str | None
    error: str | None

    @property
    def valido(self) -> bool:
        return self.error is None


def normalizar(original: str | None) -> ResultadoTelefono:
    """Normaliza un teléfono de México a 10 dígitos (acepta +52, 521, espacios, guiones y paréntesis)."""
    if original is None or not original.strip():
        return ResultadoTelefono(None, "Teléfono vacío")
    s = _SEPARADORES.sub("", original.strip())
    if s.startswith("+"):
        s = s[1:]
    if not s.isdigit():
        return ResultadoTelefono(None, "Formato inválido")
    if len(s) == 13 and s.startswith("521"):  # formato antiguo de celular
        s = s[3:]
    elif len(s) == 12 and s.startswith("52"):
        s = s[2:]
    if len(s) < 10:
        return ResultadoTelefono(None, "Número incompleto")
    if len(s) > 10:
        return ResultadoTelefono(None, "Formato inválido")
    return ResultadoTelefono(s, None)
