# Maintainer: Paul Harvey <hed-phsuarnaba@smu.edu.ph>
pkgname=hyprsettings-git
pkgver=v0.1.6alpha.r9.g7df9bb8   # placeholder; real version set by pkgver()
pkgrel=1
pkgdesc="Configurator for Hyprland (alpha, development version, user-local install)"
arch=('x86_64')
url="https://github.com/acropolis914/hyprsettings"
license=('GPL3')
depends=('python' 'python-gobject' 'gtk3' 'python-pywebview' 'python-tomlkit' 'python-rich')
makedepends=('git')
source=("$pkgname::git+https://github.com/acropolis914/hyprsettings.git")
md5sums=('SKIP')

pkgver() {
  cd "$srcdir/$pkgname"
  local tag rev_count commit
  tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "0.0.0")
  rev_count=$(git rev-list --count "$tag"..HEAD)
  commit=$(git rev-parse --short HEAD)
  printf "%s.r%s.g%s" "$tag" "$rev_count" "$commit"
}

package() {
    local local_dir="$pkgdir/$HOME/.local"
    local local_bin="$local_dir/bin"
    local repo_dir="$local_bin/hyprsettings-git"

    # Copy the repo code
    mkdir -p "$repo_dir"
    cp -r "$srcdir/$pkgname/"* "$repo_dir/"

    # Bash wrapper executable
    mkdir -p "$local_bin"
    cat > "$local_bin/hyprsettings" <<'EOF'
#!/usr/bin/env bash
exec "$HOME/.local/bin/hyprsettings-git/src/ui.py" "$@"
EOF
    chmod +x "$local_bin/hyprsettings"

    # Desktop entry
    mkdir -p "$local_dir/share/applications"
    cat > "$local_dir/share/applications/hyprsettings.desktop" <<EOF
[Desktop Entry]
Name=HyprSettings
Comment=Configurator for Hyprland
Exec=\$HOME/.local/bin/hyprsettings
Icon=\$HOME/.local/share/icons/hicolor/48x48/apps/hyprsettings.png
Terminal=false
Type=Application
Categories=Utility;
StartupNotify=true
EOF

    # Icon
    mkdir -p "$local_dir/share/icons/hicolor/48x48/apps/"
    install -Dm644 "$srcdir/$pkgname/assets/icon-48.png" \
        "$local_dir/share/icons/hicolor/48x48/apps/hyprsettings.png"
}
