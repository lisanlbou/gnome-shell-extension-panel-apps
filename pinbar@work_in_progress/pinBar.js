// pinBar.js — panel container, per-app icon buttons and context menus.
//
// Runs inside the GNOME Shell process. The container is a PanelMenu.Button
// because Main.panel.addToStatusArea() requires it; each pinned app is its
// own interactive St.Button shown directly in the panel.

import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {createVerticalBoxLayout} from './compat.js';
import {
    normalizeIconSize,
    normalizePanelBox,
    normalizePanelPosition,
} from './settings.js';

const FALLBACK_ICON_NAME = 'application-x-executable-symbolic';

const AppButton = GObject.registerClass({
    GTypeName: 'PinBarAppButton',
}, class AppButton extends St.Button {
    _init(app, options) {
        super._init({
            style_class: 'pinbar-app-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: app.get_name(),
        });

        this._app = app;
        this._options = options;
        this._menu = null;

        this._box = createVerticalBoxLayout({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._icon = new St.Icon({icon_size: options.iconSize});
        this._dot = new St.Widget({
            style_class: 'pinbar-running-dot',
            visible: false,
        });
        this._box.add_child(this._icon);
        this._box.add_child(this._dot);
        this.add_child(this._box);

        this._refreshIcon();
        this._refreshRunning();

        this.connect('clicked', () => this._activate());
        this.connect('button-press-event', (actor, event) => this._onButtonPress(event));
        this.connect('key-press-event', (actor, event) => this._onKeyPress(event));
        this.connect('destroy', () => this._onDestroy());
    }

    _onButtonPress(event) {
        if (event.get_button() === Clutter.BUTTON_SECONDARY) {
            this._openMenu();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    // Keyboard route to the context menu: the Menu key and Shift+F10 are the
    // standard "context menu" bindings; Enter/Space keep the default
    // St.Button behaviour and emit 'clicked' (launch/focus the app).
    _onKeyPress(event) {
        const symbol = event.get_key_symbol();
        const shiftF10 = symbol === Clutter.KEY_F10 &&
            (event.get_state() & Clutter.ModifierType.SHIFT_MASK) !== 0;
        if (symbol === Clutter.KEY_Menu || shiftF10) {
            this._openMenu();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _activate() {
        try {
            this._app.activate();
        } catch (e) {
            logError(e, 'pinbar: application activation failed');
        }
    }

    _openMenu() {
        if (!this._menu) {
            this._menu = new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP);
            Main.uiGroup.add_child(this._menu.actor);
            this._menu.actor.hide();

            // These app buttons are plain St.Button (not PanelMenu.Button), so
            // their menus are not auto-registered by the panel. Registering the
            // menu with Main.panel.menuManager (a private PopupMenuManager from
            // ui/panel.js) lets the panel coordinate open/close state, keyboard
            // navigation and dismissal, exactly as addToStatusArea() does for a
            // PanelMenu.Button's own menu. Verified against the panel.js sources
            // of GNOME 45–50; must be re-checked for later majors.
            Main.panel.menuManager.addMenu(this._menu);

            // Return keyboard focus to the app button when the menu closes so
            // Escape or activating an item does not leave focus on a hidden
            // menu actor.
            this._menu.connect('open-state-changed', (menu, open) => {
                if (open)
                    return;
                const focus = global.stage.get_key_focus();
                if (focus && menu.actor.contains(focus))
                    global.stage.set_key_focus(this);
            });

            if (this._app.can_open_new_window()) {
                const item = new PopupMenu.PopupMenuItem(_('Open New Window'));
                item.connect('activate', () => {
                    try {
                        this._app.open_new_window(-1);
                    } catch (e) {
                        logError(e, 'pinbar: open new window failed');
                    }
                });
                this._menu.addMenuItem(item);
            }

            const unpin = new PopupMenu.PopupMenuItem(_('Unpin'));
            unpin.connect('activate', () => this._options.onUnpin(this._app.get_id()));
            this._menu.addMenuItem(unpin);
        }
        this._menu.toggle();
    }

    _refreshIcon() {
        const gicon = this._app.get_icon();
        if (gicon)
            this._icon.gicon = gicon;
        else
            this._icon.icon_name = FALLBACK_ICON_NAME;
    }

    _isRunning() {
        return this._app.get_state() === Shell.AppState.RUNNING;
    }

    _refreshRunning() {
        const running = this._isRunning();
        this._dot.visible = this._options.showRunningIndicator && running;
        // Keep the accessible name in sync with the running state so screen
        // readers announce it on inspection; the update itself is silent.
        const name = this._app.get_name();
        this.accessible_name = running ? _('%s — running').format(name) : name;
    }

    setIconSize(size) {
        this._icon.icon_size = size;
    }

    setShowRunningIndicator(show) {
        this._options.showRunningIndicator = show;
        this._refreshRunning();
    }

    _onDestroy() {
        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }
    }
});

export const PinBar = GObject.registerClass({
    GTypeName: 'PinBarIndicator',
}, class PinBar extends PanelMenu.Button {
    _init(settings, catalog) {
        // dontCreateMenu = true: the container has no dropdown of its own —
        // app icons launch/focus their application directly. PanelMenu.Button
        // honours this flag on every target version (verified in the 45–50
        // sources): it installs a no-op PopupDummyMenu and keeps the click
        // handling disabled, so a primary click on empty container space does
        // nothing. This replaces the previous GNOME 50-only
        // `this._clickGesture.set_enabled(false)` line, which crashed enable()
        // on GNOME 45–49 where PanelMenu.Button has no _clickGesture.
        super._init(0.5, 'PinBar', true);

        this._settings = settings;
        this._catalog = catalog;
        this._buttons = new Map();
        this._connections = [];
        this._appFilterChangedId = 0;
        this._rebuildTimeout = 0;

        // The container is a plain layout host for the app buttons, not a
        // menu button; report it as a panel group instead of Atk.Role.MENU.
        this.set_accessible_role(Atk.Role.PANEL);

        this._box = new St.BoxLayout({style_class: 'pinbar-indicator'});
        this.add_child(this._box);
    }

    enable() {
        this._connectSignals();
        this._rebuild();
        Main.panel.addToStatusArea(
            'pinbar', this, this._panelPosition(), this._panelBox());
    }

    _panelBox() {
        return normalizePanelBox(this._settings.get_string('panel-box'));
    }

    _panelPosition() {
        return normalizePanelPosition(this._settings.get_int('panel-position'));
    }

    _connect(emitter, signal, callback) {
        this._connections.push([emitter, emitter.connect(signal, callback)]);
    }

    _connectSignals() {
        const s = this._settings;
        this._connect(s, 'changed::pinned-apps', () => this._rebuild());
        this._connect(s, 'changed::icon-size', () => this._applyIconSize());
        this._connect(s, 'changed::show-running-indicator', () => this._applyRunningIndicator());

        this._connect(this._catalog.appSystem, 'installed-changed', () => this._debounceRebuild());
        this._connect(this._catalog.appSystem, 'app-state-changed', (sys, app) => {
            const button = this._buttons.get(app.get_id());
            if (button)
                button._refreshRunning();
        });

        // Parental-controls filtering changes go through the catalog's narrow
        // adapter (the manager is a Shell singleton with its own lifecycle).
        this._appFilterChangedId = this._catalog.connectAppFilterChanged(
            () => this._debounceRebuild());
    }

    _applyIconSize() {
        const size = normalizeIconSize(this._settings.get_int('icon-size'));
        for (const button of this._buttons.values())
            button.setIconSize(size);
    }

    _applyRunningIndicator() {
        const show = this._settings.get_boolean('show-running-indicator');
        for (const button of this._buttons.values())
            button.setShowRunningIndicator(show);
    }

    _debounceRebuild() {
        if (this._rebuildTimeout)
            GLib.Source.remove(this._rebuildTimeout);
        this._rebuildTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
            this._rebuildTimeout = 0;
            this._rebuild();
            return GLib.SOURCE_REMOVE;
        });
    }

    _pinnedIds() {
        const seen = new Set();
        const result = [];
        for (const id of this._settings.get_strv('pinned-apps')) {
            if (seen.has(id))
                continue;
            seen.add(id);
            result.push(id);
        }
        return result;
    }

    _rebuild() {
        for (const button of this._buttons.values()) {
            this._box.remove_child(button);
            button.destroy();
        }
        this._buttons.clear();

        const iconSize = normalizeIconSize(this._settings.get_int('icon-size'));
        const showRunning = this._settings.get_boolean('show-running-indicator');

        // Resolve pinned IDs to Shell.App, keeping only installed + eligible
        // apps, and render each one as a panel icon (no overflow menu).
        for (const id of this._pinnedIds()) {
            const app = this._catalog.lookupApp(id);
            if (!app)
                continue;
            const appInfo = app.get_app_info();
            if (appInfo && !this._catalog.isEligible(appInfo))
                continue; // unavailable, hidden or filtered by parental controls

            const button = new AppButton(app, {
                iconSize,
                showRunningIndicator: showRunning,
                onUnpin: id => this._unpin(id),
            });
            this._buttons.set(id, button);
            this._box.add_child(button);
        }
    }

    _unpin(id) {
        const ids = this._pinnedIds().filter(x => x !== id);
        this._settings.set_strv('pinned-apps', ids);
    }

    _onDestroy() {
        if (this._rebuildTimeout) {
            GLib.Source.remove(this._rebuildTimeout);
            this._rebuildTimeout = 0;
        }
        for (const [emitter, id] of this._connections)
            emitter.disconnect(id);
        this._connections = [];
        this._catalog.disconnectAppFilterChanged(this._appFilterChangedId);
        this._appFilterChangedId = 0;
        super._onDestroy();
    }
});
