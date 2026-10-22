# Pre-Publication Review — Panel Apps (`panel-apps@lisandro.local`)

Date: 2026-10-22 · Environment: Fedora 44 · GNOME Shell 50.5 · GJS 1.88.1 ·
GLib 2.88.3 · Wayland (real session) · `gnome-extensions` 50.5

This is the **final pre-publication validation** of the extension. It records the
exact source commit, the package checksum, the test coverage, the remaining
warnings with justifications, and the security/lifecycle assessment.

---

## 1. Final verdict

**CONDITIONAL GO**

The code, schema, package and automated lifecycle tests are clean (0 ego-lint
failures, 25/25 unit tests, strict schema compile, 40 enable/disable cycles with
no errors). Two conditions must be met before an actual `extensions.gnome.org`
submission:

1. **BLOCKER — real repository URL.** `metadata.json` still contains the
   placeholder `"url": "https://example.com/panel-apps"`. The project has **no
   configured git remote** (`git remote -v` is empty), so no real repository URL
   is available to substitute. This was **not invented**; it must be supplied by
   the author before submission. This is the only remaining ego-lint finding that
   could block EGO review.
2. **Human interactive verification.** Click-based and visual behaviours (pin/
   unpin visuals, launch/focus, context menu, reorder, visual placement/icon
   size, suspend/resume) could not be automated and are **NOT RUN**. They must be
   exercised by a human on a real Wayland session (exact instructions in §8).

GO is intentionally **not** declared because critical user interactions remain
untested, as required by the review mandate.

---

## 2. Source and package identification

| Item | Value |
| --- | --- |
| Source commit (HEAD) | `036154201cbd4ed1653f1cf4ea634015ea1eb9c4` |
| Commit subject | `Final pre-publication fixes: GLib.Source.remove, prefs error handling, menuManager docs` |
| Package file | `panel-apps@lisandro.local.shell-extension.zip` |
| Package SHA-256 | `9c09bf4a9dc219e5c1c8c85bc52899abb843f5eb7b232ede5e0b1f63a5f9a4a4` |
| Package entries | 10 files (all JS, `metadata.json`, `stylesheet.css`, `LICENSE`, `schemas/org.gnome.shell.extensions.panel-apps.gschema.xml`) |
| Validator | `gnome-extension-reviewer` (ego-lint) @ commit `158f59d364a0568efd1b38b5339539633b0649d0` |
| Built from audited source | **YES** — `diff -r` between the committed source tree and the extracted package shows only `README.md` (not packaged) and `schemas/gschemas.compiled` (not packaged) |

## 3. Changes made in this review (Phase 1)

All changes are minimal and targeted; no working code was refactored.

| # | Requested item | Action |
| --- | --- | --- |
| 1 | Replace placeholder repo URL | **Not replaced — reported as a blocker.** No git remote exists; inventing a URL was refused per instructions. `metadata.json` left as-is. |
| 2 | `GLib.source_remove()` → `GLib.Source.remove()` | **Done** (both call sites in `panelApps.js`: `_debounceRebuild` and `_onDestroy`). Verified `GLib.Source.remove` exists and functionally removes a source via a live GJS test. |
| 3 | Review lifecycle refs / null out destroyed instances | **Verified** the `_onDestroy` chain is correct (see §7), and added `this._panelApps = null;` between `destroy()` and the reassignment in `extension.js::_recreate()`. |
| 4 | Review `prefs.js::_loadApps()` error handling | **Done.** Restructured so `get_id()`/`get_name()`/`get_icon()` are each read once inside a single `try` (the previous code called `get_id()` twice and left `get_name()`/`get_icon()` — the methods that can actually throw on non-UTF-8 `.desktop` files — outside the `try`). |
| 5 | Document `Main.panel.menuManager` + GNOME 50 constraints | **Done.** Added a code comment in `panelApps.js` at the `addMenu()` call and a bullet in `README.md` → "Compatibility". |

Linter suggestions that were **deliberately NOT applied** (per instructions):

- `R-QUAL-31` (`_onDestroy()` → `destroy()`): **false positive**. `_onDestroy` is the
  canonical GNOME Shell pattern — `PanelMenu.Button` (via `ButtonBox._init`) binds
  `this.connect('destroy', this._onDestroy.bind(this))`, which dynamically resolves
  to the most-derived override, so `PanelApps._onDestroy` runs on destroy and calls
  `super._onDestroy()` up the chain. Renaming to `destroy()` would break this.
