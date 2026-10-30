# Plataforma de Postventa (WhatsApp)

Sitio web para operar la mensajería de WhatsApp de Postventa: campañas, atención humana, monitoreo y administración.

**Estado actual:** fase 0 (base), fase 1 (campañas), administración y monitoreo de campañas. Los envíos son **simulados**; no sale ningún mensaje real.

```
postventa/
├── backend/            Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL · JWT
├── frontend/           React 18 · TypeScript · Vite · Tailwind · TanStack Query
├── docs/               cartera_prueba.csv (registros válidos y con error para probar)
└── docker-compose.yml  PostgreSQL 16
```

## Cómo levantarlo

Requisitos: Docker, Python 3.12 y Node 20+.

```bash
# 1. Base de datos
docker compose up -d

# 2. Backend (http://localhost:8001)
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
cp .env.example .env               # Windows: copy .env.example .env
alembic upgrade head               # crea las tablas
uvicorn app.main:app --reload --port 8001

# 3. Frontend (http://localhost:5173) — redirige /api al backend
cd frontend
npm install
npm run dev
```

Documentación de la API (Swagger): http://localhost:8001/docs

### Usuarios de prueba

Se crean solos al arrancar el backend (se desactiva con `DATOS_DEMO=false`). Contraseña de todos: `Postventa2026`

| Correo | Perfil | Qué ve |
|---|---|---|
| admin@fincomun.test | Administrador | Todo |
| supervisor@fincomun.test | Supervisor | Campañas (ver y aprobar), atención, monitoreo |
| agente@fincomun.test | Agente | Solo atención humana |

### Pruebas del backend

```bash
cd backend
pytest                              # usa SQLite temporal
# contra PostgreSQL (base vacía):
TEST_DATABASE_URL=postgresql+psycopg://postventa:postventa@localhost:5433/postventa_test pytest
```

Cubren normalización de teléfonos, lectura de Excel/CSV, validación de cartera, el flujo completo
(crear → cargar → mensaje → programar → aprobar → enviar → completar), rechazo, cancelación y permisos por perfil.

## Flujo para probar campañas en la interfaz

1. Entra como **admin**, crea una campaña y sube `docs/cartera_prueba.csv` (4 válidos, 5 con error).
2. Elige la plantilla, mapea las variables, programa el envío y **envíala a aprobación**.
3. Entra como **supervisor** y apruébala (el autor no puede autoaprobarse).
4. El scheduler revisa cada 30 s: la campaña pasa a *En ejecución* y luego a *Completada*.
   El gateway simulado marca ~2 % de envíos como fallidos.
5. Entra como **agente**: no verá Campañas en el menú y la API le responde 403.

## Especificaciones

Reglas, limitaciones y decisiones de cada módulo en [`docs/specs/`](docs/specs/README.md).
**Antes de trabajar, lee las [reglas de trabajo](docs/specs/000-reglas-de-trabajo.md)**: se pide aprobación
antes de crear/mover archivos o cambiar la BD, y todo cambio importante actualiza su spec.

## Decisiones de diseño

