from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Todas las respuestas de error tienen la forma {"mensaje": "...", "campos": {...}}


class ApiError(Exception):
    def __init__(self, status_code: int, mensaje: str):
        self.status_code = status_code
        self.mensaje = mensaje

    @classmethod
    def no_encontrado(cls, que: str) -> "ApiError":
        return cls(status.HTTP_404_NOT_FOUND, f"{que} no existe.")

    @classmethod
    def conflicto(cls, mensaje: str) -> "ApiError":
        return cls(status.HTTP_409_CONFLICT, mensaje)

    @classmethod
    def invalido(cls, mensaje: str) -> "ApiError":
        return cls(status.HTTP_400_BAD_REQUEST, mensaje)

    @classmethod
    def no_autenticado(cls) -> "ApiError":
        return cls(status.HTTP_401_UNAUTHORIZED, "Tu sesión expiró o no es válida. Inicia sesión de nuevo.")

    @classmethod
    def sin_permiso(cls) -> "ApiError":
        return cls(status.HTTP_403_FORBIDDEN, "Tu perfil no tiene permiso para realizar esta acción.")


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(_: Request, e: ApiError):
        return JSONResponse(status_code=e.status_code, content={"mensaje": e.mensaje})

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, e: RequestValidationError):
        campos: dict[str, str] = {}
        for err in e.errors():
            nombre = ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path"))
            campos.setdefault(nombre or "general", err["msg"])
        return JSONResponse(status_code=400, content={"mensaje": "Revisa los campos marcados.", "campos": campos})
