// appCatalog.js — Shell-side application registry lookup, filtering and
// change monitoring.
//
// Runs inside the GNOME Shell process. Uses the same desktop-application
// registry that underlies GNOME's Show Applications view.
//
// Eligibility (verified against the gnome-shell 45–50 js/ui/appDisplay.js and
// js/misc/parentalControlsManager.js sources):
//   - appInfo.get_id() must return a nonempty, stable desktop ID (it can be
//     null for ID-less entries, and it can throw on invalid file encodings)
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
        let id;
        try {
            id = appInfo.get_id();
        } catch (e) {
            return false; // invalid .desktop file encodings
        }
        if (!id)
            return false; // null/empty ID: cannot be pinned or looked up

        // shouldShowApp() has kept this signature from GNOME 45 through 50.
        // The typeof guard is a narrow fallback so a future Shell dropping
        // the method does not break enable(); we then still honour the
        // desktop file's own visibility flags instead of showing everything.
        if (this.parentalControls &&
            typeof this.parentalControls.shouldShowApp === 'function')
            return this.parentalControls.shouldShowApp(appInfo);

        return appInfo.should_show();
    }

    /** Resolve a desktop ID (e.g. "org.gnome.Terminal.desktop") to a Shell.App. */
    lookupApp(id) {
        if (!id)
            return null;
        return this.appSystem.lookup_app(id) || null;
    }

    /**
     * Subscribe to parental-controls app-filter changes through the manager
     * singleton. Returns a signal ID (0 when the service is unavailable) that
     * must be released with disconnectAppFilterChanged().
     */
    connectAppFilterChanged(callback) {
        const manager = this.parentalControls;
        if (!manager || typeof manager.connect !== 'function')
            return 0;
        return manager.connect('app-filter-changed', callback);
    }

    /** Release a signal ID from connectAppFilterChanged(); safe with 0. */
    disconnectAppFilterChanged(id) {
        if (id && this.parentalControls)
            this.parentalControls.disconnect(id);
    }
}
