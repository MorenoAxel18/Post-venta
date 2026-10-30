# 000 · Reglas de trabajo

- **Estado:** Vigente
- **Última actualización:** 2026-10-30

## Objetivo
Que dos o más personas (y asistentes de IA como Claude) trabajen en el repositorio sin pisarse,
con cambios controlados y documentados.

## 1. Pedir permiso antes de cambiar la estructura

Antes de hacer cualquiera de estas acciones se **describe qué se va a hacer y se espera aprobación**
del responsable del proyecto (o del compañero, vía PR/issue):

- Crear, mover, renombrar o borrar archivos o carpetas.
- Cambiar el esquema de la base de datos (tablas, columnas, índices) o agregar una migración.
- Agregar, quitar o actualizar dependencias (`requirements*.txt`, `package.json`).
- Cambiar puertos, variables de entorno, `docker-compose.yml` o la configuración por defecto.
- Cambiar permisos, perfiles o reglas de negocio existentes.

La propuesta debe listar: archivos nuevos, archivos modificados, cambios de BD y por qué.
Esta regla aplica igual a personas y a asistentes de IA (ver `CLAUDE.md` en la raíz).

## 2. Toda tarea importante lleva spec

- Funcionalidad nueva → spec nueva en `docs/specs/` (ver plantilla en el [índice](README.md)),
  con su sección **Plan y tareas**: fases y checklist de tareas escritos *antes* de programar.
- Las tareas se marcan `[x]` conforme se terminan; lo pendiente queda `[ ]` con lo que lo bloquea.
- Cambio importante → se actualiza la spec existente y su bitácora de cambios.
- La spec se entrega **en el mismo PR** que el código.

## 3. Ramas y PR

- No se trabaja directo en `main`. Una rama por tarea: `feature/<nombre>`, `fix/<nombre>`, `docs/<nombre>`.
- Todo entra por Pull Request revisado por la otra persona.
- El PR menciona la spec que implementa o actualiza.

## 4. Pruebas

- Toda regla de negocio nueva tiene prueba en `backend/tests/`.
- Antes de abrir PR: `pytest` en verde (SQLite) y, si se tocaron consultas o migraciones,
  también contra PostgreSQL:
  `TEST_DATABASE_URL=postgresql+psycopg://postventa:postventa@localhost:5433/postventa_test pytest`
  (la base `postventa_test` se crea una vez con `docker exec postventa-db createdb -U postventa postventa_test`).
- Frontend: `npm run build` sin errores de TypeScript.

## 5. Base de datos

- Todo cambio de esquema va por migración de Alembic (`backend/alembic/versions/NNNN_descripcion.py`),
  numerada en orden y revisada a mano.
- Nunca se edita una migración que ya se aplicó en otro ambiente: se crea una nueva.
- Si la migración necesita llenar datos existentes, se hace dentro de la misma migración y se documenta en la spec.

## 6. Seguridad y datos

- Credenciales y secretos (contraseñas, API keys de Treble, etc.) solo en `backend/.env`. Nunca en código,
  commits, issues ni chats. El `.gitignore` excluye **cualquier** `.env` en cualquier carpeta; solo se sube
  `backend/.env.example` con valores de ejemplo. Cada persona crea su `.env` copiando el ejemplo.
- Si una variable nueva es necesaria, se agrega a `.env.example` con un valor falso y se documenta en el README.
- Si un secreto llega a subirse por error, se considera comprometido: se **cambia** (no basta con borrar el commit).
- `JWT_SECRET` real en cualquier ambiente que no sea local.
- Las carteras de clientes reales **no** se suben al repositorio (`*.xlsx` y `*.xls` están ignorados).
  Para pruebas se usa `docs/cartera_prueba.csv`.
- Las respuestas de la API no deben exponer `password_hash` ni datos que no use la pantalla.

## 7. Convenciones de código

- Código, nombres y textos en **español** (como el resto del proyecto).
- Backend: un paquete por módulo en `backend/app/<modulo>/` con `modelos.py`, `esquemas.py`,
  `servicio.py`, `router.py`. Reglas de negocio en `servicio.py`; el router solo valida permisos.
- JSON en camelCase (`CamelModel`), Python en snake_case.
- Frontend: una carpeta por módulo en `frontend/src/features/<modulo>/`, cliente de API en `frontend/src/api/`.
- Fechas en UTC en la base; en pantalla, hora del centro de México.

## 8. Entorno local

| Servicio | Puerto | Nota |
|---|---|---|
| PostgreSQL (docker) | 5433 | 5432 lo usa otro proyecto local |
| Backend (uvicorn) | 8001 | 8000 lo usa otro proyecto local |
| Frontend (vite) | 5173 | proxy `/api` → 8001 |

Python **3.12** (las versiones fijadas de las dependencias no tienen paquetes para 3.13+). Node 20+.

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
| 2026-10-30 | Creación de las reglas de trabajo | Equipo |
