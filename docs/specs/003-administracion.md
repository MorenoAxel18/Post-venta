# 003 · Administración

- **Estado:** Implementada
- **Última actualización:** 2026-10-30

## Objetivo
Que un administrador gestione usuarios, perfiles, permisos y plantillas desde la pantalla
*Configuración*, sin tocar código ni la base de datos.

## Alcance
- **Usuarios:** listar y buscar, crear (con contraseña inicial), editar nombre/correo/perfil/activo, cambiar contraseña.
- **Perfiles:** listar con número de usuarios, crear perfiles nuevos y elegir sus permisos.
- **Plantillas:** listar todas (activas e inactivas), crear, editar y activar/desactivar.
- **Bitácora:** últimos movimientos de la tabla `auditoria`, filtrables por tipo.

## Fuera de alcance
- Borrar usuarios, perfiles o plantillas (se desactivan; se conservan por la bitácora y las campañas).
- Crear permisos nuevos desde la pantalla (los permisos los define el código, ver spec 001).
- Sincronizar plantillas con Treble (pendiente de la integración).
- Reglas de asignación de conversaciones (llegan con Atención humana).

## Reglas de negocio
1. Correo único sin distinguir mayúsculas; se guarda en minúsculas.
2. Contraseña de 8 a 72 caracteres.
3. **Nadie puede desactivarse ni cambiarse el perfil a sí mismo.**
4. **Siempre debe quedar al menos un usuario activo con `ADMIN_USUARIOS`.** Se valida al editar
   usuarios y al cambiar permisos de un perfil; si no se cumple, se rechaza el cambio completo (409).
5. El código del perfil (`ADMIN`, `SUPERVISOR`…) se fija al crearlo y no se edita.
6. Nombre de plantilla: minúsculas, números y guion bajo (como en Treble / Meta), único.
7. Las variables de la plantilla se detectan solas del texto (`{{variable}}`, sin espacios).
8. **No se puede cambiar el nombre ni el texto de una plantilla que usa una campaña** en
   `PENDIENTE_APROBACION`, `PROGRAMADA`, `EN_EJECUCION` o `PAUSADA`. Sí se puede cambiar la descripción o desactivarla.
9. Una plantilla inactiva no aparece al crear campañas.
10. Toda creación o edición queda en la bitácora (`USUARIO`, `ROL`, `PLANTILLA`). Nunca se guarda la contraseña en la bitácora.

## Permisos
- Usuarios, perfiles y bitácora: `ADMIN_USUARIOS`.
- Plantillas: `ADMIN_REGLAS`.
- La opción *Configuración* del menú pide `ADMIN_USUARIOS`.

## Restricciones y limitaciones
- **Desactivar un usuario lo saca al instante** (su siguiente petición recibe 401, spec 005).
- **Los cambios de permisos de un perfil aplican en el siguiente inicio de sesión** de sus usuarios
  (el JWT dura hasta 8 h). Ver spec 001.
- Un usuario con solo `ADMIN_REGLAS` (sin `ADMIN_USUARIOS`) no ve el menú *Configuración*.
- La bitácora muestra máximo 500 registros por consulta (200 por defecto), sin paginación.
- El nombre del perfil en la barra lateral solo se traduce para ADMIN/SUPERVISOR/AGENTE; perfiles nuevos muestran su código.

## Decisiones
- No se agregaron tablas: se reutilizan `usuario`, `rol`, `permiso`, `rol_permiso`, `plantilla` y `auditoria`.
- Desactivar en lugar de borrar, para no romper referencias (campañas, bitácora).
- La regla "siempre queda un admin" se valida después de aplicar el cambio (`flush`) y, si falla,
  la transacción completa se revierte.

## Archivos
- Backend: `app/admin/` (esquemas, servicio, router), registrado en `app/main.py`
- Frontend: `src/features/admin/` (ConfiguracionPage, UsuariosTab, PerfilesTab, PlantillasTab, BitacoraTab, comun), `src/api/admin.ts`
- Pruebas: `tests/test_admin.py`

## Endpoints
| Método | Ruta | Permiso |
|---|---|---|
| GET/POST | `/api/admin/usuarios` | ADMIN_USUARIOS |
| PUT | `/api/admin/usuarios/{id}` | ADMIN_USUARIOS |
| PUT | `/api/admin/usuarios/{id}/password` | ADMIN_USUARIOS |
| GET | `/api/admin/permisos` | ADMIN_USUARIOS |
| GET/POST | `/api/admin/roles` · PUT `/api/admin/roles/{id}` | ADMIN_USUARIOS |
| GET/POST | `/api/admin/plantillas` · PUT `/api/admin/plantillas/{id}` | ADMIN_REGLAS |
| GET | `/api/admin/auditoria?entidad=&limite=` | ADMIN_USUARIOS |

## Plan y tareas

**Fase 1 — backend** (terminada)
- [x] Esquemas, servicio y router en `app/admin/`
- [x] Reglas: correo único, no auto-bloqueo, siempre un admin, plantilla en uso bloqueada
- [x] Bitácora de cada creación/edición
- [x] Pruebas (`test_admin.py`, 8 casos)

**Fase 2 — frontend** (terminada)
- [x] Pantalla *Configuración* con pestañas según permiso
- [x] Usuarios (crear, editar, contraseña), Perfiles (casillas de permisos), Plantillas, Bitácora
- [x] Compila sin errores de TypeScript

**Pendientes / bloqueados**
- [ ] Probar las pantallas a mano en navegador y anotar ajustes de UX
- [x] Corte inmediato de sesión al desactivar un usuario (spec 005)
- [ ] Paginación de la bitácora y filtros por usuario/fecha
- [ ] Sincronizar plantillas con Treble — *bloqueado por: Treble*

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
| 2026-10-30 | Módulo creado | Equipo |
