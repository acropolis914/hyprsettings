# Justfile for hyprsettings project
# Run with `just <recipe>` from any directory

set unstable := true

# Full development setup (Python backend + Vite dev server)
dev:
    cd src/ui-src && bunx concurrently -k -s first -n py,vt -c cyan,green "sh ../../run.sh --bun-dev --debug --no-daemon --no-browser" "vite --host"

setup_dev:
    uv sync
    cd src/ui-src && bun install

# Kill hyprsettings process
kill-hs:
    hyprsettings -k &

# Kill processes on ports 3000 and 6969
kill-ports:
    sh -c 'for p in 3000 6969; do echo "\n== Port $p =="; lsof -iTCP:$p -sTCP:LISTEN -Pn | awk "NR>1 {print \"PID=\"$2, \"NAME=\"$1}"; lsof -tiTCP:$p -sTCP:LISTEN | xargs -r kill -9; done'

# Update version and stage changes
update-version:
    python tooling/git_tag_version.py && git add .

# Build UI and create PyInstaller executable
build-py:
    cd src/ui-src && bunx vite build && cd .. && pyinstaller --clean --distpath output hyprsettings.spec

# Build UI (alias for bun run build-ui)
build-ui:
    cd src/ui-src && bun run build-ui

# Build UI and preview the app
build-prev:
    cd src/ui-src && bunx vite build && cd ../../ && sh ./run.sh --debug --no-daemon

# Preview built UI (alias for bun run preview)
preview:
    cd src/ui-src && bun run preview

# Run the app in debug mode
hs-debug:
    sh ./run.sh --debug --no-daemon

hs:
    sh ./run.sh --no-daemon

# Clean fonts (alias for bun run clean-font)
clean-font:
    cd src/ui-src && bun run clean-font

# Format UI code (alias for bun run format)
format:
    cd src/ui-src && bun run format

generate-new-config-description:
    python tooling/ConfigDescriptions/sconfigdescriptions_parser.py

generate-dispatchers:
    python tooling/Dispatchers/getdispatchers.py

generate-wiki:
    python tooling/wiki-content-checkout.py

fmt:
    just --unstable --fmt