- `R-PREFS-04c` (`Gtk.ListBox` in prefs): **false positive** for this use case. There
  is no Adwaita equivalent for a `boxed-list` `Gtk.ListBox` with
  `Gtk.SelectionMode.NONE`.

## 4. Test results (PASS / FAIL / NOT RUN)

### 4.1 Phase 1 — remaining fixes

| Test | Result | Evidence |
| --- | --- | --- |
| Repo URL substituted with real value | **NOT RUN (BLOCKER)** | No git remote; author must supply. Not invented. |
| `GLib.Source.remove()` compatible & applied | **PASS** | API exists + live removal test; 2 sites replaced; `R-SLOP-44` warning now absent. |
| Destroyed instances nulled | **PASS** | `extension.js::_recreate` nulls; `disable()` already nulls `_panelApps/_catalog/_settings`; `AppButton._onDestroy` nulls `_menu`. |
| `_loadApps()` error handling reviewed | **PASS** | Rewritten; ego-lint + `node --check` parse clean. |
| `Main.panel.menuManager` documented | **PASS** | Code comment + README. |

### 4.2 Phase 2 — functional validation

| Test | Result | Notes |
| --- | --- | --- |
| Pin/unpin applications | **NOT RUN** (GUI) | Setting via `gsettings` exercises `changed::pinned-apps` → `_rebuild()` with no error, but visual pin/unpin in Preferences needs a real click. |
| Launch applications | **NOT RUN** (GUI) | Needs a real left-click on a panel icon. |
| Focus already-running applications | **NOT RUN** (GUI) | Needs a real click while the app is running. |
| Reorder pinned icons | **NOT RUN** (GUI) | Move Up/Down needs clicks; the underlying `moveItem` logic is unit-tested (PASS). |
| Change panel position | **NOT RUN** (visual) | `gsettings set panel-box left/center/right` applied with no error; visual placement not captured. |
| Change icon size | **NOT RUN** (visual) | `gsettings set icon-size 24→18` applied with no error; visual result not captured. |
| Persist settings after closing/reopening prefs | **PASS** (store) / **NOT RUN** (window) | GSettings round-trip verified via `gsettings set`/`get` (schema-backed). The literal close/reopen of the prefs window needs GUI. |
| Open/close context menus | **NOT RUN** (GUI) | Needs a real right-click. |
| Disable and re-enable extension | **PASS** | 40 cycles; `State: ACTIVE` throughout; 0 journal errors. |
| Suspend/resume session | **NOT RUN** | Cannot be auto-resumed. |
| AppIndicator compatibility | **PASS** | `appindicatorsupport@rgcjonas.gmail.com` and `panel-apps@lisandro.local` both `ACTIVE` simultaneously; no "extension point conflict". |

### 4.3 Phase 3 — lifecycle & security

| Test | Result | Evidence |
| --- | --- | --- |
| Signal connections & cleanup paths | **PASS** | All connections tracked in `_connections` (panel) / `_placementIds` (extension) and disconnected in `_onDestroy`/`disable`. |
| Timeout cleanup | **PASS** | `_rebuildTimeout` removed with `GLib.Source.remove()` in `_onDestroy`. |
| Destroyed actors cannot receive stale callbacks | **PASS** | Signals disconnected before destruction completes; `AppButton._onDestroy` nulls its `_menu`; `PanelApps._onDestroy` clears `_connections`. |
| No unauthorized network/filesystem/subprocess | **PASS** | Code inspection + ego-lint: `disclosure/network`, `disclosure/file-io`, `disclosure/subprocess`, `disclosure/pkexec`, `disclosure/clipboard` all PASS. Only registry access is `Shell.AppSystem` / `Gio.AppInfo` (intended). |
| Repeated enable/disable | **PASS** | 40 cycles, no "extension point conflict", no stack traces, `State: ACTIVE`. |
| Resource growth | **PASS** (no leak) | Whole-shell RSS spiked during cycles (~476→~515 MB) then returned to ~494 MB after idle + GC; no monotonic growth. See caveat in §7. |

### 4.4 Phase 4 — final build & audit

