# Panel Apps

A GNOME Shell extension that pins selected installed graphical applications to
the top panel. Search the application catalogue in Preferences, then click an
icon to launch or focus its application.

> **Working interpretation of "tray"**: persistent app launch/focus icons in the
> top panel. This is **not** a native tray-protocol (StatusNotifierItem /
> AppIndicator) host, and it does not intercept window close events or keep
> arbitrary apps alive in the background.

## Status

- [x] Milestone 1 — environment & skeleton
- [x] Milestone 2 — application catalogue & searchable picker
- [x] Milestone 3 — panel icons (launch/focus, running dot, menus)
- [x] Milestone 4 — robustness & compatibility hardening
- [x] Milestone 5 — packaging, documentation & tests

## Requirements

- Fedora Workstation (tested on Fedora 44) on Wayland
- GNOME Shell 50 (tested on 50.5)
- No Node.js, Python daemon or native helper is required at runtime.

## Install (development)

The extension's UUID is `panel-apps@lisandro.local`; it must live under a
directory of that name.

```sh
# Compile the GSettings schema (strict)
glib-compile-schemas --strict panel-apps@lisandro.local/schemas/

# Link the extension into the per-user extensions directory (no root needed)
ln -s "$PWD/panel-apps@lisandro.local" \
    ~/.local/share/gnome-shell/extensions/panel-apps@lisandro.local

# Make the schema visible to the running session (per-user schema dir)
mkdir -p ~/.local/share/glib-2.0/schemas
cp panel-apps@lisandro.local/schemas/org.gnome.shell.extensions.panel-apps.gschema.xml \
    ~/.local/share/glib-2.0/schemas/
glib-compile-schemas ~/.local/share/glib-2.0/schemas/

# Enable and open preferences
gnome-extensions enable panel-apps@lisandro.local
gnome-extensions prefs panel-apps@lisandro.local
```

Source changes require a new Shell process: toggling the extension does not
reliably reload JavaScript modules. Restart a nested development session
(`dbus-run-session gnome-shell --devkit --wayland`) or log out/in on the host.
Do **not** use Alt+F2 → `r` on Wayland.

## Build (packaged zip)

```sh
glib-compile-schemas --strict panel-apps@lisandro.local/schemas/
gnome-extensions pack --force \
    --extra-source=appCatalog.js \
    --extra-source=panelApps.js \
    --extra-source=settings.js \
    panel-apps@lisandro.local
```

`metadata.json`, `extension.js`, `prefs.js`, `stylesheet.css` and the `schemas/`
directory are included automatically; only the additional JS modules need
`--extra-source`. `gnome-extensions install` compiles the schema on install.

Install the resulting `panel-apps@lisandro.local.shell-extension.zip` with
`gnome-extensions install panel-apps@lisandro.local.shell-extension.zip`.

## Usage

1. Open Preferences → Applications.
2. Search installed applications by localized name or desktop ID.
3. Toggle an application's switch to pin it; use Move Up/Move Down to reorder.
4. Left-click a panel icon to launch or focus the app (no new instance).
5. Right-click an icon for Open New Window (when supported) and Unpin.
6. Configure placement, icon size and the running dot under
   Preferences → Panel.

## Settings

| Key | Type | Default | Purpose |
| --- | --- | --- | --- |
| `pinned-apps` | `as` | `[]` | Ordered desktop IDs |
| `panel-box` | `s` | `right` | left / center / right |
| `panel-position` | `i` | `0` | index within the selected box |
| `icon-size` | `i` | `16` | logical size, 16–32 |
| `show-running-indicator` | `b` | `true` | dot under running apps |

## Debugging

- Journal: `journalctl --user -f -o cat | grep -i panel-apps`
- Nested session: `dbus-run-session -- gnome-shell --headless --wayland --devkit --virtual-monitor=1280x720`
- Looking Glass: run `lg` in the Alt+F2 prompt (development-tools must be on).

## Testing

Run the pure-logic tests with `gjs -m tests/run-tests.js` (25 checks: desktop-ID
dedupe/order and settings validation).

Verified on GNOME Shell 50.5 (headless nested Wayland session):

- Extension enables to `ACTIVE` and disables cleanly; 10× enable/disable cycles
  with no errors or duplicate status-area entries.
- Catalogue matches the desktop registry: 173 registered → 85 visible after
  `should_show()` (22 Flatpak, 8 user entries, 55 system RPMs).
- Preferences (picker + panel config) loads without JS or markup errors.

Not verified in a headless environment (manual checklist, pending a real
Wayland session): visual click-to-launch/focus, keyboard navigation, HiDPI
scaling, lock/unlock, suspend/resume, and coexistence with AppIndicator.

## Limitations

- No native tray menus/badges/live status (future: StatusNotifierItem).
- Not a "close to tray" mechanism; closing a window can still exit its app.
- St 18 (GNOME 50) removed the `tooltip_text` property, so app icons expose an
  accessible name instead of a visual tooltip.
- Preferences apply `should_show()` filtering; parental-controls filtering is
  applied at the panel layer, so a restricted app never appears as a launcher.
- Exact adjacency to the clock varies with other extensions.

## Compatibility

- GNOME 50 (50.5): tested, working.
- GNOME 51: not tested here (no 51 install). Code uses the 51-safe
  `St.BoxLayout.orientation` API and `PopupMenu.toggle()` (no open/close args),
  but 51 must be validated separately before being listed as supported.
- **Private API (`Main.panel.menuManager`):** each app icon's right-click menu is
  a `PopupMenu.PopupMenu` registered via `Main.panel.menuManager.addMenu()` (a
  private `PopupMenu.PopupMenuManager` from `ui/panel.js`). This lets the panel
  coordinate open/close state, keyboard navigation and dismissal the same way
  `addToStatusArea()` registers a `PanelMenu.Button`'s own menu. It is valid for
  the declared `shell-version` `["50"]` and must be re-checked before any future
  GNOME major is listed as supported.

## License

GPL-2.0-or-later. See `LICENSE`.

