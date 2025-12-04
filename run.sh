#!/usr/bin/env bash
cd "$(dirname "$0")" || exit
source ".venv/bin/activate"
python "src/hyprsettings" "$@"