| Test | Result |
| --- | --- |
| Unit tests (`gjs -m tests/run-tests.js`) | **PASS** — 25 passed, 0 failed (exit 0) |
| GSettings schema strict compile | **PASS** — `glib-compile-schemas --strict` clean |
| Distribution ZIP build (`./build.sh`) | **PASS** — tests + schema + `gnome-extensions pack --force` (exit 0) |
| ego-lint on final ZIP contents | **PASS** — 0 FAIL / 6 WARN / 215 PASS / 10 SKIP (verdict: MAY PASS WITH COMMENTS) |
| License included | **PASS** — `LICENSE` (GPL-2.0-or-later) packed via `--extra-source=LICENSE` |
| Required metadata included | **PASS** — `uuid`, `name`, `description`, `shell-version`, `url`, `settings-schema` all present |
| Source commit hash recorded | **PASS** — `0361542…` |
| Package SHA-256 recorded | **PASS** — `9c09bf4a…` |
| Package built from audited source | **PASS** — diff vs. committed tree shows only intentionally-unpackaged files |
| JS syntax check (all 5 modules) | **PASS** — `node --check` (ES module) clean |

## 5. ego-lint — remaining warnings and justifications

Final result (source tree and extracted package are identical):

```
231 checks — 215 passed, 0 failed, 6 warnings, 10 skipped
VERDICT: MAY PASS WITH COMMENTS (5 checks flagged, 6 findings)
```

| Warning | Location | Justification |
| --- | --- | --- |
| `metadata/url-format` | `metadata.json` | **REAL.** Placeholder URL. Blocked on the author supplying the real repository URL (no git remote exists). |
| `quality/private-api` | `panelApps.js:92` (`Main.panel.menuManager`) | **Justified.** `Main.panel.menuManager.addMenu()` registers each icon's `PopupMenu` so the panel coordinates open/close, focus and dismissal — the same private `PopupMenuManager` that `panel.js`'s `addToStatusArea()` uses for a `PanelMenu.Button`'s own menu. App icons are plain `St.Button`, so manual registration is required. Valid for the pinned `shell-version: ["50"]`; documented in code + README, to be re-checked for later majors. |
| `lifecycle/signal-balance` (5 connect / 2 disconnect) | `panelApps.js` | **False positive.** The heuristic only counts literal `.connect()`/`.disconnect()` in one file. All connections go through `_connect()` into `_connections` and are bulk-disconnected in `_onDestroy()`; the `changed::panel-box/panel-position` handlers live in `extension.js` and are disconnected in `disable()`. |
| `R-QUAL-31` ×2 (`_onDestroy()` → `destroy()`) | `panelApps.js:135,267` | **False positive.** Correct GNOME pattern (see §3). Not applied. |
| `R-PREFS-04c` (`Gtk.ListBox` in prefs) | `prefs.js` | **False positive.** No Adwaita equivalent for a `boxed-list` `Gtk.ListBox` with `Gtk.SelectionMode.NONE`. Not applied. |

Warnings eliminated in this review (present in the prior audit, now gone):
`R-SLOP-44` (`GLib.source_remove` → `GLib.Source.remove`) and
`lifecycle/destroy-no-null` (`extension.js::_recreate`).

---

## 6. Security assessment

**PASS — no unauthorized operations.**

- **Network:** none. No fetch, `Soup`, `GLib.NetworkMonitor`, telemetry or remote
  code. ego-lint `disclosure/network` PASS.
- **Filesystem:** none beyond the intended desktop-entry registry access
  (`Shell.AppSystem.get_default()` in the Shell process, `Gio.AppInfo.get_all()` /
  `Gio.AppInfoMonitor` in Preferences). No `Gio.File`, no `GLib.file_get_contents`,
  no writes. ego-lint `disclosure/file-io` PASS.
- **Subprocess / privilege escalation:** none. No `Gio.Subprocess`, no `pkexec`, no
  `sudo`. ego-lint `disclosure/subprocess` and `disclosure/pkexec` PASS.
- **Clipboard / secrets / eval:** none. ego-lint `disclosure/clipboard` PASS; no
  `eval`, no secret material, no `GKeyFile` writes.
- **External input handling:** desktop IDs and localized names are used as opaque
  identifiers; user-provided text is escaped with `GLib.markup_escape_text()` in
  Preferences (`_esc`). Launch paths use `Shell.App.activate()` /
  `open_new_window()` — no parsing of `Exec` fields, no shell command strings.
- **Lock screen:** no launch controls are registered outside the normal
  `addToStatusArea()` panel lifecycle, so icons never appear on the lock screen.
- **No cross-extension interference:** no `lookupByUUID` (ego-lint `R-SEC-09b` PASS).

## 7. Lifecycle assessment

