#!/usr/bin/env bash
# build.sh — test, compile the schema, and package the extension.
set -euo pipefail
cd "$(dirname "$0")"

EXT=pinbar@work_in_progress

echo "==> Running unit tests"
gjs -m tests/run-tests.js

echo "==> Compiling GSettings schema"
glib-compile-schemas --strict "$EXT/schemas/"

echo "==> Packaging $EXT"
rm -f "$EXT.shell-extension.zip"
gnome-extensions pack --force \
    --extra-source=appCatalog.js \
    --extra-source=pinBar.js \
    --extra-source=settings.js \
    --extra-source=LICENSE \
    --extra-source=README.md \
    --extra-source=CHANGELOG.md \
    "$EXT"

echo "==> Done: $EXT.shell-extension.zip"
echo "    Install with: gnome-extensions install $EXT.shell-extension.zip"
