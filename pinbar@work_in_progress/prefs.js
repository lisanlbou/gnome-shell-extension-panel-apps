// prefs.js — GTK4/libadwaita preferences with a searchable application picker.
// Runs in the standalone preferences process; never import Shell/St/Meta here.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';
import {
    ExtensionPreferences,
    gettext as _,
    pgettext,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {
    dedupeDesktopIds,
    isPinnableId,
    moveItem,
    normalizeIconSize,
    normalizePanelBox,
    normalizePanelPosition,
} from './settings.js';

const ICON_PIXEL_SIZE = 24;

export default class PinBarPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();
        this._apps = this._loadApps();

        const page = new Adw.PreferencesPage({
            title: 'PinBar',
            icon_name: 'view-app-grid-symbolic',
        });
        window.add(page);

        this._buildPinnedGroup(page);
        this._buildAllAppsGroup(page);
        this._buildPanelPage(window);
        this._buildAboutPage(window);

        // Track application install/uninstall while the window is open.
        this._monitor = Gio.AppInfoMonitor.get();
        this._monitorChangedId = this._monitor.connect('changed', () => {
            this._apps = this._loadApps();
            this._rebuildPinned();
            this._rebuildAllApps();
        });
        window.connect('destroy', () => this._cleanup());
    }

    _cleanup() {
        if (this._monitorChangedId) {
            this._monitor.disconnect(this._monitorChangedId);
            this._monitorChangedId = 0;
        }
    }

    // --- application catalogue ------------------------------------------------

    _loadApps() {
        const apps = [];
        for (const info of Gio.AppInfo.get_all()) {
            let id, name, gicon;
            try {
                // get_name()/get_icon() read localized strings that can throw
                // on non-UTF-8 .desktop files; skip those entries.
                id = info.get_id();
                name = info.get_name();
                gicon = info.get_icon();
            } catch (e) {
                continue;
            }
            // get_id() legitimately returns null for entries without a stable
            // desktop ID; they cannot be pinned, searched or sorted safely.
            if (!isPinnableId(id) || !name)
                continue;
            if (!info.should_show())
                continue;
            apps.push({id, name, gicon});
        }
        apps.sort((a, b) => a.name.localeCompare(b.name));
        return apps;
    }

    _findApp(id) {
        return this._apps.find(app => app.id === id);
    }

    // Adw.ActionRow title/subtitle are Pango markup; escape user-provided text.
    _esc(text) {
        return GLib.markup_escape_text(text, -1);
    }

    // --- pinned app ordering helpers ------------------------------------------

    _getPinned() {
        return dedupeDesktopIds(this._settings.get_strv('pinned-apps'));
    }

    _setPinned(ids) {
        this._settings.set_strv('pinned-apps', dedupeDesktopIds(ids));
    }

    _onToggle(id, active) {
        const pinned = this._getPinned();
        if (active) {
            if (!pinned.includes(id))
                this._setPinned([...pinned, id]);
        } else {
            this._setPinned(pinned.filter(x => x !== id));
        }
        this._rebuildPinned();
    }

    _move(id, delta) {
        const pinned = this._getPinned();
        const from = pinned.indexOf(id);
        if (from < 0)
            return;
        this._setPinned(moveItem(pinned, from, from + delta));
        this._rebuildPinned();
    }

    // --- pinned section -------------------------------------------------------

    _buildPinnedGroup(page) {
        this._pinnedGroup = new Adw.PreferencesGroup({
            title: _('Pinned applications'),
            description: _('Apps shown in the top panel, in order. Missing apps are unavailable until reinstalled.'),
        });
        page.add(this._pinnedGroup);

        this._pinnedList = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE});
        this._pinnedList.add_css_class('boxed-list');
        this._pinnedGroup.add(this._pinnedList);

        this._rebuildPinned();
    }

    // Gtk.ListBox.remove_all() needs GTK 4.12, but GNOME 45 distro baselines
    // can ship older GTK4 (e.g. Debian 12 with 4.8), so remove children
    // manually for portability.
    _clearList(list) {
        let child = list.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            list.remove(child);
            child = next;
        }
    }

    _rebuildPinned() {
        this._clearList(this._pinnedList);

        const pinned = this._getPinned();
        if (pinned.length === 0) {
            this._pinnedList.append(new Adw.ActionRow({
                title: _('No applications pinned'),
                subtitle: _('Search below and enable an application to pin it.'),
                sensitive: false,
            }));
            return;
        }

        pinned.forEach((id, index) => {
            this._pinnedList.append(this._makePinnedRow(id, index, pinned.length));
        });
    }

    _makePinnedRow(id, index, total) {
        const app = this._findApp(id);
        const missing = !app;
        const row = new Adw.ActionRow({
            title: this._esc(app ? app.name : id),
            subtitle: this._esc(missing ? _('%s — unavailable').format(id) : id),
        });

        const img = app?.gicon
            ? new Gtk.Image({gicon: app.gicon, pixel_size: ICON_PIXEL_SIZE})
            : new Gtk.Image({icon_name: 'dialog-question-symbolic', pixel_size: ICON_PIXEL_SIZE});
        row.add_prefix(img);

        const buttons = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 0});
        const up = new Gtk.Button({
            icon_name: 'go-up-symbolic',
            tooltip_text: _('Move up'),
            sensitive: index > 0,
            has_frame: false,
        });
        const down = new Gtk.Button({
            icon_name: 'go-down-symbolic',
            tooltip_text: _('Move down'),
            sensitive: index < total - 1,
            has_frame: false,
        });
        up.connect('clicked', () => this._move(id, -1));
        down.connect('clicked', () => this._move(id, +1));
        buttons.append(up);
        buttons.append(down);
        row.add_suffix(buttons);

        return row;
    }

    // --- searchable "all applications" section --------------------------------

    _buildAllAppsGroup(page) {
        const group = new Adw.PreferencesGroup({
            title: _('All applications'),
            description: _('Search by name or desktop ID.'),
        });
        page.add(group);

        this._searchEntry = new Gtk.SearchEntry({
            placeholder_text: _('Search applications…'),
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 6,
            margin_end: 6,
        });
        this._searchEntry.connect('search-changed', () => this._rebuildAllApps());
        group.add(this._searchEntry);

        this._allAppsList = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE});
        this._allAppsList.add_css_class('boxed-list');
        group.add(this._allAppsList);

        this._rebuildAllApps();
    }

    _rebuildAllApps() {
        this._clearList(this._allAppsList);

        const query = this._searchEntry.get_text().trim().toLocaleLowerCase();
        const pinned = new Set(this._getPinned());

        for (const app of this._apps) {
            if (query &&
                !app.name.toLocaleLowerCase().includes(query) &&
                !app.id.toLocaleLowerCase().includes(query))
                continue;
            this._allAppsList.append(this._makeAppRow(app, pinned.has(app.id)));
        }
    }

    _makeAppRow(app, active) {
        const row = new Adw.ActionRow({
            title: this._esc(app.name),
            subtitle: this._esc(app.id),
        });

        const img = app.gicon
            ? new Gtk.Image({gicon: app.gicon, pixel_size: ICON_PIXEL_SIZE})
            : new Gtk.Image({icon_name: 'application-x-executable-symbolic', pixel_size: ICON_PIXEL_SIZE});
        row.add_prefix(img);

        const sw = new Gtk.Switch({active, valign: Gtk.Align.CENTER});
        row.add_suffix(sw);
        row.activatable_widget = sw;
        sw.connect('notify::active', () => this._onToggle(app.id, sw.active));

        return row;
    }

    // --- panel configuration --------------------------------------------------

    _panelBoxLabel(box) {
        // Keep the combobox entries translated but distinguishable from
        // generic words like "Left"/"Right" elsewhere in the UI.
        switch (box) {
        case 'left':
            return pgettext('Panel box', 'Left');
        case 'center':
            return pgettext('Panel box', 'Center');
        default:
            return pgettext('Panel box', 'Right');
        }
    }

    _buildPanelPage(window) {
        const page = new Adw.PreferencesPage({
            title: _('Panel'),
            icon_name: 'org.gnome.Settings-panel-symbolic',
        });
        window.add(page);

        const placement = new Adw.PreferencesGroup({
            title: _('Placement'),
            description: _('Where the icons appear in the top panel.'),
        });
        page.add(placement);

        const boxes = ['left', 'center', 'right'];
        const boxModel = new Gtk.StringList();
        for (const box of boxes)
            boxModel.append(this._panelBoxLabel(box));
        const boxRow = new Adw.ComboRow({
            title: _('Panel box'),
            model: boxModel,
            selected: boxes.indexOf(normalizePanelBox(this._settings.get_string('panel-box'))),
        });
        boxRow.connect('notify::selected', () => {
            if (boxRow.selected >= 0)
                this._settings.set_string('panel-box', boxes[boxRow.selected]);
        });
        placement.add(boxRow);

        const positionRow = new Adw.SpinRow({
            title: _('Panel position'),
            subtitle: _('Index within the selected panel box.'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
            }),
            value: normalizePanelPosition(this._settings.get_int('panel-position')),
        });
        positionRow.connect('notify::value', () => {
            this._settings.set_int('panel-position', Math.round(positionRow.value));
        });
        placement.add(positionRow);

        const appearance = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });
        page.add(appearance);

        const iconSizeRow = new Adw.SpinRow({
            title: _('Icon size'),
            adjustment: new Gtk.Adjustment({
                lower: 16,
                upper: 32,
                step_increment: 1,
            }),
            value: normalizeIconSize(this._settings.get_int('icon-size')),
        });
        iconSizeRow.connect('notify::value', () => {
            this._settings.set_int('icon-size', Math.round(iconSizeRow.value));
        });
        appearance.add(iconSizeRow);

        const runningRow = new Adw.SwitchRow({
            title: _('Running indicator'),
            subtitle: _('Show a small dot under running applications.'),
            active: this._settings.get_boolean('show-running-indicator'),
        });
        runningRow.connect('notify::active', () => {
            this._settings.set_boolean('show-running-indicator', runningRow.active);
        });
        appearance.add(runningRow);
    }

    _buildAboutPage(window) {
        const page = new Adw.PreferencesPage({
            title: _('About'),
            icon_name: 'help-about-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'PinBar',
            description: _('Pin favourite applications to the top panel. Search installed apps in Preferences and click an icon to launch or focus it.'),
        });
        page.add(group);

        group.add(new Adw.ActionRow({title: _('Version'), subtitle: this.metadata['version-name']}));
        group.add(new Adw.ActionRow({title: _('Author'), subtitle: 'lisanlbou@work_in_progress'}));
    }
}
