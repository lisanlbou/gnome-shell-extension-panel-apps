// extension.js — GNOME Shell extension lifecycle and coordination.
//
// This module runs inside the GNOME Shell process and may import Shell, St,
// Meta and the resource:///org/gnome/shell/* modules. It must never import
// GTK or Adwaita (those only work in the preferences process).

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { AppCatalog } from './appCatalog.js';
import { PinBar } from './pinBar.js';

export default class PinBarExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._catalog = new AppCatalog();
        this._pinBar = new PinBar(this._settings, this._catalog);
        this._pinBar.enable();

        // Placement changes require re-adding the indicator to the panel.
        this._placementIds = [
            this._settings.connect('changed::panel-box', () => this._recreate()),
            this._settings.connect('changed::panel-position', () => this._recreate()),
        ];
    }

    _recreate() {
        this._pinBar.destroy();
        this._pinBar = null;
        this._pinBar = new PinBar(this._settings, this._catalog);
        this._pinBar.enable();
    }

    disable() {
        if (this._placementIds) {
            for (const id of this._placementIds)
                this._settings.disconnect(id);
            this._placementIds = null;
        }

        if (this._pinBar) {
            this._pinBar.destroy();
            this._pinBar = null;
        }
        this._catalog = null;
        this._settings = null;
    }
}

