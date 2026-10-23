# Changelog

All notable changes to this extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Compatibility layer (`compat.js`) that picks the correct `St.BoxLayout`
  vertical-layout property for the running GNOME Shell (45–47 `vertical`,
  48+ `orientation`).
- Keyboard route to each app's context menu (Menu key and Shift+F10) and
  automatic return of keyboard focus to the app button when the menu closes.
- Accessible names now include the running state ("app — running"), and the
  panel container reports a neutral panel role instead of a menu role.
- Spanish and Brazilian Portuguese translations (`po/`, gettext domain
  `pinbar@work_in_progress`); `build.sh` validates and packages them.
- `isPinnableId()` helper and unit tests (31 checks total).

### Changed

- The panel container relies on `PanelMenu.Button`'s public `dontCreateMenu`
  argument instead of disabling the private `_clickGesture` field, which only
  exists in GNOME 50 and made `enable()` crash on GNOME 45–49.
- Parental-controls filtering goes through a narrow `AppCatalog` adapter with a
  safe `should_show()` fallback if the manager API is ever unavailable.
- Preferences use a portable child-removal loop instead of
  `Gtk.ListBox.remove_all()` (GTK 4.12+), keeping older GNOME 45 GTK baselines
  working.
- `metadata.json` gains `gettext-domain`; `version-name` normalized to
  `0.1.0 alpha` (EGO metadata format).

### Fixed

- Applications without a stable desktop ID (`Gio.AppInfo.get_id()` returning
  `null`) are rejected before sorting, searching, pinning or Shell lookups.

## [0.1.0-alpha] — 2026-10-23

First public alpha release.

### Added

- Pin discoverable GUI apps to the top panel; left-click launches or focuses the
  app (no new instance).
- Searchable application picker (by localized name or desktop ID) in Preferences.
- Move Up / Move Down ordering, panel placement (left/center/right + index),
  icon size (16–32) and a running indicator.
- Right-click context menu: Open New Window (when supported) and Unpin.
- Event-driven application-catalogue updates (no polling).
- GTK4/libadwaita preferences (Applications, Panel, About).
- Headless unit test suite (`gjs -m tests/run-tests.js`).

### Changed

- Renamed the extension from "panel-apps" to **PinBar**.
  - UUID: `pinbar@work_in_progress`
  - Display name, README, and repository updated to match.

### Fixed

- Added an About page (version + author) and corrected `original-author`.

### Removed

- Panel menu button and overflow; the panel now shows only pinned app icons.
