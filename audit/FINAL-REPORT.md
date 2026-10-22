# Fase 8 — Informe final de auditoría

Proyecto: **Panel Apps** (`panel-apps@lisandro.local`) · Fecha: 2026-10-22
Validador ego-lint: commit `158f59d`
Estado: **hallazgos bloqueantes y recomendados resueltos** (F1/W1/W2/P1/Q1/Q2).

## Resumen ejecutivo

**Veredicto: CONDITIONAL GO** — único pendiente real: sustituir el placeholder de
`url` por la URL real del repositorio.

| Eje | Valoración |
| --- | --- |
| Seguridad | ✅ Sin red, subprocesos, pkexec, escrituras en disco, telemetría, `eval` ni secretos |
| Cumplimiento | ✅ `url` presente (placeholder), `original-author` estándar, `GTypeName` en ambos widgets |
| Fiabilidad funcional | ✅ Ciclo de vida 20× enable/disable sin errores; tests 25/25; schema strict |
| Mantenibilidad | ✅ Código modular y limpio; código muerto (CSS + método) eliminado |

## Tabla de hallazgos (estado actual)

| ID | Estado | Severidad | Ubicación | Corrección aplicada |
| --- | --- | --- | --- | --- |
| F1 | ✅ FIXED | Bloqueante | `metadata.json` | Añadido `"url"` placeholder (sustituir por URL real) |
| W1 | ✅ FIXED | Media | `metadata.json` | `original-authors` → `original-author` |
| W2 | ✅ FIXED | Media | `panelApps.js` | `GTypeName` en `AppButton` y `PanelApps` |
| P1 | ✅ FIXED | Media | `build.sh` | `--extra-source=LICENSE` |
| Q1 | ✅ FIXED | Baja | `stylesheet.css` | `.panel-apps-menu-button` eliminado |
| Q2 | ✅ FIXED | Baja | `appCatalog.js` | `getInstalledApps()` eliminado |
| W3 | ⏳ OPEN (no bloqueante) | Baja | `panelApps.js:84` | `Main.panel` — documentar/justificar |
| W4 | ⏳ OPEN (cosmético) | Cosmética | `panelApps.js` | `GLib.Source.remove` |
| W5 | Falso positivo | — | `panelApps.js` | `_onDestroy` (patrón GNOME) |
| W6 | Falso positivo | — | `panelApps.js` | signal-balance (`_connections`) |
| W7 | ⏳ OPEN (menor) | Mínima | `extension.js:27` | anular referencia en `_recreate()` |
| W8 | Falso positivo | — | `prefs.js` | `Gtk.ListBox` |
| W9 | ⏳ OPEN (real) | Baja | `metadata.json` | placeholder `url` → URL real |
| Q3 | ⏳ OPEN (opcional) | Baja | `prefs.js:50-54` | try/catch mal ubicado |

## Cobertura

| Área | Resultado |
| --- | --- |
| ego-lint árbol | PASS — 0 FAIL / 8 WARN / 213 PASS / 10 SKIP |
| ego-lint paquete | PASS — 0 FAIL / 8 WARN / 213 PASS / 10 SKIP |
| Tests unitarios | PASS — 25/25 |
| Ciclo de vida en vivo | PASS — 20 ciclos, sin errores |
| Funcionalidad de clic/visual | NOT RUN (manual) |
| Menú / suspender-reanudar | NOT RUN (manual) |
| Rendimiento (memoria/CPU finos) | NOT MEASURED (observaciones estáticas PASS) |
| Polkit / eslint / R-WEB | NOT APPLICABLE |

## Plan de remediación (restante)

**1) Antes de enviar (obligatorio)**
- W9: sustituir el placeholder `https://example.com/panel-apps` por la URL real
  del repositorio de código fuente.

**2) Recomendado**
- W3: documentar el uso de `Main.panel.menuManager` y fijar la versión de shell.

**3) Opcional**
- W4: `GLib.Source.remove`.
- W7: anular referencia en `_recreate()`.
- Q3: reubicar el try/catch de `_loadApps`.

## Recomendación final

- **ego-lint:** ✅ pasa (0 FAIL; veredicto "MAY PASS WITH COMMENTS").
- **Guías oficiales:** ✅ se cumplen en lo verificado (metadata, imports,
  lifecycle, seguridad, preferencias).
- **Pruebas en vivo:** ✅ ciclo de vida OK (20 ciclos). Clic/visual/menú/suspender
  pendientes de verificación interactiva humana.
- **Paquete:** ✅ funcional, con `LICENSE` incluida y sin FAIL.
- **Queda sin verificar:** comportamiento visual/click, menú contextual,
  suspender/reanudar, HiDPI, y coexistencia con AppIndicator.

> **No se afirma que EGO vaya a aprobar la extensión.** La revisión final la
> realiza un revisor humano de extensions.gnome.org. Lo único que impide
> declarar "GO" es sustituir el placeholder de `url` por la URL real y completar
> la verificación interactiva humana.
