# Maintainer: AcroPolis914 <hed-phsuarnaba@smu.edu.ph>
pkgname=hyprsettings-git
pkgrel=1
pkgdesc="Configurator for Hyprland (alpha, development version)"
arch=('x86_64')
url="https://github.com/acropolis914/hyprsettings"
license=('GPL3')
depends=('python' 'python-gobject' 'gtk3' 'python-pywebview' 'python-tomlkit' 'python-rich')
makedepends=('git')
source=("$pkgname::git+https://github.com/acropolis914/hyprsettings.git")
md5sums=('SKIP')

pkgver() {
  cd "$pkgname"
  git describe --long --abbrev=7 | sed 's/\([^-]*-g\)/r\1/;s/-/./g'
}


package() {
    local install_dir="$pkgdir/.local/bin/hyprsettings"

    mkdir -p "$install_dir"
    cp -r "$srcdir/$pkgname/"* "$install_dir/"

    # Shebang wrapper
    cat > "$pkgdir/.local/bin/hyprsettings" <<'EOF'
#!/usr/bin/env sh
exec "$HOME/.local/bin/hyprsettings/src/ui.py" "$@"
EOF
    chmod +x "$pkgdir/.local/bin/hyprsettings"

    # Desktop entry
    mkdir -p "$pkgdir/.local/share/applications"
    cat > "$pkgdir/.local/share/applications/hyprsettings.desktop" <<EOF
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
    mkdir -p "$pkgdir/.local/share/icons/hicolor/48x48/apps/"
    install -Dm644 "$srcdir/$pkgname/assets/icon.png" \
        "$pkgdir/.local/share/icons/hicolor/48x48/apps/hyprsettings.png"
}