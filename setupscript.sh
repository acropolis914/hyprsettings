#!/usr/bin/env bash
# Pretty Python Qt Project Initializer using uv
# Made for Masterlord Paul

set -e

# ---------- Pretty Print Helpers ----------
spinner() {
	local pid=$1 delay=0.1 spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
	while ps a | awk '{print $1}' | grep -q "$pid" >/dev/null 2>&1; do
		for i in $(seq 0 9); do
			printf "\r   %s" "${spinstr:$i:1}"
			sleep $delay
		done
	done
	printf "\r  \033[32m Done!\033[0m\n"
}

say() {
	printf "\n\033[1;36m %s\033[0m\n" "$1"
}

err() {
	printf "\n\033[1;31m󰅙 Error: %s\033[0m\n" "$1" >&2
	exit 1
}

# ---------- Ask for project name ----------
echo -n " Enter project name (or '.' for current directory): "
read -r project_name
if [[ -z "$project_name" || "$project_name" == "." ]]; then
	project_dir="$PWD"
	project_name=$(basename "$PWD")
else
	project_dir="$PWD/$project_name"
	mkdir -p "$project_dir"
fi
cd "$project_dir" || exit 1

say "Initializing Python Qt UI project: $project_name"

# ---------- Check dependencies ----------
for dep in uv git; do
	if ! command -v "$dep" >/dev/null 2>&1; then
		err "$dep is required. Install it first (e.g., pacman -S $dep)"
	fi
done

# ---------- Initialize project ----------
say "Creating project with uv..."
uv init --python 3.10 --no-readme "$project_dir" > /dev/null 2>&1 &
spinner $!

# Source environment (uv automatically creates .venv)
if [[ -f ".venv/bin/activate" ]]; then
	source .venv/bin/activate
fi

# ---------- Choose Qt flavor ----------
echo -n " Use PySide6 or PyQt6? [pyside/pyqt] (default: pyside): "
read -r qt_choice
qt_choice=${qt_choice:-pyside}

if [[ "$qt_choice" == "pyqt" ]]; then
	main_dep="PyQt6"
else
	main_dep="PySide6"
fi

say "Installing $main_dep and dev tools..."
uv add "$main_dep" rich watchdog > /dev/null 2>&1 &
spinner $!

# ---------- Ask for extra deps ----------
echo -n " Additional Python deps (space-separated, or leave blank): "
read -r extra_deps
if [[ -n "$extra_deps" ]]; then
	say "Installing extra deps: $extra_deps"
	uv add $extra_deps > /dev/null 2>&1 &
	spinner $!
fi

# ---------- Create starter files ----------
say "Creating main.py and dev.sh..."

cat > main.py <<'EOF'
from rich.console import Console
from PySide6.QtWidgets import QApplication, QLabel
import sys

console = Console()
console.print("[bold green]🚀 Launching Qt UI...[/bold green]")

app = QApplication(sys.argv)
label = QLabel("Hello, Qt World!")
label.show()

sys.exit(app.exec())
EOF

cat > dev.sh <<'EOF'
#!/usr/bin/env bash
echo " Watching for changes..."
uv run watchmedo auto-restart --pattern="*.py" --recursive -- python main.py
EOF
chmod +x dev.sh

# ---------- Build + PKGBUILD ----------
say "Creating build.sh and PKGBUILD templates..."

cat > build.sh <<EOF
#!/usr/bin/env bash
# Build ELF bootstrapper (C++) + package metadata placeholder
echo " Building $project_name..."
# Future: compile bootstrapper or generate PKGBUILD tarball
EOF
chmod +x build.sh

cat > PKGBUILD <<EOF
# Maintainer: You <$USER@localhost>
pkgname=$project_name
pkgver=0.1.0
pkgrel=1
pkgdesc="Python Qt UI project"
arch=('any')
depends=('python' '$main_dep')
source=()
sha256sums=()
package() {
    install -Dm755 "\$srcdir/main.py" "\$pkgdir/usr/share/$project_name/main.py"
}
EOF

say " Setup complete!"
echo "  To run your app:   uv run python main.py"
echo "  To watch live:     ./dev.sh"
echo "  To build package:  ./build.sh"

