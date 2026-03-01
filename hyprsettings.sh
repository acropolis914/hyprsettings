#!/bin/sh
""":"
# Polyglot: runs under sh and python
TMP_INSTALLER="/tmp/hyprsettings_installer.py"

# Download the latest hyprsettings.py
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.py -o "$TMP_INSTALLER"

# Execute it with python3, passing all args
exec python3 "$TMP_INSTALLER" "$@"
":"""