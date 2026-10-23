# PinBar — GNOME 45–51 implementation report

**Date:** 2026-10-23 · **Environment:** Fedora 44 · GNOME Shell 50.5 · GJS 1.88.1 · Wayland
**Scope:** PinBar only (`pinbar@work_in_progress`). The sibling Memory Monitor
project in the workspace was out of scope for this task and was not modified.

## Summary

Fixed the two P0 defects that prevented PinBar from enabling on GNOME 45–49,
completed the P1 compatibility/accessibility/localization work (PB-03…PB-07),
and validated everything that this environment can validate: unit tests,
syntax, schema, gettext catalogs, packaging, `ego-lint` (source tree and
packed zip) and a **real GNOME Shell 50.5 runtime session** (headless Wayland
compositor with a virtual monitor, in an isolated `HOME`, so the maintainer's
live session was never modified).

`metadata.json` continues to declare `shell-version: ["50"]` — the only major
actually runtime-tested here. GNOME 45–49/51 compatibility is implemented and
source-verified against upstream `gnome-shell` sources, but **not**
runtime-tested; see the matrix.

## Changes by file

| File | Change |
| --- | --- |
| `pinBar.js` | **PB-01:** container now calls `super._init(0.5, 'PinBar', true)` (public `dontCreateMenu`) and no longer touches the private `_clickGesture` (GNOME 50-only; crashed enable() on 45–49). **PB-02:** app-button box built via `compat.js`. **PB-03:** parental-controls subscription goes through the `AppCatalog` adapter. **PB-05:** accessible name tracks running state (`'%s — running'`), Menu key / Shift+F10 open the context menu, keyboard focus returns to the app button when the menu closes, container accessible role changed from `MENU` to `PANEL`. Menu strings translated. |
| `compat.js` (new) | `createVerticalBoxLayout()`: feature-detects `St.BoxLayout:orientation` (GNOME 48+) and falls back to the legacy `vertical` property (45–47), never passing an unknown property to the constructor (GNOME 51 removes `vertical`). |
| `appCatalog.js` | **PB-03:** narrow adapter — `isEligible()` rejects null IDs first, calls `shouldShowApp()` when available (signature verified in 45–50 sources) with a `should_show()` fallback; new `connectAppFilterChanged()` / `disconnectAppFilterChanged()` encapsulate the manager singleton. **PB-04:** `lookupApp()` rejects empty IDs. |
| `prefs.js` | **PB-04:** entries with `get_id() === null` (or empty name) are dropped before sort/search/pin. **PB-06:** `Gtk.ListBox.remove_all()` (GTK 4.12+) replaced by a portable child-removal loop. **PB-07:** all user-facing strings gettext-wrapped (`_`, `pgettext`), including tooltips and the missing-app subtitle. |
| `settings.js` | New `isPinnableId()` helper (nonempty string check) shared by prefs and tests. |
| `metadata.json` | Added `"gettext-domain": "pinbar@work_in_progress"`; `version-name` normalized to `0.1.0 alpha` (EGO format: no hyphen). `shell-version` **unchanged**: `["50"]`. |
| `po/` (new) | `pinbar@work_in_progress.pot`, `es.po`, `pt_BR.po` — 30 messages each, UTF-8, correct plural forms, `msgfmt --check` clean. |
| `build.sh` | Validates catalogs, packs `compat.js` and translations (`--podir=po --gettext-domain`). |
| `tests/run-tests.js` | 6 new `isPinnableId` checks (null/undefined/empty/blank/non-string) — 31 total. |
| `README.md` (both) | Compatibility, translations, keyboard usage, test counts updated. |
| `CHANGELOG.md` | `Unreleased` section describing all of the above. |

## Finding checklist

