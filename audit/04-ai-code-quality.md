# Fase 4 — Calidad de código generado por IA

Módulos revisados: `extension.js`, `prefs.js`, `panelApps.js`, `appCatalog.js`,
`settings.js` (más `stylesheet.css`).

## Valoración general

Código limpio, modular y con separación de responsabilidades correcta
(`extension.js` lifecycle, `appCatalog.js` registry, `panelApps.js` UI,
`settings.js` lógica pura, `prefs.js` preferencias). Sin "AI slop" (no hay
comentarios tipo `// XXX_INSERT`, ni scaffolds, ni wrappers triviales, ni
`try/catch` vacíos, ni comprobaciones de estado imposibles). ego-lint confirma:
`comment-prompt-density` limpio, `code-provenance` "hand-written indicators",
`try-catch-density` aceptable (4/52), `impossible-state` limpio, `empty-catch`
limpio.

## Hallazgos y simplificaciones propuestas

### Q1 — CSS muerto: `.panel-apps-menu-button` — **RESUELTO**

- **Ubicación:** `stylesheet.css` (regla eliminada).
- **Por qué sobraba:** tras eliminar el botón de menú/overflow (commit `0b05a59`),
  la clase `panel-apps-menu-button` ya no se asignaba a ningún widget. Las clases
  usadas son `panel-apps-indicator`, `panel-apps-app-button` y
  `panel-apps-running-dot`.
- **Acción aplicada:** regla eliminada. Sin regresión (no tenía consumidores).

### Q2 — Método muerto: `AppCatalog.getInstalledApps()` — **RESUELTO**

- **Ubicación:** `appCatalog.js` (método eliminado).
- **Por qué sobraba:** no se invocaba en ningún punto. `panelApps.js` usa
  `lookupApp()` + `isEligible()`; `prefs.js` usa `Gio.AppInfo.get_all()`
  directamente.
- **Acción aplicada:** método eliminado. Sin regresión (sin consumidores).

### Q3 — `try/catch` defensivo mal ubicado en `prefs.js::_loadApps`

- **Ubicación:** `prefs.js:50-54`.
- **Análisis:** el `try { info.get_id(); } catch (e) { continue; }` pretende
  "capturar codificaciones inválidas", pero `Gio.AppInfo.get_id()` devuelve el
  desktop-ID derivado del *nombre de archivo*, no texto localizado, por lo que
  es poco probable que lance por codificación. Las llamadas que sí pueden lanzar
  por cadenas no-UTF-8 (`get_name()`, `get_icon()`, `get_description()`) quedan
  **fuera** del `try` (líneas 58-60).
- **Severidad:** baja. En Fedora los `.desktop` son UTF-8 y no se dispara.
- **¿Defecto real?** Parcial: la defensa está puesta en el método equivocado.
  No produce regresión observable hoy, pero no protege contra el caso que
  dice proteger.
- **Corrección propuesta (opcional):** envolver `get_name()`/`get_icon()` (o
  todo el `push`) en el `try`, o documentar que `get_id()` es la validación de
  "app info válida" y no de codificación.
- **Riesgo de regresión:** bajo. Requiere re-test de preferencias.
- **Decisión:** no bloqueante; se puede dejar como está o ajustar el comentario.

## Cosas que están bien (no tocar)

- **`settings.js`** — módulo puro sin imports de UI, cargado por shell, prefs y
  tests. `clamp`/`normalizePanelBox`/`normalizeIconSize`/`normalizePanelPosition`/
  `dedupeDesktopIds`/`moveItem` son concisos y bien testados (25 checks).
- **`extension.js`** — entrypoint mínimo (47 líneas); `enable()`/`disable()`
  adyacentes; `_recreate()` para cambios de ubicación.
- **`panelApps.js`** — `AppButton` y `PanelApps` con responsabilidad clara;
  limpieza correcta; `_connections` centraliza la desconexión.
- **`appCatalog.js`** — encapsula `Shell.AppSystem` y `ParentalControlsManager`
  con una semántica documentada (`isEligible` replica el filtro de Show Apps).
- **`prefs.js`** — escapa texto externo, gestiona el `AppInfoMonitor`, ordena
  y busca de forma eficiente.

## Conclusión de Fase 4

Calidad alta. Los dos elementos muertos (Q1 CSS, Q2 método) se han eliminado.
Queda Q3 (defensa mal ubicada en `_loadApps`) como mejora opcional, no
bloqueante.
