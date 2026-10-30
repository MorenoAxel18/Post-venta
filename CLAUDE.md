# Plataforma de Postventa — instrucciones para Claude

Lee primero `docs/specs/README.md` y `docs/specs/000-reglas-de-trabajo.md`. Las specs son la referencia
de qué hace el sistema, sus reglas y sus limitaciones.

## Reglas obligatorias

1. **Pide permiso antes de** crear, mover, renombrar o borrar archivos; cambiar el esquema de la BD o
   agregar migraciones; agregar o actualizar dependencias; cambiar puertos, `.env`, `docker-compose.yml`
   o configuración; cambiar permisos o reglas de negocio. Propón la lista de archivos nuevos/modificados
   y los cambios de BD, y espera el "sí".
2. **Toda tarea o cambio importante se documenta en `docs/specs/`**: spec nueva con la plantilla del índice,
   o actualización de la spec existente + línea en su bitácora de cambios. Hazlo en el mismo cambio que el código.
   Cada spec lleva su sección **Plan y tareas** (fases + checklist) escrita antes de programar; marca `[x]`
   cada tarea al terminarla.
3. Toda regla de negocio nueva lleva prueba en `backend/tests/`. Corre `pytest` antes de dar algo por terminado;
   si tocaste consultas o migraciones, también contra PostgreSQL (comando en la spec 000).
4. Nunca escribas credenciales en código, specs, commits ni mensajes. Viven en `backend/.env` (ignorado por git).
5. No hagas commit, push ni PR sin que te lo pidan. No trabajes directo en `main`.

## Contexto rápido

- Backend: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL (`backend/`). Un paquete por módulo en `app/`.
- Frontend: React 18, TypeScript, Vite, Tailwind, TanStack Query (`frontend/`). Un módulo por carpeta en `src/features/`.
- Local: PostgreSQL en **5433**, backend en **8001** (`uvicorn app.main:app --reload --port 8001`), frontend en 5173.
- Todo el código y los textos en español. JSON en camelCase, Python en snake_case.
- El envío de WhatsApp es simulado (`FakeMessagingGateway`) hasta integrar Treble.
