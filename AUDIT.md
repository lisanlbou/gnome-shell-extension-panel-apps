# Auditoría pre-envío EGO — CustomTray (`panel-apps@lisandro.local`)

Guía reproducible para ejecutar la **misma auditoría de 8 fases** que se aplicó
a VRAM-tray, adaptada a la extensión **Panel Apps** (CustomTray).

## Datos clave del proyecto

| Dato | Valor |
| --- | --- |
| Proyecto | `/home/lisandro-dev/Documents/Projects/CustomTray` |
| UUID | `panel-apps@lisandro.local` |
| Schema | `org.gnome.shell.extensions.panel-apps` |
| Shell declarado | `["50"]` (probado en 50.5) |
| Archivos de la extensión | `extension.js`, `prefs.js`, `panelApps.js`, `appCatalog.js`, `settings.js`, `stylesheet.css`, `schemas/`, `LICENSE`, `README.md` |
| Tests | `gjs -m tests/run-tests.js` (esperado: ~25 pruebas) |
| Build | `./build.sh` (usa `gnome-extensions pack` con `--extra-source`) |
| Entorno | Fedora 44 · GNOME Shell 50.5 · GJS 1.88.1 · Wayland |

> ⚠️ Al inicio el repo tiene cambios sin commitear (`M INSTALL.md`, `?? build.sh`)
> y ya existe un `panel-apps@lisandro.local.shell-extension.zip`. Regístralo en la
> línea base y no lo borres del historial.

---

## Fase 1 — Línea base

```bash
cd /home/lisandro-dev/Documents/Projects/CustomTray

# Estructura completa
find . -not -path './.git/*' -not -name '.git' | sort

# Estado de git y commit actual
git status
git log --oneline -20
git rev-parse HEAD

# Versiones del entorno
gjs --version
gnome-shell --version
glib-compile-schemas --version

# Ejecutar los tests SIN modificar nada
gjs -m tests/run-tests.js

# Estado instalado
gnome-extensions info panel-apps@lisandro.local
```

**Registrar:** estructura, commit actual, versiones, artefactos (zip, `schemas/gschemas.compiled`),
resultado de los tests (incluido cualquier fallo) → crear `audit/01-baseline.md`.

> No cambiar el UUID durante la auditoría.

---

## Fase 2 — ego-lint (GNOME Extension Reviewer)

```bash
# Clonar FUERA del repo (no copiar nada dentro de CustomTray)
git clone https://github.com/ZviBaratz/gnome-extension-reviewer.git /tmp/gnome-extension-reviewer

# Ver la sintaxis actual de comandos
/tmp/gnome-extension-reviewer/ego-lint --help

# Registrar el commit del validador (reproducibilidad)
cd /tmp/gnome-extension-reviewer && git rev-parse HEAD

# Ejecutar sobre el árbol fuente
cd /home/lisandro-dev/Documents/Projects/CustomTray
/tmp/gnome-extension-reviewer/ego-lint panel-apps@lisandro.local --show all \
  > audit/ego-lint-output.txt 2>&1; echo "EXIT=$?"
```

**Clasificar cada hallazgo:** FAIL (posible rechazo) / WARN (evaluar a mano) /
PASS / SKIP. Para cada FAIL o WARN: regla, archivo+línea, explicación,
severidad, ¿defecto real o falso positivo?, corrección propuesta, riesgo de
regresión. **No cambiar código solo para satisfacer una regla.**

Crear `audit/02-ego-lint.md` y guardar `audit/ego-lint-output.txt`.

---

## Fase 3 — Cumplimiento GNOME

Leer la documentación oficial:
- https://gjs.guide/extensions/review-guidelines/review-guidelines.html
- https://gjs.guide/extensions/review-guidelines/best-practices.html

Revisar al menos:

- **Metadata:** JSON válido; UUID válido/único; `shell-version` correcto;
  campos obligatorios (`uuid`, `name`, `description`, `shell-version`, `url`);
  sin claves innecesarias; schema ID y path correctos; estructura de directorio.
