"""Administración de usuarios, perfiles, plantillas y consulta de la bitácora."""
import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.admin.esquemas import (
    PasswordRequest, PermisoDto, PlantillaAdmin, PlantillaRequest, RegistroAuditoria, RolAdmin,
    RolNuevoRequest, RolRequest, UsuarioAdmin, UsuarioNuevoRequest, UsuarioRequest,
)
from app.auth.modelos import Permiso, Rol, Usuario, rol_permiso
from app.auth.seguridad import UsuarioPrincipal, hash_password
from app.campanas.modelos import Campana, EstadoCampana as E, Plantilla
from app.comun.auditoria import Auditoria, registrar
from app.comun.errores import ApiError

# Permiso que nunca puede quedar sin al menos un usuario activo (si no, nadie podría administrar)
PERMISO_ADMIN = "ADMIN_USUARIOS"

# Campañas que ya pasaron por aprobación y siguen vivas: su plantilla no debe cambiar de texto
ESTADOS_PLANTILLA_FIJA = (E.PENDIENTE_APROBACION, E.PROGRAMADA, E.EN_EJECUCION, E.PAUSADA)

VARIABLE = re.compile(r"\{\{(\w+)\}\}")

# ===================== Usuarios =====================


def listar_usuarios(db: Session, q: str | None) -> list[UsuarioAdmin]:
    stmt = select(Usuario).order_by(Usuario.nombre)
    if q and q.strip():
        t = q.strip().lower()
        stmt = stmt.where(func.lower(Usuario.nombre).contains(t) | func.lower(Usuario.correo).contains(t))
    return [_usuario_dto(x) for x in db.scalars(stmt)]


def crear_usuario(db: Session, req: UsuarioNuevoRequest, u: UsuarioPrincipal) -> UsuarioAdmin:
    correo = _correo_libre(db, req.correo)
    nuevo = Usuario(nombre=req.nombre.strip(), correo=correo, password_hash=hash_password(req.password),
                    rol=_rol(db, req.rol_id), activo=req.activo)
    db.add(nuevo)
    db.flush()
    registrar(db, u.id, "USUARIO", nuevo.id, "CREAR", f"{correo} ({nuevo.rol.codigo})")
    return _usuario_dto(nuevo)


def actualizar_usuario(db: Session, id: int, req: UsuarioRequest, u: UsuarioPrincipal) -> UsuarioAdmin:
    x = _usuario(db, id)
    rol = _rol(db, req.rol_id)
    if x.id == u.id and (not req.activo or rol.id != x.rol_id):
        raise ApiError.conflicto("No puedes desactivarte ni cambiar tu propio perfil.")

    cambios = []
    if x.rol_id != rol.id:
        cambios.append(f"perfil {x.rol.codigo} -> {rol.codigo}")
    if x.activo != req.activo:
        cambios.append("activado" if req.activo else "desactivado")
    x.nombre = req.nombre.strip()
    x.correo = _correo_libre(db, req.correo, excepto=x.id)
    x.rol = rol
    x.activo = req.activo
    db.flush()
    _validar_queda_admin(db)
    registrar(db, u.id, "USUARIO", x.id, "EDITAR", ", ".join(cambios) or None)
    return _usuario_dto(x)


def cambiar_password(db: Session, id: int, req: PasswordRequest, u: UsuarioPrincipal) -> None:
    x = _usuario(db, id)
    x.password_hash = hash_password(req.password)
    registrar(db, u.id, "USUARIO", x.id, "CAMBIAR_PASSWORD")


# ===================== Perfiles =====================


def listar_permisos(db: Session) -> list[PermisoDto]:
    return [PermisoDto.model_validate(p) for p in db.scalars(select(Permiso).order_by(Permiso.codigo))]


def listar_roles(db: Session) -> list[RolAdmin]:
    usuarios = dict(db.execute(select(Usuario.rol_id, func.count()).group_by(Usuario.rol_id)).all())
    return [_rol_dto(r, usuarios.get(r.id, 0)) for r in db.scalars(select(Rol).order_by(Rol.nombre))]


def crear_rol(db: Session, req: RolNuevoRequest, u: UsuarioPrincipal) -> RolAdmin:
    if db.scalar(select(Rol).where(Rol.codigo == req.codigo)) is not None:
        raise ApiError.conflicto(f"Ya existe un perfil con el código {req.codigo}.")
    r = Rol(codigo=req.codigo, nombre=req.nombre.strip(), permisos=_permisos(db, req.permisos))
    db.add(r)
    db.flush()
    registrar(db, u.id, "ROL", r.id, "CREAR", f"{r.codigo}: {', '.join(req.permisos)}")
    return _rol_dto(r, 0)


def actualizar_rol(db: Session, id: int, req: RolRequest, u: UsuarioPrincipal) -> RolAdmin:
    r = db.get(Rol, id)
    if r is None:
        raise ApiError.no_encontrado("El perfil")
    r.nombre = req.nombre.strip()
    r.permisos = _permisos(db, req.permisos)
    db.flush()
    _validar_queda_admin(db)
    registrar(db, u.id, "ROL", r.id, "EDITAR", f"{r.codigo}: {', '.join(sorted(req.permisos))}")
    usuarios = db.scalar(select(func.count()).where(Usuario.rol_id == r.id)) or 0
    return _rol_dto(r, usuarios)


# ===================== Plantillas =====================


def listar_plantillas(db: Session) -> list[PlantillaAdmin]:
    en_uso = set(db.scalars(select(Campana.plantilla_id)
                            .where(Campana.estado.in_(ESTADOS_PLANTILLA_FIJA)).distinct()))
    return [_plantilla_dto(p, p.id in en_uso)
            for p in db.scalars(select(Plantilla).order_by(Plantilla.nombre_externo))]


