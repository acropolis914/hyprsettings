#!/usr/bin/env bash
cd "$(dirname "$0")" || exit
. ".venv/bin/activate"
python "src/ui.py" "$@"