- **Imports/API:** ES modules; sin imports obsoletos; imports de Shell solo en
  módulos de runtime; GTK4/libadwaita solo en `prefs.js`; sin APIs inventadas;
  compatibilidad con GNOME 50.
- **Ciclo de vida:** nada creado antes de `enable()`; timers eliminados; señales
  desconectadas; actores destruidos; recursos liberados; sin monitores de
  archivo sin cancelar; callbacks no usan objetos destruidos; sin actividad
  residual tras varios enable/disable.
- **Seguridad:** sin subprocesos innecesarios; sin escalado de privilegios; sin
  escrituras indebidas en disco; sin telemetría/red; sin secretos; sin `eval`;
  manejo correcto de nombres externos y contenido de archivos (`.desktop`).
- **Preferencias:** GSettings nativo; schema consistente; defaults correctos;
  widgets válidos; sin fugas al cerrar preferencias.

Crear `audit/03-gnome-compliance.md`.

---

## Fase 4 — Calidad de código generado por IA

Revisar **todos** los módulos JS, no solo el entrypoint:
`extension.js`, `prefs.js`, `panelApps.js`, `appCatalog.js`, `settings.js`.

Buscar: programación defensiva excesiva, `try/catch` innecesarios, handlers
vacíos, comprobaciones de estado imposibles, código repetido, wrappers triviales,
capas de abstracción innecesarias, imports sin usar, funciones muertas, gestión
de estado demasiado compleja, nombres/formato inconsistentes, comentarios
engañosos o estilo "instrucción de LLM" (p. ej. `// XXX_INSERT`), APIs
alucinadas, código muerto, funciones demasiado largas, código de compatibilidad
innecesario, limpieza de recursos duplicada.

Por cada simplificación propuesta: archivo+función exacta, por qué sobra,
equivalencia de comportamiento, posibles regresiones, tests necesarios.

- **No** optimizar solo por reducir líneas.
- **No** quitar manejo de errores legítimo para hardware/interfaces poco fiables.
- Mantener separados los módulos si eso mejora la claridad.

Crear `audit/04-ai-code-quality.md`.

---

## Fase 5 — Pruebas funcionales y de ciclo de vida (en vivo)

Si hay sesión GNOME gráfica (Wayland), probar en el escritorio real. Si no, marcar
claramente **NOT RUN** (no simular y decir que pasó).

### Funcionalidad
- Activar/desactivar apps fijadas y verlas aparecer/desaparecer en el panel.
- Lanzar y enfocar una app al hacer clic.
- Reordenar apps (Move Up / Move Down).
- Cambiar panel (izquierda/centro/derecha) y posición.
- Cambiar tamaño de icono, punto de "app en ejecución", máximo de apps visibles.
- Persistencia de ajustes (guardar y verificar tras reabrir preferencias).

### Ciclo de vida (automatizable)
```bash
S=org.gnome.shell.extensions.panel-apps

# 1) 20 ciclos enable/disable (en tandas de 10 por el timeout del shell)
for i in $(seq 1 10); do
  gnome-extensions disable panel-apps@lisandro.local
  gnome-extensions enable  panel-apps@lisandro.local
done
# (repetir para llegar a 20)

# 2) Mover el icono en el panel
gsettings set $S panel-box 'center'
gsettings set $S panel-box 'left'
gsettings set $S panel-box 'right'

# 3) Cambiar ajustes y ver que se actualizan
gsettings set $S icon-size 24
gsettings set $S icon-size 18

# 4) Vigilar errores y "Extension point conflict"
journalctl --user -o cat | grep -i 'panel-apps\|extension point conflict'
```

**Comprobar:** timers huérfanos, fugas de señales, callbacks duplicados, actores
que se acumulan, logs excesivos, crashes, excepciones no controladas.

### No automatizable en Wayland (marcar NOT RUN / manual)
- Abrir/cerrar el menú (necesita clic real).
- Suspender/reanudar (no se puede auto-reanudar).

Crear `audit/05-runtime-tests.md`.

---

## Fase 6 — Rendimiento

