// settings.js — pure helper functions for desktop IDs, ordering and defaults.
//
// This module MUST NOT import Shell, St, GTK, Adwaita or any other
// GNOME Shell / UI typelib. It is loaded both by the Shell process and by
// the (standalone GJS) preferences process and the unit tests, so it must
// only depend on plain JavaScript.

export const PANEL_BOXES = Object.freeze(['left', 'center', 'right']);

export const LIMITS = Object.freeze({
    iconSizeMin: 16,
    iconSizeMax: 32,
});

export const DEFAULTS = Object.freeze({
    panelBox: 'right',
    panelPosition: 0,
    iconSize: 16,
    showRunningIndicator: true,
});

/** Clamp a number into [min, max]; non-finite input falls back to min. */
export function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return min;
    return Math.min(max, Math.max(min, n));
}

/** Validate a panel box value, falling back to the default. */
export function normalizePanelBox(value) {
    return PANEL_BOXES.includes(value) ? value : DEFAULTS.panelBox;
}

/** Validate/bound an icon size value. */
export function normalizeIconSize(value) {
    return clamp(value, LIMITS.iconSizeMin, LIMITS.iconSizeMax);
}

/** Validate/bound a panel position index (must be a non-negative integer). */
export function normalizePanelPosition(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return Math.floor(n);
}

/**
 * Whether a value is a usable desktop ID. Gio.AppInfo.get_id() legitimately
 * returns null for ID-less entries, and such entries cannot be pinned,
 * searched by ID, sorted or stored, so every consumer rejects them up front.
 */
export function isPinnableId(id) {
    return typeof id === 'string' && id.trim().length > 0;
}

/**
 * Deduplicate a list of desktop IDs, preserving the first occurrence of each
 * and dropping empty/blank entries and non-strings.
 */
export function dedupeDesktopIds(ids) {
    if (!Array.isArray(ids))
        return [];
    const seen = new Set();
    const result = [];
    for (const id of ids) {
        if (typeof id !== 'string')
            continue;
        const trimmed = id.trim();
        if (trimmed.length === 0 || seen.has(trimmed))
            continue;
        seen.add(trimmed);
        result.push(trimmed);
    }
    return result;
}

/**
 * Move the item at `from` to position `to` (clamped), returning a new array.
 * Returns the input array unchanged when the move is a no-op or invalid.
 */
export function moveItem(array, from, to) {
    if (!Array.isArray(array) || array.length === 0)
        return array;
    if (!Number.isInteger(from) || from < 0 || from >= array.length)
        return array;
    let target = to;
    if (!Number.isInteger(target))
        return array;
    target = Math.max(0, Math.min(target, array.length - 1));
    if (target === from)
        return array;
    const result = array.slice();
    const [item] = result.splice(from, 1);
    result.splice(target, 0, item);
    return result;
}
