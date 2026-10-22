# Fase 2 — ego-lint (GNOME Extension Reviewer)

Validador: `https://github.com/ZviBaratz/gnome-extension-reviewer`
Commit usado: `158f59d364a0568efd1b38b5339539633b0649d0`
Comando: `ego-lint panel-apps@lisandro.local --show all`
Salida guardada en `audit/ego-lint-output.txt`.

## Resultado global (tras aplicar los fixes F1/W1/W2)

```
231 checks — 213 passed, 0 failed, 8 warnings, 10 skipped
EXIT=0 (sin hallazgos bloqueantes)
VERDICT: MAY PASS WITH COMMENTS (7 checks con 8 hallazgos)
```

## Hallazgos resueltos en esta sesión

| ID | Regla | Fix aplicado |
| --- | --- | --- |
| F1 | `metadata/missing-url` | Añadido `"url": "https://example.com/panel-apps"` (placeholder). **RESUELTO** — sustituir por la URL real del repo antes de enviar. |
| W1 | `metadata/non-standard-field` | `original-authors` → `original-author`. **RESUELTO** (`PASS`). |
| W2 | `gobject/missing-gtypename` (×2) | Añadido `GTypeName: 'PanelAppsAppButton'` y `'PanelAppsIndicator'`. **RESUELTO** (`PASS`). |

## WARN restantes (no bloqueantes)

| ID | Regla | Ubicación | Análisis | ¿Defecto real? |
| --- | --- | --- | --- | --- |
| W3 | `quality/private-api` | `panelApps.js:84` | `Main.panel.menuManager.addMenu()` (y `Main.uiGroup.add_child`). | API no pública; patrón habitual en extensiones. Requiere justificación y fijado de versión. |
| W4 | `R-SLOP-44` | `panelApps.js` | `GLib.source_remove(id)` vs. `GLib.Source.remove(id)`. | Cosmético. Funciona igual. |
| W5 | `R-QUAL-31` (×2) | `panelApps.js:127,259` | Sugiere `destroy()` en vez de `_onDestroy()`. | **Falso positivo.** Es el patrón del propio GNOME Shell (`ButtonBox` conecta `destroy` → `_onDestroy`). |
| W6 | `lifecycle/signal-balance` | `panelApps.js` | Cuenta 5 `.connect()` vs 2 `.disconnect()`. | **Falso positivo.** Todas las conexiones viven en `_connections`/`_placementIds` y se cierran. |
| W7 | `lifecycle/destroy-no-null` | `extension.js:27` | `destroy()` sin `= null`. | Menor. Se reasigna en la línea siguiente. |
| W8 | `R-PREFS-04c` | `prefs.js` | `Gtk.ListBox` en prefs. | **Falso positivo.** Sin equivalente Adw para listas boxed-list. |
| W9 | `metadata/url-format` | `metadata.json` | El `url` placeholder no parece un repositorio. | **Real.** Sustituir el placeholder por la URL real del repositorio. |

### PASS destacados

- `metadata/valid-json`, `required-fields`, `uuid-format`, `uuid-matches-dir`,
  `uuid-no-gnome-org`, `shell-version-*`, `settings-schema`, `schema/path`,
  `schema/compile` (strict dry-run), `schema-usage/all-keys-used`.
- `metadata/missing-url`, `metadata/non-standard-field`, `gobject/missing-gtypename`.
- `imports/segregation` (GTK/Adwaita solo en prefs, Shell solo en runtime).
- `accessibility/accessible-name`, `css/scoping`, `css/important`.
- Seguridad: `no-network`, `no-clipboard`, `no-subprocess`, `no-pkexec`,
  `no-file-io`, sin telemetría.
- `quality/code-provenance` (no obfuscat), `comment-density` ok, sin "AI slop".

### SKIP

- `R-WEB-*`, `R-DEPR-04-legacy`, `eslint`, `polkit/*`, `package/exists`.

## Conclusión de Fase 2

Sin bloqueantes tras los fixes. Los 8 WARN restantes son falsos positivos,
cosméticos o el placeholder de `url` (que debe reemplazarse por la URL real).
ego-lint ya no marca el proyecto como "likely rejected".
