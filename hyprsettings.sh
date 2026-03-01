#!/bin/sh

LOCAL_PY="./hyprsettings.py"
TMP_PY="/tmp/hyprsettings_installer.py"

if [ -f "$LOCAL_PY" ]; then
    TARGET_PY="$LOCAL_PY"
else
    # Ensure we start with a clean slate
    rm -f "$TMP_PY"

    # Download the fresh version
    curl -sL "https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.py" -o "$TMP_PY"
    TARGET_PY="$TMP_PY"

    # Cleanup: Delete the temp file when this script exits
    trap 'rm -f "$TMP_PY"' EXIT
fi

# Execute Python and pass all arguments ($@)
exec python3 "$TARGET_PY" "$@" </dev/tty