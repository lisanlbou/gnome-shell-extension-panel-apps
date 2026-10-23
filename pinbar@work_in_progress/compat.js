// compat.js — small GNOME Shell compatibility helpers.
//
// Runs inside the GNOME Shell process only (imports St/Clutter); never import
// this module from prefs.js or from the pure-logic unit tests.
//
// Each helper detects capabilities at runtime instead of parsing version
// strings, so the extension never passes an unknown GObject property to a
// constructor (GJS throws on unknown properties) and keeps working across the
// GNOME releases PinBar targets (45–51).

import Clutter from 'gi://Clutter';
import St from 'gi://St';

/**
 * Create a vertical St.BoxLayout.
 *
 * St.BoxLayout grew the Clutter.Orientation `orientation` property in GNOME
 * 48 alongside the legacy boolean `vertical` property; GNOME 51 removed
 * `vertical`, while GNOME 45–47 only have `vertical`. Set exactly one of the
 * two properties — whichever the running Shell actually supports — so the
 * icon-over-running-dot layout works on every target version.
 *
 * @param props - additional St.BoxLayout constructor properties
 * @returns {St.BoxLayout} a box laid out vertically
 */
export function createVerticalBoxLayout(props = {}) {
    const supportsOrientation = 'orientation' in St.BoxLayout.prototype;
    return new St.BoxLayout(supportsOrientation
        ? {...props, orientation: Clutter.Orientation.VERTICAL}
        : {...props, vertical: true});
}
