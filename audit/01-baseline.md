# Fase 1 — Línea base

Fecha: 2026-10-22 · Entorno: Fedora 44 · GNOME Shell 50.5 · GJS 1.88.1 · Wayland

## Datos del proyecto

| Dato | Valor |
| --- | --- |
| Proyecto | `/home/lisandro-dev/Documents/Projects/CustomTray` |
| UUID | `panel-apps@lisandro.local` |
| Schema | `org.gnome.shell.extensions.panel-apps` |
| `shell-version` | `["50"]` (probado en 50.5) |

> Nota estructural: el `AUDIT.md` describe los archivos como si estuvieran en la
> raíz del proyecto, pero en realidad viven dentro del subdirectorio con nombre
> del UUID (`panel-apps@lisandro.local/`). La extensión está instalada por
> **symlink** desde ese subdirectorio.

## Estructura del árbol (sin `.git`)

```
./AUDIT.md
./build.sh                      (sin commitear, untracked)
./.gitignore
./gnome-panel-apps-plan.md
./INSTALL.md                    (modificado, sin commitear)
./panel-apps@lisandro.local/
    appCatalog.js
    extension.js
    LICENSE
    metadata.json
    panelApps.js
    prefs.js
    README.md
    schemas/
        gschemas.compiled       (ignorado por .gitignore)
        org.gnome.shell.extensions.panel-apps.gschema.xml
    settings.js
    stylesheet.css
./panel-apps@lisandro.local.shell-extension.zip   (artefacto, ignorado)
./tests/run-tests.js
```

## Estado de git

- Rama: `main`
- Commit actual (HEAD): `0b05a594d74b24dc380d7df7cea205d2f8c01263`
  "Remove panel menu button and overflow; show only pinned app icons"
- Historial (2 commits):
  - `0b05a59` Remove panel menu button and overflow; show only pinned app icons
  - `811e7e6` Baseline before removing panel menu button
- Cambios sin commitear: `M INSTALL.md`, `?? build.sh`, `?? AUDIT.md`

## Versiones del entorno

| Herramienta | Versión |
| --- | --- |
| gjs | 1.88.1 |
| gnome-shell | 50.5 |
| glib-compile-schemas | 2.88.3 |
| gnome-extensions | 50.5 |

## Artefactos presentes

- `panel-apps@lisandro.local.shell-extension.zip` — zip ya existente (no borrado).
- `panel-apps@lisandro.local/schemas/gschemas.compiled` — schema compilado (ignorado en git).

## Tests (sin modificar nada)

`gjs -m tests/run-tests.js` → **25 passed, 0 failed** (exit 0).

## Estado instalado

```
panel-apps@lisandro.local
  Name: Panel Apps
  Path: /home/lisandro-dev/.local/share/gnome-shell/extensions/panel-apps@lisandro.local  (symlink → proyecto)
  Version: 0.1.0
  Enabled: Yes
  State: ACTIVE
```

## Notas de línea base

1. **Shell actual sin errores:** el proceso `gnome-shell` actual es PID 7021,
   iniciado el 21-10 15:55 (posterior a los cambios). No registra errores de
   `panel-apps` en el journal.
2. **Error histórico (ya resuelto):** en el journal existe un error del
   21-10 13:14 (`GSettings key max-visible-apps not found`) generado por el
   shell anterior (PID 507584) que aún ejecutaba módulos cacheados con la
   versión vieja del código. Tras reiniciar el shell el 21-10 15:55, ese
   código (y su clave de schema) ya no existe. **No es un defecto actual.**
3. **Ajustes actuales preservados:** `pinned-apps` (3 apps), `panel-box=right`,
   `panel-position=1`, `icon-size=18`, `show-running-indicator=true`.
4. No se cambió el UUID durante la auditoría.