- **Monolito modular.** Un paquete por módulo en `backend/app` (`auth`, `campanas`, `admin`, `integracion`, `comun`), cada uno con `modelos.py`, `esquemas.py`, `servicio.py` y `router.py`. `atencion` y `monitoreo` se agregan igual.
- **Administración** (`app/admin`, pantalla *Configuración*). Usuarios, perfiles y bitácora piden `ADMIN_USUARIOS`; plantillas, `ADMIN_REGLAS`. Nadie puede desactivarse ni cambiarse el perfil a sí mismo, y siempre debe quedar al menos un usuario activo con `ADMIN_USUARIOS`. El texto de una plantilla no se puede cambiar mientras la use una campaña en aprobación o en envío.
- **Capas.** `router.py` solo recibe la petición y valida permisos; las reglas de negocio están en `servicio.py`. El JSON viaja en camelCase (`CamelModel`) aunque el código use snake_case.
- **Permisos, no roles.** El JWT trae los permisos del perfil. El backend valida cada endpoint con la dependencia `requiere("PERMISO")` y el frontend usa la misma lista (`src/auth/navegacion.ts`) para el menú y las rutas.
- **Estados de campaña** (`app/campanas/modelos.py`): `BORRADOR → PENDIENTE_APROBACION → PROGRAMADA → EN_EJECUCION → COMPLETADA`, con `PAUSADA`, `CANCELADA` y rechazo de regreso a `BORRADOR`. Solo se edita en borrador.
- **Cartera flexible.** Columnas obligatorias `id_cliente`, `nombre`, `telefono` (acepta alias como `celular`). Todas las columnas se guardan en `destinatario.datos` (JSONB) para usarlas como variables. Lee .xlsx, .xls y CSV (coma o punto y coma, UTF-8 o Latin-1).
- **Teléfonos** normalizados a 10 dígitos (acepta `+52`, `521`, espacios, guiones y paréntesis). Duplicados se marcan como error.
- **Registros con error** se excluyen del envío y se pueden descargar en CSV.
- **WhatsApp:** las campañas solo usan plantillas aprobadas. Treble se integra detrás de `MessagingGateway` (`app/integracion/gateway.py`); hoy responde `FakeMessagingGateway`.
- **Scheduler:** APScheduler dentro del mismo proceso (`app/campanas/envio.py`); cada lote es una transacción.
- **Horario:** fechas en UTC en la BD; el frontend las captura y muestra en hora del centro de México.
- **Catálogos al arrancar:** permisos, perfiles, usuarios y plantillas de prueba se insertan en `app/catalogos.py` (solo agrega lo que falta).
- **Auditoría:** crear, cargar cartera, enviar a aprobación, aprobar, rechazar, pausar y cancelar quedan en la tabla `auditoria`.

## Configuración (`backend/.env`)

| Variable | Default | Nota |
|---|---|---|
| `DATABASE_URL` | PostgreSQL de docker-compose | |
| `JWT_SECRET` | secreto de desarrollo | **Cambiar en cualquier ambiente real** (mínimo 32 caracteres) |
| `PERMITIR_AUTOAPROBACION` | `false` | Pendiente de confirmar con el negocio |
| `LOTE_ENVIO` | `50` | Mensajes por ciclo del scheduler |
| `INTERVALO_SCHEDULER_SEGUNDOS` | `30` | Cada cuánto corre el scheduler |
| `SCHEDULER_ACTIVO` | `true` | Dejarlo encendido en una sola réplica |
| `DATOS_DEMO` | `true` | Usuarios y plantillas de prueba. **Apagar en cualquier ambiente real** |
| `JWT_EXPIRACION_MINUTOS` | `480` | Duración de la sesión (8 h) |
| `LOGIN_MAX_INTENTOS` | `5` | Intentos fallidos por correo+IP antes de bloquear |
| `LOGIN_BLOQUEO_MINUTOS` | `15` | Duración del bloqueo |
| `DOCS_ACTIVOS` | `true` | Swagger en `/docs`. **Apagar fuera de desarrollo** |

Cambios al modelo de datos: modifica los modelos, genera la migración con
`alembic revision --autogenerate -m "descripcion"`, revísala y aplica con `alembic upgrade head`.

## Pendientes conocidos

- Confirmar el formato real de la cartera, quién aprueba y las plantillas reales de Treble.
- `TrebleMessagingGateway` y webhook de estados (entregado/leído) cuando se tenga acceso a la API.
- Fases siguientes: atención humana (colas, asignación, WebSocket) y monitoreo.
- Los permisos viajan en el JWT: si se cambian los permisos de un perfil, aplican en el siguiente inicio de sesión (el token dura `JWT_EXPIRACION_MINUTOS`, 8 h por defecto). Desactivar un usuario sí lo saca al instante (spec 005).
