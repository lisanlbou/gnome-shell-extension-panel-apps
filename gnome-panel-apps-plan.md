# GNOME Panel Apps — implementation plan for Cline

## 1. Goal and scope

Build a GNOME Shell extension for Fedora Workstation on Wayland that lets the user select installed graphical applications from a searchable list and pin their icons to the top panel, near the clock/system indicators. The application catalogue must use the desktop application registry that underlies GNOME's Show Applications view.

Interpret the version requirement as **GNOME Shell 50 and later**, including the user's existing 50.5 installation. If strictly greater than 50 was intended, omit 50 only after clarifying that requirement. Start by validating 50, then validate 51 separately. Future major versions require porting checks and testing; do not promise indefinite compatibility.

Working interpretation of “tray”: persistent app launch/focus icons in the top panel. This is an assumption, not an explicit request for native tray protocol support. Implement this MVP first. Do not silently substitute a dock or one menu containing all selected apps.

There are three distinct capabilities:

| Capability | MVP decision |
| --- | --- |
| Pin any discoverable GUI app to the top panel and launch/focus it | Implement |
| Display application-provided tray menus, badges and live status | Separate future integration with StatusNotifierItem/AppIndicator |
| Keep arbitrary apps alive when their close button is clicked | Not part of MVP; cannot be guaranteed for arbitrary applications |

If the user wants minimize/restore on icon clicks, implement that as an explicit follow-up option using Shell/Mutter window APIs. Minimizing is not close-to-tray: applications can still appear in the overview and task switchers, and closing a window can still exit its application.

## 2. User experience

1. Enable extension: show a small configuration/menu button, even when nothing is pinned.
2. Open Preferences → Applications.
3. Search installed applications by localized display name or desktop ID.
4. Each row contains the app icon, display name, desktop ID and selection switch.
5. Selected applications appear as individual icons in a compact horizontal group in the top panel.
6. Clicking an icon launches its app when necessary, or activates an existing window through GNOME's normal application activation behavior. Do not intentionally spawn another instance on each click.
7. Right-click an icon: offer Open New Window only when supported, Unpin, and Preferences. Do not invent native app-specific tray menus.
8. Show a subtle running indicator and a tooltip/accessibility label with the app name.
9. Reorder selected apps with Move Up/Move Down buttons in Preferences. Drag-and-drop can follow later.
10. Preferences changes apply immediately and persist after logout/reboot.

Default placement: right panel box, with an adjustable position inside that box. Also allow left and center placement. “Near the clock” means insertion in the panel; do not reparent or modify the clock. Exact adjacency can vary with other extensions.

Bound the row: default maximum of eight visible app icons, with the remainder in an overflow menu. Allow a reasonable configurable maximum. Verify narrow panels and large text settings.

## 3. Technology and architecture

Use modern JavaScript ES modules and GJS. No Node.js runtime, Electron, Python daemon or native helper is needed for the extension.

| Component | Responsibility |
| --- | --- |
| `extension.js` | Extension lifecycle and coordination |
| `appCatalog.js` | Shell-side registry lookup, filtering and change monitoring |
| `panelApps.js` | Panel container, icon buttons, menus, running state and overflow |
| `prefs.js` | GTK4/libadwaita preferences entry point and application picker |
| `settings.js` | Pure helpers for desktop IDs, ordering and defaults; no Shell/GTK imports |
| `stylesheet.css` | Small, scoped style rules respecting GNOME theme/scaling |
| `metadata.json` | UUID, description, supported Shell majors and schema ID |
| `schemas/org.gnome.shell.extensions.panel-apps.gschema.xml` | Persistent settings |
| `README.md` | Build, install, use, debug, limitations and compatibility results |
| `LICENSE` | GPL-2.0-or-later |
| `tests/` | Focused pure-logic checks and manual acceptance checklist |

Use `Extension` from `resource:///org/gnome/shell/extensions/extension.js`. Use St/Clutter/Shell in the Shell process. Use `ExtensionPreferences`, GTK4, Adwaita and Gio in the preferences process. Never import GTK/Adwaita into `extension.js`, or Shell/St into `prefs.js` or a shared dependency loaded by it.

## 4. Application discovery: critical requirement

### Inside GNOME Shell

