# PinBar

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

- A GNOME Shell session (Wayland or X11)
- **Declared and tested:** GNOME Shell 50 (tested on 50.5, Fedora 44)
- The source is written to stay compatible with GNOME Shell 45–50 (see
  Compatibility); older/newer majors must be runtime-tested before being
  declared in `metadata.json`
- No Node.js, Python daemon or native helper is required at runtime.

## Install (development)

The extension's UUID is `pinbar@work_in_progress`; it must live under a
directory of that name.

```sh
# Compile the GSettings schema (strict)
glib-compile-schemas --strict pinbar@work_in_progress/schemas/

# Link the extension into the per-user extensions directory (no root needed)
ln -s "$PWD/pinbar@work_in_progress" \
    ~/.local/share/gnome-shell/extensions/pinbar@work_in_progress

# Make the schema visible to the running session (per-user schema dir)
mkdir -p ~/.local/share/glib-2.0/schemas
cp pinbar@work_in_progress/schemas/org.gnome.shell.extensions.pinbar.gschema.xml \
    ~/.local/share/glib-2.0/schemas/
glib-compile-schemas ~/.local/share/glib-2.0/schemas/

# Enable and open preferences
gnome-extensions enable pinbar@work_in_progress
gnome-extensions prefs pinbar@work_in_progress
```

Source changes require a new Shell process: toggling the extension does not
reliably reload JavaScript modules. Restart a nested development session
(`dbus-run-session gnome-shell --devkit --wayland`) or log out/in on the host.
Do **not** use Alt+F2 → `r` on Wayland.

## Build (packaged zip)

```sh
./build.sh
```

`build.sh` runs the unit tests, compiles the schema, validates the translation
catalogs and packs the extension (including `compat.js`, `LICENSE`, docs and
the compiled `es`/`pt_BR` message catalogs). To pack manually:

```sh
glib-compile-schemas --strict pinbar@work_in_progress/schemas/
gnome-extensions pack --force \
    --extra-source=appCatalog.js \
    --extra-source=compat.js \
    --extra-source=pinBar.js \
    --extra-source=settings.js \
    --extra-source=LICENSE \
    --extra-source=README.md \
    --extra-source=CHANGELOG.md \
    --podir=po \
    --gettext-domain=pinbar@work_in_progress \
    pinbar@work_in_progress
```

`metadata.json`, `extension.js`, `prefs.js`, `stylesheet.css` and the `schemas/`
directory are included automatically; only the additional JS modules need
`--extra-source`. `gnome-extensions install` compiles the schema on install.

Install the resulting `pinbar@work_in_progress.shell-extension.zip` with
`gnome-extensions install pinbar@work_in_progress.shell-extension.zip`.

## Usage

1. Open Preferences → Applications.
2. Search installed applications by localized name or desktop ID.
3. Toggle an application's switch to pin it; use Move Up/Move Down to reorder.
4. Left-click a panel icon to launch or focus the app (no new instance).
5. Right-click an icon (or focus it and press Menu / Shift+F10) for Open New
   Window (when supported) and Unpin.
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

- Journal: `journalctl --user -f -o cat | grep -i pinbar`
- Nested session: `dbus-run-session -- gnome-shell --headless --wayland --devkit --virtual-monitor=1280x720`
- Looking Glass: run `lg` in the Alt+F2 prompt (development-tools must be on).

## Testing

Run the pure-logic tests with `gjs -m tests/run-tests.js` (31 checks: desktop-ID
dedupe/order, pinnable-ID validation and settings validation).

Translations live in `po/` (`pinbar@work_in_progress.pot`, `es`, `pt_BR`).
Regenerate the template after changing user-visible strings:

```sh
cd pinbar@work_in_progress
find . -type f -name '*.js' -not -path './schemas/*' -not -path './po/*' \
  -print > /tmp/pinbar-js-sources.txt
xgettext --language=JavaScript --from-code=UTF-8 \
  --keyword=_ --keyword=ngettext:1,2 --keyword=pgettext:1c,2 \
  -f /tmp/pinbar-js-sources.txt -o po/pinbar@work_in_progress.pot
msgmerge --update po/es.po po/pinbar@work_in_progress.pot
msgmerge --update po/pt_BR.po po/pinbar@work_in_progress.pot
```