Evaluar: frecuencia de muestreo (¿hay polling?), sobrecarga de CPU, crecimiento
de memoria, escaneos de disco innecesarios (lectura de `.desktop`), operaciones
bloqueantes, reconstrucción repetida de la UI, asignaciones excesivas, frecuencia
de logging.

Medir donde sea posible y **distinguir mediciones de observaciones estáticas**.
No proponer complejidad extra sin beneficio demostrado.

Crear `audit/06-performance.md`.

---

## Fase 7 — Validación del paquete

```bash
cd /home/lisandro-dev/Documents/Projects/CustomTray

# Construir con el proceso existente (NO sobrescribe la extensión instalada)
./build.sh

# Ver el contenido del zip
unzip -l panel-apps@lisandro.local.shell-extension.zip

# Extraer a una carpeta CON EL MISMO NOMBRE que el UUID y validar
rm -rf /tmp/panel-apps@lisandro.local
mkdir -p /tmp/panel-apps@lisandro.local
unzip -q panel-apps@lisandro.local.shell-extension.zip -d /tmp/panel-apps@lisandro.local
/tmp/gnome-extension-reviewer/ego-lint /tmp/panel-apps@lisandro.local --show all
```

**Comprobar:** archivos obligatorios presentes; metadata coincide; schema válido;
imports resuelven; sin `.git`; sin tests; sin informes de auditoría; sin
dependencias de desarrollo; sin cachés/temporales; sin scripts ajenos; licencia
compatible (GPL); sin datos sensibles. No subir nada a extensions.gnome.org.

Crear `audit/07-package.md`.

---

## Fase 8 — Informe final

Crear `audit/FINAL-REPORT.md` con:

- **Resumen ejecutivo:** GO / CONDITIONAL GO / NO-GO + seguridad, cumplimiento,
  fiabilidad funcional, mantenibilidad.
- **Tabla de hallazgos:** ID, severidad, archivo+línea, evidencia, por qué
  importa, corrección, probabilidad de rechazo.
- **Cobertura:** PASS / FAIL / WARNING / NOT RUN / NOT APPLICABLE.
- **Plan de remediación:** (1) arreglar antes de enviar, (2) recomendado,
  (3) opcional.
- **Recomendación final:** ¿ego-lint pasó? ¿se cumplen las guías? ¿pasaron las
  pruebas en vivo? ¿pasó el paquete? ¿qué queda sin verificar?

No afirmar nunca que EGO aprobará la extensión.

---

## Problemas esperados (detectados de antemano)

| Hallazgo | Dónde | Acción |
| --- | --- | --- |
| Falta `url` (bloqueante para EGO) | `metadata.json` | Añadir `"url": "..."` (real o placeholder `https://example.com/...`) |
| `original-authors` (no estándar) | `metadata.json` | Renombrar a `original-author` o eliminar |
| `GTypeName` faltante en widgets propios | `panelApps.js` u otro | Añadir `GTypeName` único |
| Posible código muerto / wrappers triviales | `settings.js`, `appCatalog.js` | Revisar en Fase 4 |
| `log()` vs `console.debug()` | varios | Opcional |
| `Main.panel` / `GLib.file_get_contents` | según codebase | Verificar si son falsos positivos |

## Resumen rápido (orden de ejecución)

```bash
cd /home/lisandro-dev/Documents/Projects/CustomTray
mkdir -p audit

# 1) tests
gjs -m tests/run-tests.js

# 2) ego-lint (clonar primero si no existe)
/tmp/gnome-extension-reviewer/ego-lint panel-apps@lisandro.local --show all | tee audit/ego-lint-output.txt

# 3) build + paquete
./build.sh

# 4) lint del paquete extraído
unzip -q panel-apps@lisandro.local.shell-extension.zip -d /tmp/panel-apps@lisandro.local
/tmp/gnome-extension-reviewer/ego-lint /tmp/panel-apps@lisandro.local --show all | tee audit/ego-lint-output-package.txt
```

Los informes (`01-baseline.md` … `FINAL-REPORT.md`) se escriben en `audit/`.

