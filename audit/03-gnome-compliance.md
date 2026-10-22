# Fase 3 — Cumplimiento GNOME

Fuentes consultadas:
- https://gjs.guide/extensions/review-guidelines/review-guidelines.html
- https://gjs.guide/extensions/review-guidelines/best-practices.html
- https://gjs.guide/extensions/overview/anatomy.html
- Fuente GNOME Shell 50 (`js/ui/panelMenu.js`, `js/ui/popupMenu.js`) para verificar
  APIs reales.

## 1. Metadata

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| JSON válido | PASS | `metadata/valid-json` |
| UUID válido/único, con `@`, sin `gnome.org` | PASS | `panel-apps@lisandro.local` |
| UUID coincide con el directorio | PASS | dir `panel-apps@lisandro.local` |
| `shell-version` array y correcto | PASS | `["50"]`, probado en 50.5 |
| Campos obligatorios `uuid`, `name`, `description`, `shell-version` | PASS | presentes |
| `url` obligatorio | PASS | presente (placeholder `https://example.com/panel-apps`; sustituir por la URL real) |
| Sin claves innecesarias | PASS | `original-author` (campo estándar) |
| `settings-schema` correcto | PASS | `org.gnome.shell.extensions.panel-apps` |
| Schema id/path correctos | PASS | id `org.gnome.shell.extensions.panel-apps`, path `/org/gnome/shell/extensions/panel-apps/` |

## 2. Imports / API

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| ES modules (sin `imports.*` legados) | PASS | `import {…} from 'gi://…'` y `resource:///…` |
| Sin imports obsoletos | PASS | ego-lint `no-deprecated-modules`, `R-DEPR-*` limpios |
| Shell/St/Meta solo en runtime | PASS | `panelApps.js`/`appCatalog.js`; `imports/segregation` limpio |
| GTK4/libadwaita solo en `prefs.js` | PASS | `prefs.js` usa `gi://Gtk?version=4.0`, `gi://Adw` |
| Sin APIs inventadas | PASS | `_clickGesture`, `PopupMenu.toggle()`, `addToStatusArea()`, `Shell.AppSystem`, `ParentalControlsManager.getDefault()` verificados contra la fuente de GNOME 50 |
| Compatibilidad GNOME 50 | PASS | extensión ACTIVE en 50.5, sin errores |

**Verificación específica del API (fuente GNOME 50):**

- `PanelMenu.Button` extiende `ButtonBox`, que en su `_init` hace
  `this.connect('destroy', this._onDestroy.bind(this))`. Por herencia, el
  `_onDestroy()` de `PanelApps` **sí** se invoca al llamar `.destroy()`.
- `this._clickGesture` existe en `PanelMenu.Button` y `set_enabled(false)` es
  válido (se usa para desactivar el menú vacío).
- `Main.panel.menuManager.addMenu()` existe (API no pública, ver W3 en Fase 2).

## 3. Ciclo de vida

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| Nada creado antes de `enable()` | PASS | solo imports/constantes en scope de módulo; sin efectos laterales |
| Timers eliminados | PASS | `_debounceRebuild` guarda el id y lo elimina en `_onDestroy`; `lifecycle/untracked-timeout` limpio |
| Señales desconectadas | PASS | `_connections` (6) desconectadas en `_onDestroy`; `_placementIds` (2) en `disable()` |
| Actores destruidos | PASS | botones removidos + `destroy()` en `_rebuild`; menú destruido en `AppButton._onDestroy` |
| Recursos liberados | PASS | `_settings`, `_catalog`, `_panelApps` anulados en `disable()` |
| Sin monitores de archivo | PASS | no se usan `Gio.FileMonitor` |
| Sin actividad residual tras enable/disable | PASS | 20 ciclos en vivo sin errores (Fase 5) |

**Nota:** el WARN `lifecycle/signal-balance` es un falso positivo del conteo
estático. La verificación manual del grafo de conexiones confirma que todas las
conexiones se cierran.

## 4. Seguridad

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| Sin subprocesos | PASS | ego-lint `no-subprocess` |
| Sin escalado de privilegios | PASS | sin polkit/pkexec (`R-SEC-*` limpios) |
| Sin escrituras indebidas en disco | PASS | sin `file-io`; GSettings escribe vía dconf (esperado) |
| Sin telemetría/red | PASS | `no-network` |
| Sin secretos | PASS | no hay credenciales |
| Sin `eval` | PASS | no se usa |
| Manejo de nombres externos | PASS | `prefs.js` escapa títulos/subtítulos con `GLib.markup_escape_text()` |
| Contenido de `.desktop` | PASS | se filtra por `should_show()`/parental controls; IDs externos se tratan como texto |

## 5. Preferencias

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| GSettings nativo | PASS | `this.getSettings()` sin id explícito (id en metadata) |
| Schema consistente | PASS | 5 claves; todas usadas; `glib-compile-schemas --strict` limpio |
| Defaults correctos | PASS | `right`, `0`, `16`, `true`, `[]` |
| Widgets válidos | PASS | `Adw.PreferencesPage/Group/ComboRow/SpinRow/SwitchRow`, `Gtk.ListBox` (boxed-list) |
| Sin fugas al cerrar prefs | PASS | `_cleanup()` desconecta `AppInfoMonitor`; ego-lint `prefs/memory-leak` limpio |
| `fillPreferencesWindow` correcto | PASS | usa `fillPreferencesWindow` (patrón actual), no `getPreferencesWidget` |

## Conclusión de Fase 3

Cumplimiento sólido. Sin incumplimientos bloqueantes: `url` presente
(placeholder pendiente de URL real), `original-author` estándar y `GTypeName`
en ambos widgets. El WARN `lifecycle/signal-balance` sigue siendo falso
positivo (ver Fase 2).
