# Changelog

All notable changes to this extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