| ID | Status | Notes |
| --- | --- | --- |
| PB-01 — replace fragile GNOME 50-only click path | **Done** | `dontCreateMenu=true` verified in panelMenu.js sources 45–50 (+ main): installs no-op `PopupDummyMenu`, disables click handling in 50+, and `vfunc_event`/gesture paths no-op on a dummy menu. No private fields touched. `Main.panel.menuManager` verified present in panel.js 45–50 (private API — documented, version-pinned comment). |
| PB-02 — St.BoxLayout orientation by version | **Done** | Upstream st-box-layout.c verified: 45–47 `vertical` only; 48–50 both (`vertical` deprecated); main (51-dev) `orientation` only. Runtime feature detection (`'orientation' in St.BoxLayout.prototype`, confirmed via introspection on 50.5). |
| PB-03 — application filtering APIs | **Done** | `getDefault()`/`shouldShowApp()`/`app-filter-changed` identical in parentalControlsManager.js 45 and 50 sources. Adapter adds `should_show()` fallback and null-safety; subscriptions released in `disable()` (verified 10× enable/disable runtime). |
| PB-04 — nullable IDs | **Done** | Rejected in prefs (load time), catalog (`isEligible`, `lookupApp`) and covered by unit tests. Runtime-tested with a bogus desktop ID in `pinned-apps` (no errors). |
| PB-05 — accessible buttons and menus | **Done (code + menu lifecycle runtime) / Not tested (Orca)** | Running state in accessible name, Menu/Shift+F10 route, focus restore on close, `PANEL` role for the container. A temporary in-session harness (test `HOME` only, not shipped) verified 15 menu-lifecycle checks: open/close, `Main.panel.menuManager` registration and removal on destroy, Menu/Shift+F10 handling, plain-F10 passthrough, and teardown while open with no JS errors. Real pointer input and Orca behavior need a human session (checklist below). |
| PB-06 — GTK/libadwaita prefs compatibility | **Done** | `remove_all()` eliminated; the prefs process starts and exits cleanly (no JS/GTK stderr) under C, `es` and `pt_BR` on GTK4/Adw of GNOME 50. Dialog text itself was not inspected visually. |
| PB-07 — translations | **Done** | All user-visible strings extracted (30 msgids incl. context-qualified "Panel box" entries); es + pt_BR complete; `.mo` files verified inside the packaged zip; runtime catalog lookup verified with `gjs` gettext under C/`es`/`pt_BR`; prefs process starts cleanly in those locales. Catalog headers/plural forms validated by `msgfmt --check`. Runtime UI text inspection = manual (catalogs load at session start, so a re-login is required after installing/updating translations). |

## Validation commands and outputs (all executed)

```
gjs -m tests/run-tests.js                  → 31 passed, 0 failed
node --check (6 JS files)                  → OK
glib-compile-schemas --strict --dry-run    → OK
msgfmt --check (es.po, pt_BR.po)           → OK
./build.sh                                 → zip built; contains 2 × .mo, all sources, schema XML
ego-lint pinbar@work_in_progress           → 231 checks — 213 passed, 0 failed, 8 warnings, verdict "MAY PASS WITH COMMENTS"
ego-lint <extracted zip>                   → 232 checks — 214 passed, 0 failed, 8 warnings
git diff --check                           → OK (no whitespace errors)
```

Runtime (GNOME Shell 50.5, headless Wayland session with a virtual monitor,
isolated HOME, production session untouched):

```
load + enable                              → State: ACTIVE, no JS errors
10 × disable/enable cycles                 → ACTIVE afterwards, log clean
gsettings panel-box left/center/right      → OK (container re-added each time)
gsettings panel-position 3 → 0             → OK
gsettings icon-size 24 → 18                → OK
gsettings show-running-indicator f → t     → OK
gsettings pinned-apps: pin 1 / pin 3+duplicate / bogus id / [] / re-pin → OK, no errors
gnome-extensions prefs                     → request accepted (dialog opens; a second
                                             request reports "Already showing a prefs
                                             dialog"), no JS/GTK stderr
prefs app process (LANGUAGE=es / pt_BR,
  nested Wayland display)                  → starts and exits cleanly, no stderr
gettext lookup (gjs, domain pinbar@work_in_progress, extension locale/):
  C / es / pt_BR                           → English fallback / translated / translated
                                             (incl. current "Busca más abajo…" wording)
menu lifecycle harness (test HOME only, not shipped):
  button allocated + accessible name       → PASS
  open / close + panel menu registration   → PASS (registered; unregistered on destroy)
  Menu key / Shift+F10 / plain F10         → PASS (STOP / STOP / PROPAGATE)
  destroy with menu open                   → PASS, no JS errors afterwards
nested shell session log (JS ERROR / Extension point conflict / CRITICAL) → none
```

The menu-lifecycle harness is a temporary extension kept outside the repository;
it imported the build under test, opened the real `PopupMenu`, and asserted the
panel manager's internal registration list. It was run once after the panel
layout had been allocated (opening a menu before the first allocation in the
same tick produces unrelated relayout warnings, so that ordering is not a
product scenario).