- Use `Shell.AppSystem.get_default().get_installed()` to obtain registered desktop app information. Its entries are GAppInfo objects, not Shell.App objects; confirm the exact introspected types on each target version.
- Filter using `Gio.AppInfo.should_show()` and the applicable eligibility rules from the installed GNOME version's Show Applications implementation.
- Inspect matching-version `js/ui/appDisplay.js` and parental-controls code before claiming exact equivalence. Account for parental restrictions where active, using a small version-specific adapter if required. Do not bypass them.
- Resolve a selected desktop ID to a `Shell.App` using `lookup_app()` for activation, windows and icon creation.
- Listen to `installed-changed` to update the catalogue and pins. Use `app-state-changed` for running indicators; avoid periodic polling.

### Inside Preferences

- Use `Gio.AppInfo.get_all()`, visibility filtering and `Gio.AppInfoMonitor` change notifications. Set/verify the GNOME desktop environment context as appropriate before filtering.
- Gio provides the same underlying desktop-entry registry but does not automatically reproduce every Shell-only filter. Match the target Shell's parental-control filtering where applicable. Document and test any remaining differences instead of asserting identical output.
- Preserve desktop IDs, including `.desktop`, as the stable identity. Never key selections by translated names, executable names, process IDs or window titles.
- Deduplicate by desktop ID only. Different IDs may legitimately have the same displayed name; show IDs to distinguish them.
- Cover RPM-installed apps, system and user Flatpaks, user `.desktop` entries and other apps exported into the normal XDG application registry. AppImages appear only when integrated through a desktop entry. Do not enumerate package-manager databases or manually scan a hard-coded directory list.
- Reflect install/uninstall changes without restarting the session. Retain selected missing IDs in settings, mark them unavailable in Preferences, and omit their launch buttons until they reappear.

“Same as Show Applications” means the same eligible application set, flattened into a searchable list. Reproducing folders, grid positions or favourites is not required. Compare the real lists on Fedora and record any differences and their reasons.

## 5. Panel behavior and Wayland

Register a well-contained panel component using `Main.panel.addToStatusArea()` and normal `PanelMenu`/`PopupMenu` patterns. Give each pinned app its own accessible interactive button; verify event propagation so child buttons and context menus do not accidentally trigger the container menu. Avoid private panel-box manipulation and monkey-patching GNOME's app grid.

Use Shell application activation APIs, such as `Shell.App.activate()` with an appropriate user-event timestamp, rather than parsing desktop-entry Exec fields or spawning command strings. Resolve icons through Shell/Gio with a fallback icon for missing assets. Check support before exposing New Window.

The extension runs inside GNOME Shell, so it can use compositor-side APIs on Wayland. Do not use `wmctrl`, `xdotool`, X11 window IDs, XEmbed, forced XWayland or process-name matching. An app without a native tray protocol can still have a pinned launcher, but that does not create app-specific background behavior or live menus.

Use normal user-session operation only. Cleanly disable for screen locking and re-enable on unlock. Never show application launch controls on the lock screen.

## 6. Settings

| Key | GVariant type | Default / purpose |
| --- | --- | --- |
| `pinned-apps` | `as` | `[]`; ordered desktop IDs; deduplicate preserving first occurrence |
| `panel-box` | `s` | `right`; validate against left/center/right |
| `panel-position` | `i` | `0`; nonnegative index within selected panel box |
| `icon-size` | `i` | `16`; bounded logical size, e.g. 16–32 |
| `show-running-indicator` | `b` | `true` |
| `max-visible-apps` | `i` | `8`; bounded, e.g. 1–20 |

Use standard GSettings bindings where useful. Selection order is stored once in `pinned-apps`, not duplicated in another ordering key. Make removing an unavailable selection possible.

## 7. Implementation sequence

### Milestone 1: environment and skeleton

Read the actual Fedora release, `gnome-shell --version` and session type. Check installed GJS, GTK4, libadwaita, GLib schema tools and extension CLI. Resolve package names against Fedora's repositories rather than assuming them.

Create a stable local UUID such as `panel-apps@lisandro.local`, matching its installation directory; replace the namespace with one owned by the author before public distribution. Implement enable/disable and one basic panel control. Verify lifecycle before adding app discovery.

### Milestone 2: catalogue and picker

Implement registry discovery, visibility rules, search and persistent selections. Verify with at least one RPM app, one Flatpak and a user desktop entry. Compare with Show Applications, including hidden entries and duplicate names.

### Milestone 3: panel icons

Implement per-app launch/focus, running indicators, accessible tooltips, context menus, placement, ordering and overflow. Refresh incrementally when possible; do not destroy/rebuild the entire panel on every state change.

### Milestone 4: robustness and compatibility

