# Justfile for hyprsettings project
# Run with `just <recipe>` from any directory

# Full development setup (Python backend + Vite dev server)
dev:
    concurrently -k -s first -n py,vt -c cyan,green "sh ./run.sh --bun-dev --debug --no-daemon --no-browser" "cd src/ui-src && vite --host"

# Kill hyprsettings process
kill-hs:
    hyprsettings -k &

# Build UI and preview the app
bld-prev:
    cd src/ui-src && vite build && cd ../../ && sh ./run.sh --debug --no-daemon

# Run the app in debug mode
hs:
    sh ./run.sh --debug --no-daemon

# Kill processes on ports 3000 and 6969
kill-ports:
    sh -c 'for p in 3000 6969; do echo "\n== Port $p =="; lsof -iTCP:$p -sTCP:LISTEN -Pn | awk "NR>1 {print \"PID=\"$2, \"NAME=\"$1}"; lsof -tiTCP:$p -sTCP:LISTEN | xargs -r kill -9; done'

# Update version and stage changes
update-version:
    python tooling/git_tag_version.py && git add .

# Build UI and create PyInstaller executable
build-py:
    cd src/ui-src && vite build && cd .. && pyinstaller --clean --distpath output hyprsettings.spec

# Build UI (alias for npm run build-ui)
build-ui:
    cd src/ui-src && npm run build-ui

# Preview built UI (alias for npm run preview)
preview:
    cd src/ui-src && npm run preview

# Clean fonts (alias for npm run clean-font)
clean-font:
    cd src/ui-src && npm run clean-font

# Format UI code (alias for npm run format)
format:
    cd src/ui-src && npm run format

compare-last-config-description:
    webstorm diff src/ui-src/scripts/HyprlandSpecific/configDescriptions.ts tooling/ConfigDescriptions/hyprland_config_descriptions.js

generate-new-config-description:
    python tooling/ConfigDescriptions/sconfigdescriptions_parser.py
