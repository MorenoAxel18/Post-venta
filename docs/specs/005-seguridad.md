# 005 · Seguridad de acceso

- **Estado:** Implementada
- **Última actualización:** 2026-10-30

## Objetivo
Cerrar los huecos encontrados en la revisión de seguridad del 2026-10-30: fuerza bruta en el login,
documentación de la API expuesta, enumeración de correos y sesiones que siguen vivas al desactivar un usuario.

## Revisión realizada (2026-10-30)
Se probaron las 28 rutas de la API sin token, con token vencido, con firma falsa, con `alg: none` y con un
usuario sin permiso. **Todas responden 401/403**; solo `POST /api/auth/login` y `GET /api/salud` son públicas
(esta última no devuelve datos). Entrar por link directo a una pantalla sin sesión redirige al login, y sin
permiso muestra "Sin permiso"; aunque se saltara el frontend, la API no entrega datos. La API no expone
contraseñas ni hashes. Hallazgos a corregir: puntos 1, 2, 3 y 5 de abajo.

## Alcance
1. **Límite de intentos de login.** 5 intentos fallidos del mismo correo desde la misma IP, o 20 desde la misma IP
   con cualquier correo, bloquean el login 15 minutos (429). Un login correcto limpia el contador de ese correo.
2. **Swagger apagable.** `DOCS_ACTIVOS=false` desactiva `/docs`, `/redoc` y `/openapi.json`.
3. **Login con tiempo constante.** Si el correo no existe se compara contra un hash de relleno, para que
   tarde lo mismo que una contraseña incorrecta y no se pueda adivinar qué correos existen.
5. **Usuario activo en cada petición.** Cada petición autenticada revisa en la BD que el usuario exista y siga
   activo; si fue desactivado, responde 401 y el frontend regresa al login.

## Fuera de alcance
- (4) Mover el token de `localStorage` a cookie `HttpOnly` y cabeceras CSP: se hará al definir el despliegue.
- Recargar permisos desde la BD en cada petición (los permisos siguen viajando en el JWT; ver limitaciones).
- Revocar sesiones al cambiar la contraseña de un usuario.
- CAPTCHA, 2FA.

## Reglas de negocio
- Bloqueo: `LOGIN_MAX_INTENTOS` (5) por correo+IP y `4 × LOGIN_MAX_INTENTOS` (20) por IP, en una ventana de
  `LOGIN_BLOQUEO_MINUTOS` (15). Mientras dure, incluso la contraseña correcta recibe 429.
- El mensaje de bloqueo no dice si el correo existe.
- Usuario desactivado o borrado con token vigente → 401 en la siguiente petición.

## Restricciones y limitaciones
- **El contador de intentos vive en memoria del proceso**: se reinicia al reiniciar el backend y no se comparte
  entre réplicas. Con más de una instancia hay que moverlo a Redis o a la BD.
- La IP es `request.client.host`. Detrás de un proxy/balanceador será la IP del proxy, y el límite por IP
  afectaría a todos: hay que configurar uvicorn con `--proxy-headers` y `--forwarded-allow-ips` al desplegar.
- Los **cambios de permisos** de un perfil siguen aplicando hasta el siguiente login (el JWT los trae). La
  **desactivación** sí aplica al instante.
- Cada petición autenticada hace una consulta extra (por llave primaria) a `usuario`.

## Decisiones
- Contador en memoria y sin dependencias nuevas: suficiente para una instancia; documentado arriba.
- Se bloquea por correo+IP (y no solo por correo) para que un atacante no pueda dejar fuera a un usuario
  legítimo desde otra IP.
- `/docs` queda encendido por defecto para desarrollo; `.env.example` lo documenta.

## Archivos
- Backend: `app/auth/seguridad.py` (limitador, hash de relleno, verificación de usuario activo),
  `app/auth/router.py` (login), `app/config.py`, `app/main.py`, `backend/.env.example`
- Pruebas: `tests/test_seguridad.py`, `tests/conftest.py` (reinicia el limitador entre pruebas)

## Pruebas
`pytest` — bloqueo tras 5 intentos y 429 aun con contraseña correcta, desbloqueo al pasar la ventana,
login correcto limpia el contador, tiempo similar con correo inexistente, usuario desactivado pierde la sesión,
`/docs` apagado con `DOCS_ACTIVOS=false`.

## Plan y tareas

**Fase 1 — implementación** (terminada)
- [x] Spec y rama `feature/seguridad`
- [x] (1) Limitador de intentos y respuesta 429
- [x] (2) Variable `DOCS_ACTIVOS`
- [x] (3) Hash de relleno en el login
- [x] (5) Verificación de usuario activo en `usuario_actual`
- [x] Pruebas en SQLite y PostgreSQL
- [x] Actualizar specs 001 y 003, README y `.env.example`

**Pendientes / bloqueados**
- [ ] (4) Token en cookie `HttpOnly` + CSP — *bloqueado por: definir despliegue (dominio, proxy)*
- [ ] Contador de intentos compartido (Redis/BD) — *cuando haya más de una instancia*
- [ ] `--proxy-headers` en uvicorn — *al desplegar detrás de proxy*
- [ ] Decidir si los permisos se recargan de la BD en cada petición — *decisión del equipo*

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
| 2026-10-30 | Revisión de seguridad y correcciones 1, 2, 3 y 5 | Equipo |
