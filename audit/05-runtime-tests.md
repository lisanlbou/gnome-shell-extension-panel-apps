# Fase 5 — Pruebas funcionales y de ciclo de vida (en vivo)

Sesión: Wayland gráfica real (tty2). Shell PID 7021.
Salida cruda: `audit/05-runtime-tests-raw.txt`.

## Ciclo de vida (automatizado) — EJECUTADO

| Prueba | Resultado |
| --- | --- |
| 20 ciclos enable/disable (2×10) | **PASS** — sin errores |
| Estado tras los ciclos | **PASS** — `State: ACTIVE` |
| `gsettings` panel-box left/center/right | **PASS** — aplicado sin error |
| `gsettings` icon-size 24→18 | **PASS** — aplicado sin error |
| `gsettings` show-running-indicator false→true | **PASS** — aplicado sin error |
| Journal (errores / "extension point conflict") | **PASS** — vacío durante las pruebas |
| Ajustes restaurados al final | **PASS** — `right`, `1`, `18`, `true`, 3 apps |

**Comprobaciones de fugas:** sin timers huérfanos, sin callbacks duplicados
(no hay "extension point conflict" en el journal), sin acumulación de actores
(estado ACTIVE estable tras 20 ciclos), sin logs excesivos (0 `console.*`).

## Funcionalidad (no automatizable en esta sesión)

| Prueba | Resultado | Motivo |
| --- | --- | --- |
| Pin/unpin visual en panel | NOT RUN (manual) | requiere clic real en prefs o verificación visual de iconos |
| Lanzar/enfocar app al clic | NOT RUN (manual) | requiere clic real sobre el icono |
| Reordenar (Move Up/Down) visual | NOT RUN (manual) | requiere interacción GUI en prefs (la lógica está testada unitariamente) |
| Cambio visual de panel/posición | NOT RUN (visual) | `gsettings` aplica sin error, pero el resultado visual no se capturó |
| Persistencia tras reabrir prefs | NOT RUN (manual) | requiere abrir la ventana de prefs |
| Abrir/cerrar menú contextual | NOT RUN (manual) | requiere clic derecho real |
| Suspender/reanudar | NOT RUN (manual) | no se puede auto-reanudar |

> Los ajustes de pin/orden/panel se ejercieron vía `gsettings` (lo que dispara
> `changed::*` → `_rebuild()`/`_recreate()`) sin errores, lo que valida la vía
> de persistencia a nivel de schema y la reacción del runtime, pero **no**
> sustituye la verificación visual/interactiva.

## Evidencia

- 20 enable/disable: sin "Extension point conflict" ni stack traces nuevos.
- El error `max-visible-apps` del journal es **histórico** (shell viejo, código
  cacheado) y no reaparece.

## Conclusión de Fase 5

Ciclo de vida robusto (verificado en vivo). La funcionalidad de clic/visual
queda pendiente de una sesión interactiva humana; no se declara como verificada.
