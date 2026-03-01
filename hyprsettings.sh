#!/bin/sh
TMP_INSTALLER="/tmp/hyprsettings_installer.py"
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.py -o "$TMP_INSTALLER"
exec python3 "$TMP_INSTALLER" "$@"