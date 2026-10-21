// panelApps.js — panel container, per-app icon buttons, context menus,
// running state and overflow.
//
// Runs inside the GNOME Shell process. The container is a PanelMenu.Button
// because Main.panel.addToStatusArea() requires it; its menu is the overflow
// menu, and each pinned app is its own interactive St.Button.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    normalizeIconSize,
    normalizeMaxVisibleApps,
    normalizePanelBox,
    normalizePanelPosition,
    partitionPinned,
} from './settings.js';

const FALLBACK_ICON_NAME = 'application-x-executable-symbolic';
const MENU_ICON_NAME = 'view-app-grid-symbolic';

const AppButton = GObject.registerClass(
class AppButton extends St.Button {
    _init(app, options) {
        super._init({
            style_class: 'panel-apps-app-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: app.get_name(),
        });

        this._app = app;
        this._options = options;
        this._menu = null;

        this._box = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._icon = new St.Icon({ icon_size: options.iconSize });
        this._dot = new St.Widget({
            style_class: 'panel-apps-running-dot',
            visible: false,
        });
        this._box.add_child(this._icon);
        this._box.add_child(this._dot);
        this.add_child(this._box);

        this._refreshIcon();
        this._refreshRunning();

        this.connect('clicked', () => this._activate());
        this.connect('button-press-event', (actor, event) => this._onButtonPress(event));
        this.connect('destroy', () => this._onDestroy());
    }

    _onButtonPress(event) {
        if (event.get_button() === Clutter.BUTTON_SECONDARY) {
            this._openMenu();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _activate() {
        try {
            this._app.activate();
        } catch (e) {
            logError(e, 'panel-apps: application activation failed');
        }
    }

    _openMenu() {
        if (!this._menu) {
            this._menu = new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP);
            Main.uiGroup.add_child(this._menu.actor);
            this._menu.actor.hide();
            Main.panel.menuManager.addMenu(this._menu);

            if (this._app.can_open_new_window()) {
                const item = new PopupMenu.PopupMenuItem('Open New Window');
                item.connect('activate', () => {
                    try {
                        this._app.open_new_window(-1);
                    } catch (e) {
                        logError(e, 'panel-apps: open new window failed');
                    }
                });
                this._menu.addMenuItem(item);
            }

            const unpin = new PopupMenu.PopupMenuItem('Unpin');
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

    _refreshRunning() {
        this._dot.visible = this._options.showRunningIndicator &&
            this._app.get_state() === Shell.AppState.RUNNING;
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

export const PanelApps = GObject.registerClass(
class PanelApps extends PanelMenu.Button {
    _init(settings, catalog) {
        super._init(0.5, 'Panel Apps', false);

        this._settings = settings;
        this._catalog = catalog;
        this._buttons = new Map();
        this._connections = [];
        this._rebuildTimeout = 0;

        // Disable the built-in "any click toggles the menu" gesture so that
        // clicks on child app buttons never open the overflow menu.
        this._clickGesture.set_enabled(false);

        this._box = new St.BoxLayout({ style_class: 'panel-apps-indicator' });
        this.add_child(this._box);

        this._menuButton = new St.Button({
            style_class: 'panel-apps-menu-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: 'Panel Apps',
        });
        this._menuButton.add_child(new St.Icon({
            icon_name: MENU_ICON_NAME,
            icon_size: 16,
            style_class: 'system-status-icon',
        }));
        this._menuButton.connect('clicked', () => this.menu.toggle());
        this._box.add_child(this._menuButton);
    }

    enable() {
        this._connectSignals();
        this._rebuild();
        Main.panel.addToStatusArea(
            'panel-apps', this, this._panelPosition(), this._panelBox());
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
        this._connect(s, 'changed::max-visible-apps', () => this._rebuild());
        this._connect(s, 'changed::icon-size', () => this._applyIconSize());
        this._connect(s, 'changed::show-running-indicator', () => this._applyRunningIndicator());

        this._connect(this._catalog.appSystem, 'installed-changed', () => this._debounceRebuild());
        this._connect(this._catalog.appSystem, 'app-state-changed', (sys, app) => {
            const button = this._buttons.get(app.get_id());
            if (button)
                button._refreshRunning();
        });
        this._connect(this._catalog.parentalControls, 'app-filter-changed', () => this._debounceRebuild());
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
            GLib.source_remove(this._rebuildTimeout);
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

        const maxVisible = normalizeMaxVisibleApps(this._settings.get_int('max-visible-apps'));
        const iconSize = normalizeIconSize(this._settings.get_int('icon-size'));
        const showRunning = this._settings.get_boolean('show-running-indicator');

        // Resolve pinned IDs to Shell.App, keeping only installed + eligible apps.
        const appById = new Map();
        const availableIds = new Set();
        for (const id of this._pinnedIds()) {
            const app = this._catalog.lookupApp(id);
            if (!app)
                continue;
            const appInfo = app.get_app_info();
            if (appInfo && !this._catalog.isEligible(appInfo))
                continue; // unavailable or hidden by parental controls
            availableIds.add(id);
            appById.set(id, app);
        }

        const { visible, overflow } = partitionPinned(this._pinnedIds(), availableIds, maxVisible);

        for (const id of visible) {
            const button = new AppButton(appById.get(id), {
                iconSize,
                showRunningIndicator: showRunning,
                onUnpin: id => this._unpin(id),
            });
            this._buttons.set(id, button);
            // Insert before the always-last menu button.
            this._box.insert_child_at_index(button, this._box.get_n_children() - 1);
        }

        this._rebuildMenuButton(overflow.map(id => appById.get(id)));
    }

    _rebuildMenuButton(overflowApps) {
        this.menu.removeAll();
        for (const app of overflowApps) {
            const item = new PopupMenu.PopupMenuItem(app.get_name());
            item.connect('activate', () => {
                try {
                    app.activate();
                } catch (e) {
                    logError(e, 'panel-apps: application activation failed');
                }
            });
            this.menu.addMenuItem(item);
        }
        if (overflowApps.length > 0)
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(''));
    }

    _unpin(id) {
        const ids = this._pinnedIds().filter(x => x !== id);
        this._settings.set_strv('pinned-apps', ids);
    }

    _onDestroy() {
        if (this._rebuildTimeout) {
            GLib.source_remove(this._rebuildTimeout);
            this._rebuildTimeout = 0;
        }
        for (const [emitter, id] of this._connections)
            emitter.disconnect(id);
        this._connections = [];
        super._onDestroy();
    }
});

