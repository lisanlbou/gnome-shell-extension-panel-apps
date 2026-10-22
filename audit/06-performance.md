# Fase 6 — Rendimiento

## Observaciones estáticas (análisis de código)

| Aspecto | Observación | Verdict |
| --- | --- | --- |
| Frecuencia de muestreo (polling) | No hay polling. La extensión es **event-driven**: reacciona a señales (`changed::*`, `installed-changed`, `app-state-changed`, `app-filter-changed`). | PASS |
| Timers | Un único `GLib.timeout_add` de 250 ms como *debounce* de reconstrucción ante cambios de apps instaladas/filtro. No es periódico: se dispara solo ante eventos y se elimina en `_onDestroy`. | PASS |
| Escaneos de disco | No se leen `.desktop` manualmente. `appCatalog.js` usa `Shell.AppSystem` (registry en memoria); `prefs.js` usa `Gio.AppInfo.get_all()` una sola vez por ventana de prefs. | PASS |
| Operaciones bloqueantes en shell | `_rebuild()` itera solo los IDs anclados (pocos) y `lookup_app()` es O(1) sobre el registry. Sin E/S síncrona en el proceso shell. | PASS |
| Reconstrucción repetida de UI | `_rebuild()` destruye los botones previos (`remove_child` + `destroy`) antes de crear los nuevos. Rebuilds debounced (250 ms). | PASS |
| Asignaciones excesivas | Menores: `_pinnedIds()` usa `Set` para dedupe; `moveItem`/`dedupeDesktopIds` crean arrays nuevos solo al cambiar el orden. | PASS |
| Frecuencia de logging | 0 `console.*`; solo `logError()` en rutas excepcionales (fallo de activación). ego-lint: `debug-volume 0`, `logging-volume 0`. | PASS |
| CSS | 25 líneas, reglas acotadas, sin `!important`, sin sobreescritura del tema. | PASS |

## Mediciones

- **RSS del proceso shell (muestra única):** 460 MB (PID 7021, ~20 h de uptime).
  Es el proceso completo de GNOME Shell (no solo esta extensión); no es
  comparable ni atribuible a la extensión sin un baseline y varias muestras.
  **No se establece un veredicto de memoria** a partir de una única muestra.
- **CPU:** no se midió. La ausencia de timers periódicos y de polling implica
  que la extensión no consume CPU en reposo; se marca como observación, no
  medición.

## Conclusión de Fase 6

Diseño eficiente y sin costes ocultos (sin polling, sin E/S, sin logging). No
se propone complejidad adicional: no hay beneficio demostrado para añadir
cachés o instrumentación. Las métricas finas de memoria/CPU requerirían un
profiler y no aportan valor para el envío dado el diseño actual.
