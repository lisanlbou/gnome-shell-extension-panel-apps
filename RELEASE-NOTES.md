# PinBar — 0.1.0-alpha

**Released:** 2026-10-23 · **GNOME Shell:** 50 (tested on 50.5) · **License:** GPL-2.0-or-later

First public alpha. Pins selected installed applications to the top panel;
click an icon to launch or focus its application.

> "Tray" here means persistent app launch/focus icons — not a native
> StatusNotifierItem / AppIndicator host.

## Highlights

- Pin any discoverable GUI app to the top panel and launch/focus it.
- Searchable application picker (by localized name or desktop ID) in Preferences.
- Move Up / Move Down ordering, panel placement (left/center/right + index),
  icon size (16–32) and a running indicator.
- Right-click an icon for Open New Window (when supported) and Unpin.
- Event-driven catalogue updates — no polling.

## What changed in this alpha

- Renamed from "panel-apps" to **PinBar**; UUID is now
  `pinbar@work_in_progress`.
- Added an About page to Preferences and corrected `original-author`.

## Install

```sh
./build.sh
gnome-extensions install pinbar@work_in_progress.shell-extension.zip
```

See [INSTALL.md](INSTALL.md).

## Verification

- 25 headless unit tests pass (`gjs -m tests/run-tests.js`).
- Field-verified on Fedora 44 / GNOME Shell 50.5: pin/unpin, launch/focus,
  reorder, icon size, context menu, and AppIndicator coexistence all working.

## Known limitations

- Not a native tray-protocol (StatusNotifierItem / AppIndicator) host.
- No "close to tray"; closing a window can still exit its app.
- Only GNOME Shell 50 is declared supported.

See the [full README](pinbar@work_in_progress/README.md) and
[CHANGELOG](pinbar@work_in_progress/CHANGELOG.md).
