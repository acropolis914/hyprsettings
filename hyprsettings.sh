#!/bin/sh
LOCAL_PY="./hyprsettings.py"
TMP_PY="/tmp/hyprsettings_installer.py"
if [ -f "$LOCAL_PY" ]; then
    TARGET_PY="$LOCAL_PY"
else
    curl -sL "https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.py" -o "$TMP_PY"
    TARGET_PY="$TMP_PY"
fi
exec python3 "$TARGET_PY" "$@" </dev/tty