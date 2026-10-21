// appCatalog.js — Shell-side application registry lookup, filtering and
// change monitoring.
//
// Runs inside the GNOME Shell process. Uses the same desktop-application
// registry that underlies GNOME's Show Applications view.
//
// Eligibility (verified against gnome-shell 50 js/ui/appDisplay.js and
// js/misc/parentalControlsManager.js):
//   - appInfo.get_id() must not throw (invalid file encodings are skipped)
//   - parentalControlsManager.shouldShowApp(appInfo), which itself applies
//       * Gio.AppInfo.should_show()  (NoDisplay/Hidden/OnlyShowIn/NotShowIn)
//       * the malcontent parental-controls app filter, when enabled
// Unlike the grid, favourites are not excluded: favourites are only moved to
// the dash for layout, but remain eligible applications a user may pin.

import Shell from 'gi://Shell';

import * as ParentalControlsManager from 'resource:///org/gnome/shell/misc/parentalControlsManager.js';

export class AppCatalog {
    constructor() {
        // Emitters exposed for signal connection/disconnection by callers.
        this.appSystem = Shell.AppSystem.get_default();
        this.parentalControls = ParentalControlsManager.getDefault();
    }

    /** Whether a GAppInfo is an eligible, user-visible application. */
    isEligible(appInfo) {
        try {
            appInfo.get_id(); // catch invalid file encodings
        } catch (e) {
            return false;
        }
        return this.parentalControls.shouldShowApp(appInfo);
    }

    /** Eligible installed applications as GAppInfo objects (not Shell.App). */
    getInstalledApps() {
        const result = [];
        for (const appInfo of this.appSystem.get_installed()) {
            if (this.isEligible(appInfo))
                result.push(appInfo);
        }
        return result;
    }

    /** Resolve a desktop ID (e.g. "org.gnome.Terminal.desktop") to a Shell.App. */
    lookupApp(id) {
        return this.appSystem.lookup_app(id) || null;
    }
}