Verified on GNOME Shell 50.5 (headless Wayland session with a virtual monitor):

- Extension enables to `ACTIVE` and disables cleanly; 10× enable/disable cycles
  with no errors or duplicate status-area entries.
- Live `gsettings` changes (placement, icon size, running indicator, pin/unpin
  including duplicate and bogus desktop IDs) apply without errors.
- Catalogue matches the desktop registry: 173 registered → 85 visible after
  `should_show()` (22 Flatpak, 8 user entries, 55 system RPMs).
- Preferences (picker + panel config) load without JS or markup errors in C,
  `es` and `pt_BR`; the catalogs themselves were checked with a `gjs` gettext
  lookup (dialog text inspection is still manual).
- Context-menu lifecycle verified in-session with a temporary harness (not
  shipped): creation, open/close, panel menu registration/removal on destroy,
  Menu key and Shift+F10 handling, plain-F10 passthrough, and teardown while
  the menu is open (no JS errors).

Not verified in a headless environment (manual checklist, pending a real
Wayland session): visual click-to-launch/focus, real pointer input, full
focus-ring/Tab navigation and Orca, HiDPI scaling, lock/unlock, suspend/resume,
RTL, and coexistence with AppIndicator.

## Limitations

- No native tray menus/badges/live status (future: StatusNotifierItem).
- Not a "close to tray" mechanism; closing a window can still exit its app.
- St 18 (GNOME 50) removed the `tooltip_text` property, so app icons expose an
  accessible name instead of a visual tooltip.
- Preferences apply `should_show()` filtering; parental-controls filtering is
  applied at the panel layer, so a restricted app never appears as a launcher.
- Exact adjacency to the clock varies with other extensions.

## Compatibility

- **GNOME 50 (50.5): tested, working.** `metadata.json` declares `["50"]` only;
  versions are declared exclusively after real runtime tests.
- The source avoids version-specific breakage found in GNOME 45–51:
  - The container uses `PanelMenu.Button`'s long-standing `dontCreateMenu`
    argument instead of the GNOME 50-only private `_clickGesture` field
    (absent in 45–49, where the old code crashed on enable).
  - `compat.js` selects `St.BoxLayout`'s `vertical` (GNOME 45–47) or
    `orientation` (GNOME 48+) property by runtime feature detection; GNOME 51
    (development) removes `vertical`.
  - Application filtering uses `parentalControlsManager.getDefault()` /
    `shouldShowApp()` / `app-filter-changed`, verified unchanged in the 45–50
    sources, with a safe `should_show()` fallback.
  - Preferences avoid `Gtk.ListBox.remove_all()` (GTK 4.12+), keeping older
    GTK 4 baselines (e.g. GNOME 45 distros) working.
- GNOME 45–49 and 51 have **not** been runtime-tested here and are not
  declared supported; test them in isolated sessions before extending
  `shell-version`.
- **Private API (`Main.panel.menuManager`):** each app icon's right-click menu is
  a `PopupMenu.PopupMenu` registered via `Main.panel.menuManager.addMenu()` (a
  private `PopupMenu.PopupMenuManager` from `ui/panel.js`). This lets the panel
  coordinate open/close state, keyboard navigation and dismissal the same way
  `addToStatusArea()` registers a `PanelMenu.Button`'s own menu. Verified present
  with the same shape in the GNOME 45–50 sources; must be re-checked before any
  future GNOME major is listed as supported.

## Translations

English is the source language. Spanish (`es`) and Brazilian Portuguese
(`pt_BR`) ship with the packaged zip (`gettext-domain`:
`pinbar@work_in_progress`). Dynamic application names and desktop IDs are never
translated — they come from the system's localized application metadata.

## License

GPL-2.0-or-later. See `LICENSE`.