def crear_plantilla(db: Session, req: PlantillaRequest, u: UsuarioPrincipal) -> PlantillaAdmin:
    _nombre_plantilla_libre(db, req.nombre)
    p = Plantilla(nombre_externo=req.nombre, descripcion=req.descripcion, cuerpo=req.cuerpo,
                  variables=variables_de(req.cuerpo), activa=req.activa)
    db.add(p)
    db.flush()
    registrar(db, u.id, "PLANTILLA", p.id, "CREAR", p.nombre_externo)
    return _plantilla_dto(p, False)


def actualizar_plantilla(db: Session, id: int, req: PlantillaRequest, u: UsuarioPrincipal) -> PlantillaAdmin:
    p = db.get(Plantilla, id)
    if p is None:
        raise ApiError.no_encontrado("La plantilla")
    en_uso = _plantilla_en_uso(db, id)
    if en_uso and (req.cuerpo != p.cuerpo or req.nombre != p.nombre_externo):
        raise ApiError.conflicto(
            "La plantilla la usa una campaña en aprobación o en envío; solo puedes cambiar la descripción "
            "o desactivarla.")
    _nombre_plantilla_libre(db, req.nombre, excepto=id)
    p.nombre_externo = req.nombre
    p.descripcion = req.descripcion
    p.cuerpo = req.cuerpo
    p.variables = variables_de(req.cuerpo)
    p.activa = req.activa
    registrar(db, u.id, "PLANTILLA", p.id, "EDITAR", p.nombre_externo)
    return _plantilla_dto(p, en_uso)


def variables_de(cuerpo: str) -> list[str]:
    """Variables {{nombre}} en el orden en que aparecen, sin repetir."""
    return list(dict.fromkeys(VARIABLE.findall(cuerpo)))


# ===================== Bitácora =====================


def auditoria(db: Session, entidad: str | None, limite: int) -> list[RegistroAuditoria]:
    stmt = (select(Auditoria, Usuario.nombre)
            .outerjoin(Usuario, Usuario.id == Auditoria.usuario_id)
            .order_by(Auditoria.fecha.desc(), Auditoria.id.desc())
            .limit(limite))
    if entidad:
        stmt = stmt.where(Auditoria.entidad == entidad)
    return [RegistroAuditoria(id=a.id, fecha=a.fecha, usuario=nombre, entidad=a.entidad,
                              entidad_id=a.entidad_id, accion=a.accion, detalle=a.detalle)
            for a, nombre in db.execute(stmt)]


# ===================== Auxiliares =====================


def _usuario(db: Session, id: int) -> Usuario:
    x = db.get(Usuario, id)
    if x is None:
        raise ApiError.no_encontrado("El usuario")
    return x


def _rol(db: Session, id: int) -> Rol:
    r = db.get(Rol, id)
    if r is None:
        raise ApiError.invalido("El perfil elegido no existe.")
    return r


def _permisos(db: Session, codigos: list[str]) -> list[Permiso]:
    encontrados = list(db.scalars(select(Permiso).where(Permiso.codigo.in_(set(codigos)))))
    faltan = set(codigos) - {p.codigo for p in encontrados}
    if faltan:
        raise ApiError.invalido(f"Permisos desconocidos: {', '.join(sorted(faltan))}.")
    return encontrados


def _correo_libre(db: Session, correo: str, excepto: int | None = None) -> str:
    correo = correo.strip().lower()
    stmt = select(Usuario.id).where(func.lower(Usuario.correo) == correo)
    if excepto is not None:
        stmt = stmt.where(Usuario.id != excepto)
    if db.scalar(stmt) is not None:
        raise ApiError.conflicto("Ya existe un usuario con ese correo.")
    return correo


def _nombre_plantilla_libre(db: Session, nombre: str, excepto: int | None = None) -> None:
    stmt = select(Plantilla.id).where(Plantilla.nombre_externo == nombre)
    if excepto is not None:
        stmt = stmt.where(Plantilla.id != excepto)
    if db.scalar(stmt) is not None:
        raise ApiError.conflicto("Ya existe una plantilla con ese nombre.")


def _plantilla_en_uso(db: Session, id: int) -> bool:
    return db.scalar(select(Campana.id).where(Campana.plantilla_id == id,
                                              Campana.estado.in_(ESTADOS_PLANTILLA_FIJA)).limit(1)) is not None


def _validar_queda_admin(db: Session) -> None:
    admins = db.scalar(
        select(func.count(Usuario.id))
        .join(rol_permiso, rol_permiso.c.rol_id == Usuario.rol_id)
        .where(Usuario.activo.is_(True), rol_permiso.c.permiso_codigo == PERMISO_ADMIN)
    )
    if not admins:
        raise ApiError.conflicto(
            "Debe quedar al menos un usuario activo con permiso para administrar usuarios y perfiles.")


def _usuario_dto(x: Usuario) -> UsuarioAdmin:
    return UsuarioAdmin(id=x.id, nombre=x.nombre, correo=x.correo, rol_id=x.rol_id, rol=x.rol.codigo,
                        activo=x.activo, ultimo_acceso=x.ultimo_acceso, creado=x.creado)


def _rol_dto(r: Rol, usuarios: int) -> RolAdmin:
    return RolAdmin(id=r.id, codigo=r.codigo, nombre=r.nombre,
                    permisos=sorted(p.codigo for p in r.permisos), usuarios=usuarios)


def _plantilla_dto(p: Plantilla, en_uso: bool) -> PlantillaAdmin:
    return PlantillaAdmin(id=p.id, nombre=p.nombre_externo, descripcion=p.descripcion, cuerpo=p.cuerpo,
                          variables=p.variables or [], activa=p.activa, en_uso=en_uso)
