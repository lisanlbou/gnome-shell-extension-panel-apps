// tests/run-tests.js — pure-logic checks for settings.js.
//
// Run with:  gjs -m tests/run-tests.js
//
// Only pure-logic modules (no Shell/GTK/Adwaita imports) can be exercised by a
// standalone GJS process. Shell/UI behaviour still needs a real or nested
// GNOME Shell session.

import * as S from '../pinbar@work_in_progress/settings.js';

let passed = 0;
let failed = 0;

function ok(cond, msg) {
    if (cond) {
        passed++;
        console.log(`ok - ${msg}`);
    } else {
        failed++;
        console.error(`FAIL - ${msg}`);
    }
}

function eq(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    ok(a === e, `${msg} (got ${a}, want ${e})`);
}

// clamp
eq(S.clamp(5, 1, 10), 5, 'clamp within range');
eq(S.clamp(0, 1, 10), 1, 'clamp below range');
eq(S.clamp(99, 1, 10), 10, 'clamp above range');
eq(S.clamp(NaN, 1, 10), 1, 'clamp NaN falls back to min');
eq(S.clamp('7', 1, 10), 7, 'clamp coerces numeric string');

// normalizePanelBox
eq(S.normalizePanelBox('left'), 'left', 'panel box "left" is valid');
eq(S.normalizePanelBox('center'), 'center', 'panel box "center" is valid');
eq(S.normalizePanelBox('right'), 'right', 'panel box "right" is valid');
eq(S.normalizePanelBox('bogus'), 'right', 'panel box invalid -> default');

// normalizeIconSize
eq(S.normalizeIconSize(8), 16, 'icon size below min -> 16');
eq(S.normalizeIconSize(64), 32, 'icon size above max -> 32');
eq(S.normalizeIconSize(24), 24, 'icon size within range');

// normalizePanelPosition
eq(S.normalizePanelPosition(-3), 0, 'negative position -> 0');
eq(S.normalizePanelPosition(2.9), 2, 'fractional position floored');
eq(S.normalizePanelPosition('x'), 0, 'non-numeric position -> 0');

// dedupeDesktopIds
eq(S.dedupeDesktopIds(['a.desktop', 'b.desktop', 'a.desktop']),
   ['a.desktop', 'b.desktop'], 'dedupe preserves first occurrence');
eq(S.dedupeDesktopIds(['  ', 'a.desktop', '', 'b.desktop']),
   ['a.desktop', 'b.desktop'], 'dedupe drops blank entries');
eq(S.dedupeDesktopIds(['a.desktop', 'a.desktop ']),
   ['a.desktop'], 'dedupe trims surrounding whitespace');
eq(S.dedupeDesktopIds(null), [], 'dedupe non-array -> []');
eq(S.dedupeDesktopIds(['x.desktop', 42, 'y.desktop']),
   ['x.desktop', 'y.desktop'], 'dedupe drops non-strings');

// moveItem
eq(S.moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a'], 'move first to last');
eq(S.moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b'], 'move last to first');
eq(S.moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c'], 'move no-op');
eq(S.moveItem(['a', 'b', 'c'], 0, 99), ['b', 'c', 'a'], 'move clamps target');
eq(S.moveItem(['a', 'b', 'c'], 5, 0), ['a', 'b', 'c'], 'move invalid from');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0)
    throw new Error(`${failed} test(s) failed`);