Handle missing apps/icons, launch errors and external settings edits. Debounce catalogue changes. Disconnect every signal, destroy actors/menus/tooltips, remove every GLib source and cancel pending work on disable. Keep `disable()` synchronous; guard late async callbacks against use after disable.

Read the GNOME 50 and 51 porting guides. In particular, avoid removed St `vertical` properties on 51; verify orientation APIs common to targets. Check PopupMenu open/close signature differences if passing arguments. Isolate genuine version differences in a tiny compatibility module.

### Milestone 5: package and document

Compile schemas with `glib-compile-schemas --strict schemas/`. Package using `gnome-extensions pack` and explicitly include additional JS modules, styles and schema files as required by the installed CLI. Inspect the ZIP contents and perform a fresh-install test.

Supply a per-user install path and uninstall instructions. No root privileges should be needed to install the extension itself. Do not disable GNOME's version validation. List only tested majors in `shell-version`, such as `["50", "51"]` after both pass; record untested versions honestly.

## 8. Testing and acceptance criteria

Use a Fedora VM or development session initially. For GNOME 49+, the documented nested development command is `dbus-run-session gnome-shell --devkit --wayland`; check availability and dependencies on the host. A nested session is not a fully isolated sandbox. Also test the real Fedora Wayland session before declaring success.

Source changes require a new Shell process: toggling the extension does not reliably reload JavaScript modules. Restart the nested session, or log out/in on the host. Do not recommend Alt+F2 → r as a Wayland reload method. Use Looking Glass and journal logs for diagnosis; never kill the user's active Shell as a routine test step.

Acceptance checklist:

- Searchable picker matches eligible Show Applications entries, including Flatpaks and user entries.
- Three selected apps appear as separate top-panel icons; they are not added to the dock.
- Clicking a stopped app launches it; clicking a running app activates it without deliberately creating a new instance.
- Multiwindow and other-workspace activation behave consistently with GNOME application activation.
- Selection, order and placement survive logout/login.
- Installing/removing apps updates the picker; missing pinned entries cause no errors.
- More than eight selected apps use overflow correctly.
- Keyboard navigation, accessible names, context-menu dismissal and high-DPI scaling work.
- Enable/disable at least ten times without duplicate icons, surviving callbacks or extension-originated log errors.
- Lock/unlock, suspend/resume and monitor changes do not leave duplicate or broken controls.
- Test with AppIndicator installed and with common panel extensions; retain independent functionality and document possible duplicate native tray icons.
- Run the same functional checklist separately on GNOME 50 and 51 before listing both as supported.

Add small automated tests for desktop-ID deduplication/order, missing-entry handling and settings validation. UI behavior needs meaningful Shell integration or manual tests; Node-only tests cannot establish Wayland or GNOME compatibility. If a GUI environment is unavailable, report those checks as pending.

## 9. Instructions to the coding agent

Implement the milestones in order. Inspect the current environment and matching-version upstream source before choosing API signatures. Keep the project small and readable. Produce the source, installable ZIP, README and completed test checklist. Report what was actually tested, any catalogue mismatches, and any unsupported behavior. Do not implement native tray hosting or intercept application close actions as an unrequested expansion of the MVP.

## 10. Primary references

- Extension structure and version metadata: https://gjs.guide/extensions/overview/anatomy.html
- Preferences and process boundaries: https://gjs.guide/extensions/development/preferences.html
- AppSystem registry: https://gnome.pages.gitlab.gnome.org/gnome-shell/shell/method.AppSystem.get_installed.html
- Application activation: https://gnome.pages.gitlab.gnome.org/gnome-shell/shell/method.App.activate.html
- Visibility filtering: https://docs.gtk.org/gio/method.AppInfo.should_show.html
- Registry change monitoring: https://docs.gtk.org/gio/class.AppInfoMonitor.html
- Matching-version app grid source: https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/gnome-50/js/ui/appDisplay.js
- GNOME 50 porting: https://gjs.guide/extensions/upgrading/gnome-shell-50.html
- GNOME 51 porting: https://gjs.guide/extensions/upgrading/gnome-shell-51.html
- Wayland development and reload workflow: https://gjs.guide/extensions/development/debugging.html
- Existing native tray host, for future protocol integration research: https://github.com/ubuntu/gnome-shell-extension-appindicator

API reference pages may track a newer GNOME release. Verify against installed typelibs and source for every supported major. The matching-version app-grid source is an implementation-time verification requirement, not a claim that Gio filtering alone exactly reproduces it.