The 8 remaining `ego-lint` warnings were reviewed one by one: 6 are documented
false positives (`_onDestroy` is GNOME's own destroy-hook pattern; `vertical`
in `compat.js` is the deliberate ≤47 branch; `get_key_focus()` null is handled;
signal-balance misses `_connections`/adapter disconnects; `Gtk.ListBox` has no
Adw equivalent; `Main.panel.menuManager` is the documented, version-pinned
private API), 1 is the intentional parental-controls `typeof` fallback
(PB-03 requirement), and 1 was fixed (`version-name`).

## GNOME 45–51 matrix — evidence only

| GNOME | Static | Shell load / enable | Functional UI | Preferences | i18n / a11y | Can declare support? |
| :--: | :-- | :-- | :-- | :-- | :-- | :-- |
| 45 | Source-audited vs upstream gnome-45 (panelMenu/popupMenu/parentalControls/St) | Not tested | Not tested | Not tested | Not tested | No |
| 46 | Source-audited vs upstream gnome-46 | Not tested | Not tested | Not tested | Not tested | No |
| 47 | Source-audited vs upstream gnome-47 | Not tested | Not tested | Not tested | Not tested | No |
| 48 | Source-audited vs upstream gnome-48 (incl. st-box-layout orientation) | Not tested | Not tested | Not tested | Not tested | No |
| 49 | Source-audited vs upstream gnome-49 | Not tested | Not tested | Not tested | Not tested | No |
| 50 | **Pass** | **Pass (50.5, headless)** | **Pass (gsettings-driven + menu lifecycle harness; real pointer/keyboard input manual)** | **Pass (dialog opens; UI text manual)** | Catalogs packaged + lookup verified; Orca not tested | **Declared `["50"]` (as before)** |
| 51 | Source-audited vs upstream `main` (vertical removed; _clickGesture present) | Not tested | Not tested | Not tested | Not tested | No |

GNOME 50 was **not** re-tested on a physical interactive session in this run;
the headless runtime evidence covers load/enable/disable and settings-driven
UI rebuilds, not pointer clicks.

## Remaining risks / limitations

- **Private API:** `Main.panel.menuManager` (menu registration) — verified in
  45–50 sources; re-check per major.
- **GNOME 51:** still in development upstream (`main`); `gnome-51` branch does
  not exist yet. The known 51 break (`St.BoxLayout.vertical` removal) is
  handled by `compat.js`, but 51 must be runtime-tested before being declared.
- **Malcontent/parental controls:** no malcontent service in the test
  environment; the restricted-app path could only be code-reviewed, not run.
- **Orca/keyboard:** accessible-name updates and the Menu/Shift+F10 route are
  implemented but not verified with a screen reader.
- **Interactive Wayland session:** click-to-launch, visual running dot, HiDPI,
  suspend/resume and AppIndicator coexistence were not re-tested in this run
  (the previous audit covered some of them on the old build).

## Manual tests for the maintainer

Install and load the new build on GNOME 50 (requires a shell restart on
Wayland — toggling does not reload JS modules):

```sh
cd pinbar
./build.sh
gnome-extensions install --force pinbar@work_in_progress.shell-extension.zip
# log out and back in (or reboot), then:
gnome-extensions enable pinbar@work_in_progress
journalctl --user -b -o cat | grep -iE 'pinbar|JS ERROR'   # expect nothing
```

GUI checklist (~5 minutes):

1. Pin 3 apps in Preferences; confirm icons appear in the configured panel box.
2. Left-click each icon → launches/focuses; running dot appears/disappears.
3. Right-click → Open New Window (if supported) + Unpin; Unpin removes icon.
4. Focus an icon with Tab; press Menu or Shift+F10 → same menu; Escape → focus
   returns to the icon; Enter/Space on the icon → app activates.
5. Change panel box/position, icon size, running indicator → UI updates.
6. Uninstall a pinned app → row shows "unavailable"; reinstall → recovers.
7. Run with `LANGUAGE=es` and `LANGUAGE=pt_BR` (relogin) → menu items and
   preferences translate; app names stay in the system language.
8. `gnome-extensions disable pinbar@work_in_progress` ×10 → journal stays
   clean; Orca reads "app — running" on pinned buttons.

## Accessibility manual tests (summary section)

See steps 4 and 7 above plus: high contrast + large fonts (dot and icons
remain visible), RTL locale (`he`/`ar`) layout sanity, and full Orca pass
over panel buttons and the preferences window. **Not executed here — mark as
tested only after running them.**

## Final recommendation

Ready for **maintainer review**. Not yet ready for an EGO submission claim:
GNOME 45–49/51 remain untested at runtime (only 50 is declared), and the
interactive/Orca checklist above still needs a human pass on a real session.
