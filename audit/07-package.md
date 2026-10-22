# Fase 7 — Validación del paquete

## Build

`./build.sh` → **exit 0**. Ejecuta: tests (25/25) → `glib-compile-schemas
--strict` (limpio) → `gnome-extensions pack --force --extra-source=…`.

## Contenido del zip

`panel-apps@lisandro.local.shell-extension.zip` (10 entradas):

```
settings.js
panelApps.js
stylesheet.css
metadata.json
appCatalog.js
LICENSE
prefs.js
schemas/                              (dir)
schemas/org.gnome.shell.extensions.panel-apps.gschema.xml
extension.js
```

## Lint del paquete extraído

`ego-lint /tmp/panel-apps@lisandro.local --show all` → **EXIT=0**
`231 checks — 213 passed, 0 failed, 8 warnings, 10 skipped`
Veredicto: MAY PASS WITH COMMENTS.
Salida: `audit/ego-lint-output-package.txt`.

## Checklist

| Comprobación | Resultado |
| --- | --- |
| Archivos obligatorios (`metadata.json`, `extension.js`) | PASS |
| Metadata coincide (mismo `metadata.json` que el árbol) | PASS |
| Schema válido (strict dry-run) | PASS |
| Imports resuelven | PASS (extensión ACTIVE en vivo) |
| Sin `.git` | PASS |
| Sin tests | PASS (fuera del zip) |
| Sin informes de auditoría | PASS (en `audit/`, fuera del zip) |
| Sin dependencias de desarrollo | PASS |
| Sin cachés/temporales | PASS (sin `gschemas.compiled` en el zip) |
| Sin scripts ajenos | PASS |
| Licencia (GPL) presente en el zip | PASS — `LICENSE` empaquetada (`--extra-source=LICENSE`) |
| Sin datos sensibles | PASS |

## Hallazgo de paquete resuelto

**P1 — `LICENSE` en el zip** — **RESUELTO.** Añadido `--extra-source=LICENSE` en
`build.sh`; el zip ahora incluye la licencia y el validador marca `license` PASS.

## Conclusión de Fase 7

El paquete es funcional y coherente con el árbol, sin FAIL. Único WARN relevante
para el envío: `metadata/url-format` (placeholder de `url` pendiente de la URL
real). No se sube nada a extensions.gnome.org.
