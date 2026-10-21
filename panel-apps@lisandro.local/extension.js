// extension.js — GNOME Shell extension lifecycle and coordination.
//
// This module runs inside the GNOME Shell process and may import Shell, St,
// Meta and the resource:///org/gnome/shell/* modules. It must never import
// GTK or Adwaita (those only work in the preferences process).

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { AppCatalog } from './appCatalog.js';
import { PanelApps } from './panelApps.js';

export default class PanelAppsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._catalog = new AppCatalog();
        this._panelApps = new PanelApps(this._settings, this._catalog);
        this._panelApps.enable();

        // Placement changes require re-adding the indicator to the panel.
        this._placementIds = [
            this._settings.connect('changed::panel-box', () => this._recreate()),
            this._settings.connect('changed::panel-position', () => this._recreate()),
        ];
    }

    _recreate() {
        this._panelApps.destroy();
        this._panelApps = new PanelApps(this._settings, this._catalog);
        this._panelApps.enable();
    }

    disable() {
        if (this._placementIds) {
            for (const id of this._placementIds)
                this._settings.disconnect(id);
            this._placementIds = null;
        }

        if (this._panelApps) {
            this._panelApps.destroy();
            this._panelApps = null;
        }
        this._catalog = null;
        this._settings = null;
    }
}

