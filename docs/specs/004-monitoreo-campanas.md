# 004 · Monitoreo de campañas

- **Estado:** Implementada
- **Última actualización:** 2026-10-30

## Objetivo
Que supervisores y administradores vean cómo van los envíos de campañas: cuántos salieron,
cuántos fallaron, qué está en cola y por qué fallan.

## Alcance
- Filtros: rango de fechas (por defecto, últimos 30 días) y objetivo de campaña.
- Indicadores: enviados, fallidos (con tasa de fallo), en cola, campañas activas y completadas en el periodo.
- Gráfica de envíos por día (enviados y fallidos apilados) con tooltip.
- Tabla de campañas activas o con envíos en el periodo, con avance.
- Top 5 de errores de cartera y top 5 de motivos de envío fallido.
- Se actualiza sola cada 30 s.

## Fuera de alcance
- **Entregados y leídos:** dependen del webhook de Treble. Hoy la pantalla muestra un aviso en su lugar.
- Indicadores de atención humana y resultados de encuestas (no existen esos datos todavía).
- Exportar a Excel/PDF.

## Reglas de negocio / definiciones
- **Día** = día en hora del centro de México (UTC-6 fijo; México no tiene horario de verano desde 2022).
- **Enviados** = intentos con estado `ENVIADO`, `ENTREGADO` o `LEIDO` cuyo `enviado_en` cae en el periodo.
- **Fallidos** = intentos `FALLIDO` en el periodo. **Tasa de fallo** = fallidos / (enviados + fallidos).
- **En cola** = destinatarios `PENDIENTE` de campañas `PROGRAMADA`, `EN_EJECUCION` o `PAUSADA` (no depende del periodo).
- **Campañas completadas** = `COMPLETADA` con `fecha_fin_envio` en el periodo.
- **Tabla de campañas** = campañas activas ahora + campañas con algún envío en el periodo. Sus conteos son
  **totales de la campaña** (no solo del periodo), para que el avance tenga sentido.
- **Errores de cartera** = registros inválidos de campañas *creadas* en el periodo; "(fila N)" se quita para agrupar.
- Periodo máximo: 366 días. `desde` > `hasta` → 400.
- El filtro de objetivo aplica a todo.

## Permisos
`MONITOREO_VER` (ADMIN y SUPERVISOR por defecto).

## Restricciones y limitaciones
- Mientras el envío sea simulado, los fallos son aleatorios (~2 %) y su motivo es "Simulado: …".
- Los envíos hechos **antes** de la migración 0002 no tenían fecha de envío; la migración les puso la
  fecha de inicio de su campaña (aproximación).
- Las consultas agregan directo sobre `destinatario`; con cientos de miles de registros por periodo
  puede requerir tablas resumen o vistas materializadas.
- La lista de objetivos del filtro es la misma lista fija del asistente de campañas (`OBJETIVOS`).

## Decisiones
- **Nueva columna `destinatario.enviado_en`** (migración `0002`, con índice). `actualizado` no sirve
  porque cambiará cuando lleguen los estados de Treble.
- Agrupación por día en SQL: `timezone('America/Mexico_City', …)` en PostgreSQL y `date(…, '-6 hours')` en SQLite (pruebas).
- Gráfica con barras HTML/CSS, sin librería de gráficas nueva. Colores validados para contraste y
  daltonismo: enviados `#2f5fe0`, fallidos `#e5484d`.
- Solo lectura: el módulo no modifica nada.

## Archivos
- Migración: `backend/alembic/versions/0002_destinatario_enviado_en.py`
- Backend: `app/monitoreo/` (esquemas, servicio, router), `app/campanas/modelos.py` (columna), `app/campanas/envio.py` (llena `enviado_en`), `app/main.py`
- Frontend: `src/features/monitoreo/MonitoreoPage.tsx`, `src/api/monitoreo.ts`, tipos en `src/api/tipos.ts`, ruta en `src/main.tsx`
- Pruebas: `tests/test_monitoreo.py` (pasa en SQLite y PostgreSQL)

## Endpoint
`GET /api/monitoreo/campanas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&objetivo=` → resumen, `porDia`, `campanas`,
`erroresCartera`, `erroresEnvio`, `envioSimulado`.

## Plan y tareas

**Fase 1 — datos** (terminada)
- [x] Columna `destinatario.enviado_en` + índice + llenado de datos viejos (migración 0002)
- [x] `envio.py` guarda `enviado_en` en cada intento

**Fase 2 — backend** (terminada)
- [x] Endpoint `GET /api/monitoreo/campanas` con filtros de fecha y objetivo
- [x] Agrupación por día en hora de México (PostgreSQL y SQLite)
- [x] Pruebas (`test_monitoreo.py`) en SQLite y PostgreSQL

**Fase 3 — frontend** (terminada)
- [x] Indicadores, gráfica por día con tooltip, tabla de campañas, top de errores
- [x] Colores validados (contraste y daltonismo)
- [x] Compila sin errores de TypeScript

**Pendientes / bloqueados**
- [ ] Probar la pantalla a mano con campañas reales de prueba
- [ ] Entregados y leídos — *bloqueado por: webhook de Treble* (el endpoint ya los devuelve, hoy en 0)
- [ ] Monitoreo de atención humana y encuestas — *bloqueado por: módulo de atención* (spec aparte)
- [ ] Tablas resumen si el volumen crece — *cuando haya cientos de miles de envíos por periodo*

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
| 2026-10-30 | Módulo creado, con migración 0002 | Equipo |
