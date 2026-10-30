# 001 · Base y autenticación

- **Estado:** Implementada
- **Última actualización:** 2026-10-30

## Objetivo
Estructura base del sistema: inicio de sesión, perfiles con permisos y protección de cada pantalla y endpoint.

## Alcance
- Login con correo y contraseña; sesión con JWT.
- Perfiles (roles) con lista de permisos; el menú y las rutas se muestran según permisos.
- Catálogos base al arrancar (permisos, perfiles, usuarios y plantillas demo).
- Bitácora (`auditoria`) para acciones importantes.
- Formato único de errores: `{"mensaje": "...", "campos": {...}}`.

## Fuera de alcance
- Recuperar contraseña por correo, 2FA, inicio de sesión con directorio corporativo (SSO).
- Cierre de sesión del lado del servidor (lista de tokens revocados).

## Reglas de negocio
- Correo sin distinguir mayúsculas.
- Un usuario inactivo no puede iniciar sesión (403).
- Cada endpoint valida permiso con `requiere("PERMISO")`; si no lo tiene → 403. Sin token o token inválido → 401.

## Permisos

| Código | Descripción | ADMIN | SUPERVISOR | AGENTE |
|---|---|:-:|:-:|:-:|
| CAMPANA_VER | Ver campañas | ✔ | ✔ | |
| CAMPANA_CREAR | Crear y editar campañas | ✔ | | |
| CAMPANA_APROBAR | Aprobar o rechazar campañas | ✔ | ✔ | |
| CONVERSACION_VER_PROPIAS | Ver conversaciones asignadas | ✔ | ✔ | ✔ |
| CONVERSACION_RESPONDER | Responder conversaciones | ✔ | ✔ | ✔ |
| CONVERSACION_VER_TODAS | Ver todas las conversaciones | ✔ | ✔ | |
| CONVERSACION_REASIGNAR | Reasignar conversaciones | ✔ | ✔ | |
| MONITOREO_VER | Ver monitoreo y reportes | ✔ | ✔ | |
| ADMIN_USUARIOS | Administrar usuarios y perfiles | ✔ | | |
| ADMIN_REGLAS | Administrar reglas y plantillas | ✔ | | |

Estos son los permisos *iniciales*; después se administran desde Configuración (spec 003).

## Restricciones y limitaciones
- **El JWT lleva los permisos.** Si se cambian los permisos de un perfil, aplican en el siguiente inicio
  de sesión. El token dura `JWT_EXPIRACION_MINUTOS` (480 = 8 h por defecto).
- **Desactivar un usuario sí aplica al instante:** cada petición revisa en la BD que siga activo (spec 005).
- Login limitado a 5 intentos fallidos por correo+IP en 15 min (spec 005).
- `catalogos.sembrar()` solo **agrega** lo que falta; no modifica permisos de perfiles existentes.
  Un permiso nuevo en código no se asigna solo a perfiles ya creados: se asigna desde Configuración.
- Usuarios demo (`DATOS_DEMO=true`) con contraseña conocida: **apagar en cualquier ambiente real**.
- Contraseñas con bcrypt: solo cuentan los primeros 72 bytes.

## Decisiones
- **Permisos, no roles**, en el código: los perfiles se pueden crear o cambiar sin tocar código.
- **JWT con permisos** para no cargar perfil y permisos en cada petición; solo se consulta si el usuario sigue activo.
- **Monolito modular** (FastAPI + React) en lugar de microservicios: equipo pequeño, un solo despliegue.

## Archivos
- Backend: `app/auth/`, `app/comun/`, `app/catalogos.py`, `app/config.py`, `app/db.py`, `app/main.py`
- Frontend: `src/auth/` (contexto, guardias, menú en `navegacion.ts`), `src/api/client.ts`, `src/layout/`
- Pruebas: `tests/test_permisos.py`

## Plan y tareas

**Fase 0 — base** (terminada)
- [x] Modelos `usuario`, `rol`, `permiso`, `rol_permiso`, `auditoria` y migración 0001
- [x] Login, `/api/auth/me`, JWT y dependencia `requiere()`
- [x] Catálogos base y usuarios demo al arrancar
- [x] Menú y rutas protegidas por permiso en el frontend
- [x] Pruebas de permisos (`test_permisos.py`)
- [x] Entorno local en puertos 5433/8001

**Pendientes / bloqueados**
- [x] Desactivar un usuario corta su sesión al instante (spec 005)
- [ ] Decidir si los permisos se recargan de la BD en cada petición — *bloqueado por: decisión del equipo*
- [ ] Recuperación de contraseña — *bloqueado por: definir canal (correo corporativo)*
- [ ] Apagar `DATOS_DEMO` y definir `JWT_SECRET` real en el primer ambiente compartido

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
| 2026-10-30 | Spec escrita a partir del código existente (fase 0) | Equipo |
| 2026-10-30 | BD local en puerto 5433 y backend en 8001 para convivir con otro proyecto | Equipo |
| 2026-10-30 | `Usuario.rol` en el frontend pasa a `string` para permitir perfiles nuevos | Equipo |
| 2026-10-30 | Límite de intentos, login en tiempo constante, usuario activo por petición, `DOCS_ACTIVOS` (spec 005) | Equipo |
