from app.campanas.modelos import Plantilla


def resolver_variables(plantilla: Plantilla, mapeo: dict[str, str], datos: dict[str, str]) -> dict[str, str]:
    """Valor de cada variable de la plantilla según la columna mapeada."""
    return {v: datos.get(mapeo.get(v, ""), "") for v in plantilla.variables}


def renderizar(cuerpo: str, variables: dict[str, str]) -> str:
    for nombre, valor in variables.items():
        cuerpo = cuerpo.replace("{{" + nombre + "}}", valor)
    return cuerpo
