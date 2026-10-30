# Especificaciones (specs)

Cada módulo, tarea o cambio importante del proyecto tiene su spec en esta carpeta. La spec es la
referencia de **qué hace el sistema, qué no hace y por qué**. Si el código y la spec no coinciden,
es un error: se corrige uno de los dos en el mismo cambio.

## Índice

| # | Spec | Estado |
|---|---|---|
| 000 | [Reglas de trabajo](000-reglas-de-trabajo.md) | Vigente |
| 001 | [Base y autenticación](001-base-y-autenticacion.md) | Implementada |
| 002 | [Campañas](002-campanas.md) | Implementada (envío simulado) |
| 003 | [Administración](003-administracion.md) | Implementada |
| 004 | [Monitoreo de campañas](004-monitoreo-campanas.md) | Implementada |

Pendientes sin spec todavía: atención humana, integración con Treble, monitoreo de atención y encuestas.

## Cuándo se escribe o actualiza una spec

- **Módulo o funcionalidad nueva:** spec nueva con el siguiente número libre, *antes o junto con* el código.
- **Cambio importante** en algo que ya existe (regla de negocio, permisos, tablas, endpoints, límites):
  se actualiza la spec del módulo y se agrega una línea en su **bitácora de cambios**.
- **Correcciones menores** (texto, estilos, refactor sin cambio de comportamiento): no hace falta.

Toda spec incluye su **plan y tareas** (checklist). Se escribe antes de programar, se aprueba,
y las tareas se van marcando conforme se terminan. Así cualquiera sabe en qué va cada módulo.

## Plantilla

Copia esto en `NNN-nombre-corto.md`:

```markdown
# NNN · Título

- **Estado:** Propuesta | En curso | Implementada | Obsoleta
- **Responsable:** nombre
- **Última actualización:** AAAA-MM-DD

## Objetivo
Qué problema resuelve y para quién (1–3 líneas).

## Alcance
Qué incluye.

## Fuera de alcance
Qué NO incluye a propósito (y si se hará después, dónde).

## Reglas de negocio
Reglas que el sistema hace cumplir. Cada una debe tener prueba.

## Permisos
Qué permiso pide cada acción.

## Restricciones y limitaciones
Límites técnicos, supuestos, cosas que hoy no funcionan o funcionan a medias.

## Decisiones
Qué se eligió, qué alternativas había y por qué.

## Archivos
Backend, frontend, migraciones y pruebas que componen el módulo.

## Pruebas
Qué se prueba y cómo correrlo.

## Plan y tareas
Pasos en orden para implementarlo. Cada tarea es un checklist que se marca al terminarla;
lo que falta o depende de terceros queda sin marcar con la nota de qué lo bloquea.

**Fase 1 — nombre**
- [ ] Tarea concreta y verificable (archivo o resultado esperado)
- [ ] Pruebas de la fase
- [ ] Actualizar spec y bitácora

**Pendientes / bloqueados**
- [ ] Tarea — *bloqueado por: …*

## Bitácora de cambios
| Fecha | Cambio | Quién |
|---|---|---|
```
