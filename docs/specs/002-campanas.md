# 002 · Campañas

- **Estado:** Implementada (envío simulado)
- **Última actualización:** 2026-10-30

## Objetivo
Enviar mensajes masivos de WhatsApp a la cartera de Postventa con plantillas aprobadas,
con un flujo de aprobación por una segunda persona.

## Alcance
- Asistente en 6 pasos: información → cartera → validación → mensaje → programación → confirmación.
- Carga de cartera Excel/CSV, validación de registros y descarga de errores en CSV.
- Flujo de aprobación, programación, envío por lotes, pausa, reanudación y cancelación.

## Fuera de alcance
- Envío real (hoy `FakeMessagingGateway`); estados entregado/leído (webhook de Treble).
- Mensajes libres: solo plantillas. Las respuestas de clientes van a Atención humana (pendiente).
- Reintentos automáticos de envíos fallidos.

## Reglas de negocio

**Estados**

```
BORRADOR → PENDIENTE_APROBACION → PROGRAMADA → EN_EJECUCION → COMPLETADA
                 │ (rechazo)                       ↕ PAUSADA
                 └──→ BORRADOR          cualquiera activa → CANCELADA
```

- Solo se edita en `BORRADOR`.
- Para enviar a aprobación: ≥ 1 destinatario válido, plantilla con todas sus variables mapeadas y programación definida.
- **Quien preparó la campaña no puede aprobarla** (`PERMITIR_AUTOAPROBACION=false`).
- Fecha programada: al menos 5 minutos en el futuro y con zona horaria. Si al aprobar ya pasó → no se aprueba.
- Cancelar marca los pendientes como `CANCELADO`.
- Rechazar exige motivo y regresa a `BORRADOR`.

**Cartera**
- Formatos `.xlsx`, `.xls`, `.csv` (coma o punto y coma, UTF-8 o Latin-1). Máx. 10 MB y 50 000 filas.
- Columnas obligatorias (con alias): `id_cliente`, `nombre`, `telefono`. Todas las columnas se guardan para usarse como variables.
- Teléfono normalizado a 10 dígitos (acepta `+52`, `521`, espacios, guiones, paréntesis). Duplicados → error.
- Registros con error se excluyen del envío.

**Envío**
- Scheduler (APScheduler) dentro del backend cada `INTERVALO_SCHEDULER_SEGUNDOS` (30 s) con lotes de `LOTE_ENVIO` (50).
- Cada lote es una transacción. Cada intento guarda `estado_envio`, `error_envio` y `enviado_en`.

## Permisos
Ver: `CAMPANA_VER` · Crear/editar/enviar a aprobación: `CAMPANA_CREAR` · Aprobar/rechazar: `CAMPANA_APROBAR` ·
Pausar/reanudar/cancelar: `CAMPANA_CREAR` o `CAMPANA_APROBAR`.

## Restricciones y limitaciones
- **El envío es simulado**: no sale ningún mensaje real y ~2 % se marca fallido al azar.
- El scheduler supone **una sola instancia** del backend. Con varias réplicas hay que agregar un candado
  (por ejemplo, advisory lock de PostgreSQL) o dejar `SCHEDULER_ACTIVO=true` solo en una.
- Volver a cargar la cartera reemplaza todos los destinatarios de la campaña.
- Formato real de la cartera, quién aprueba y plantillas reales de Treble: **pendientes de confirmar con el negocio**.

## Decisiones
- Estados como texto (`VARCHAR`) y no `ENUM` de PostgreSQL, para migrar sin dolor.
- Las columnas de la cartera se guardan completas en `destinatario.datos` (JSONB) para no fijar el formato.
- El backend calcula qué acciones puede hacer el usuario (`acciones`) y el frontend solo pinta botones.
- WhatsApp detrás de la interfaz `MessagingGateway` para cambiar a Treble sin tocar el resto.

## Archivos
- Backend: `app/campanas/` (modelos, esquemas, servicio, router, cartera, validador, telefono, plantillas, envio), `app/integracion/gateway.py`
- Frontend: `src/features/campanas/`, `src/api/campanas.ts`, `src/components/EstadoBadge.tsx`
- Pruebas: `tests/test_campanas.py`, `tests/test_cartera.py`, `tests/test_telefono.py`
- Datos de prueba: `docs/cartera_prueba.csv` (4 válidos, 5 con error)

## Plan y tareas

**Fase 1 — campañas con envío simulado** (terminada)
- [x] Modelos `campana`, `destinatario`, `plantilla` y máquina de estados
- [x] Lectura de cartera Excel/CSV, normalización de teléfonos y validación
- [x] Asistente de 6 pasos en el frontend
- [x] Aprobación por segunda persona, rechazo, pausa, reanudación y cancelación
- [x] Scheduler por lotes con `FakeMessagingGateway`
- [x] Exportar errores a CSV
- [x] Pruebas (`test_campanas.py`, `test_cartera.py`, `test_telefono.py`)
- [x] Guardar `enviado_en` por intento (migración 0002, spec 004)

**Pendientes / bloqueados**
- [ ] Confirmar formato real de la cartera — *bloqueado por: negocio*
- [ ] Confirmar quién aprueba y si se permite autoaprobación — *bloqueado por: negocio*
- [ ] `TrebleMessagingGateway` — *bloqueado por: acceso a la API de Treble* (spec propia)
- [ ] Webhook de estados entregado/leído — *bloqueado por: Treble*
- [ ] Candado para varias réplicas del scheduler — *cuando se despliegue con más de una instancia*

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
| 2026-10-30 | Spec escrita a partir del código existente (fase 1) | Equipo |
| 2026-10-30 | Nueva columna `destinatario.enviado_en` (migración 0002), ver spec 004 | Equipo |
