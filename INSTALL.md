# PinBar — Installation

Steps to install the **PinBar** extension (UUID `pinbar@lisandro.local`)
for GNOME Shell 50 on Fedora Workstation (Wayland).

No root privileges are required — everything installs under `~/.local`.

## 1. Prerequisites

- Fedora Workstation on **Wayland**
- GNOME Shell **50** (tested on 50.5)

## 2. Install (development, from this checkout)

Run these from the project root (the directory that contains
`pinbar@lisandro.local/`):

```sh
# 2a. Compile the GSettings schema (strict)
glib-compile-schemas --strict pinbar@lisandro.local/schemas/

# 2b. Link the extension into the per-user extensions directory
ln -s "$PWD/pinbar@lisandro.local" \
    ~/.local/share/gnome-shell/extensions/pinbar@lisandro.local

# 2c. Make the schema visible to the running session
mkdir -p ~/.local/share/glib-2.0/schemas
cp pinbar@lisandro.local/schemas/org.gnome.shell.extensions.pinbar.gschema.xml \
    ~/.local/share/glib-2.0/schemas/
glib-compile-schemas ~/.local/share/glib-2.0/schemas/
```

> **Important:** GNOME Shell only scans the extensions directory **at
> startup**. If the extension was added while the Shell was already running,
> you must **log out and log back in** before it is discoverable. On Wayland
> there is no safe in-place reload (do not use Alt+F2 → `r`).

## 3. Enable and open preferences

After logging back in:

```sh
gnome-extensions enable pinbar@lisandro.local
gnome-extensions prefs pinbar@lisandro.local
```

Then:
1. Open **Preferences → Applications**.
2. Search an app and toggle its switch to pin it.
3. Use **Move Up / Move Down** to reorder; configure placement, icon size,
   running dot and maximum visible apps under **Preferences → Panel**.

## 4. Install (packaged `.zip`, no dev checkout)

Build the bundle and install it:

```sh
./build.sh
gnome-extensions install pinbar@lisandro.local.shell-extension.zip
```

`build.sh` runs the unit tests, compiles the schema, and packages the whole
extension directory into a zip using `gnome-extensions pack`. `metadata.json`,
`extension.js`, `prefs.js`, `stylesheet.css` and `schemas/` are packed
automatically; only the extra JS modules (`appCatalog.js`, `pinBar.js`,
`settings.js`) need `--extra-source`. `gnome-extensions install` compiles the
schema on install.

Then log out/in and enable as in step 3.

## 5. Uninstall

```sh
gnome-extensions uninstall pinbar@lisandro.local

# If you used the development install, also remove the symlink and schema:
rm -f ~/.local/share/gnome-shell/extensions/pinbar@lisandro.local
rm -f ~/.local/share/glib-2.0/schemas/org.gnome.shell.extensions.pinbar.gschema.xml
glib-compile-schemas ~/.local/share/glib-2.0/schemas/
```

## 6. Troubleshooting

- **`gnome-extensions enable` says "does not exist"** — the running Shell
  started before the extension existed. Log out and log back in.
- **`gnome-extensions prefs` prints usage** — the command is `prefs`
  (not `pref`).
- **To verify it loaded** — `gnome-extensions info pinbar@lisandro.local`
  should show `State: ACTIVE`.
- **To watch for errors** — `journalctl --user -f -o cat | grep -i pinbar`.