**PASS — no orphaned signals, timers, or destroyed-object callbacks.**

- `extension.js::enable()` creates `AppCatalog` + `PanelApps`, then `PanelApps.enable()`
  connects all signals and calls `Main.panel.addToStatusArea('panel-apps', …)`.
- `extension.js::disable()` disconnects `_placementIds`, then `PanelApps.destroy()`
  triggers `PanelApps._onDestroy` (via the inherited `ButtonBox` destroy binding),
  which removes the debounce timeout (`GLib.Source.remove`) and bulk-disconnects
  `_connections`, then `super._onDestroy()` destroys the empty `PanelMenu.Button`
  menu. `_panelApps/_catalog/_settings` are then nulled.
- `_recreate()` (panel-box/panel-position changes) destroys and re-creates the
  indicator, disconnecting the old instance's signals first.
- `AppButton._onDestroy()` destroys and nulls its context menu; `_rebuild()`
  destroys and clears old buttons before recreating them.
- Verified live: 40 enable/disable cycles left `State: ACTIVE`, zero
  `panel-apps` journal lines, no "extension point conflict".

**Resource growth caveat:** RSS was measured on the whole `gnome-shell` process
(PID 7021, with 15+ other extensions incl. blur-my-shell and dash-to-dock), not on
this extension in isolation. The value rose during enable/disable cycles and
returned near baseline after idle (JS GC), which is consistent with **no leak**
but is a coarse observation, not a per-extension memory audit. No polling, no
periodic timers (the only `timeout_add` is a 250 ms debounce removed on destroy),
and no blocking I/O exist in the Shell process.

## 8. Exact manual testing instructions (GUI items marked NOT RUN)

Run these on the real Fedora Wayland session after the source changes take effect
(source changes require a **new Shell process**: log out/in — do **not** use
Alt+F2 → `r` on Wayland). Open preferences with:

```sh
gnome-extensions enable panel-apps@lisandro.local
gnome-extensions prefs panel-apps@lisandro.local
```

1. **Pin/unpin:** Preferences → Applications → search an app → toggle its switch
   ON. Confirm its icon appears in the top panel. Toggle OFF and confirm it
   disappears. Confirm the switch state survives closing and reopening Preferences.
2. **Launch:** click a pinned icon whose app is not running → the app launches.
3. **Focus:** with that app running (possibly minimized / on another workspace),
   click the icon again → the existing window is focused, no duplicate instance.
4. **Reorder:** pin ≥3 apps, use Move Up / Move Down, confirm the panel icon order
   updates immediately and matches the Preferences list order.
5. **Panel position:** Preferences → Panel → change Panel box (left/center/right)
   and Panel position; confirm the icon group moves accordingly in the panel.
6. **Icon size:** Preferences → Panel → Icon size (16–32); confirm icons resize.
7. **Persist settings:** set panel-box/position/icon-size/running-dot, close the
   prefs window, reopen it, and confirm values are restored.
8. **Context menus:** right-click an icon → Open New Window (only when supported)
   and Unpin appear; left-click elsewhere or press Esc to dismiss; confirm the
   menu opens/closes without stale state after several cycles.
9. **Running dot:** launch a pinned app and confirm the dot appears; quit the app
   and confirm the dot disappears (with Running indicator enabled).
10. **Suspend/resume:** suspend the session, resume, and confirm the icons are
    still present and functional (no duplicates).
11. **AppIndicator coexistence:** with `appindicatorsupport@rgcjonas.gmail.com`
    enabled, confirm both extensions render independently in the panel with no
    "extension point conflict" in `journalctl --user -o cat | grep -i panel-apps`.

---

## 9. Final verdict

**CONDITIONAL GO.**

- **ego-lint:** 0 FAIL, 6 WARN (4 false-positive/justified + 1 blocker placeholder
  URL + 1 documented private API), verdict "MAY PASS WITH COMMENTS".
- **Compliance:** metadata, imports segregation, schema, preferences and security
  all conform to the GNOME review guidelines as far as verifiable.
- **Automated reliability:** unit tests 25/25, strict schema compile, 40
  enable/disable cycles clean, no journal errors, no measurable leak.
- **Not verified:** the interactive click/visual behaviours listed in §8, and the
  real repository URL. **GO is therefore withheld**, consistent with the mandate
  not to declare GO while critical user interactions remain untested.

> No claim is made that extensions.gnome.org will approve the extension; the final
> decision rests with a human EGO reviewer.




