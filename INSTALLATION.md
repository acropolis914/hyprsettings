# 💧HyprSettings Installation Guide

## 📖 Table of Contents

- [Universal Installer](#universal-installer-recommended)
- [Run Interactively](#run-interactively)
- [Non-interactive Install](#non-interactive-install-for-automation)
- [Supported System Dependencies](#supported-system-dependencies)
- [Arch Linux (AUR Package)](#arch-linux-aur-package)
- [NixOS Installation](#nixos-installation)
- [Non-Nix Users with Nix Installed](#non-nix-users-with-nix-installed)
- [Other Linux Distros](#other-linux-distros)
- [After Installation](#after-installation)
    - [Optional: Hyprland Keybind](#optional-hyprland-keybind)
    - [Optional: Autostart in background](#optional-autostart-in-background-may-not-work-on-gpu-only-setups)

---

## Universal Installer (Recommended)

> Works on **Arch, Nix, Debian, Void, Fedora, Alpine, openSUSE, and more**.  
> The installer automatically detects your distro and installs required dependencies.

The included installer script (`hyprsettings.sh`) will:

- Detect your Linux distribution
- Install required system dependencies automatically (Python, GTK, WebKit—see below)
- Clone the repository
- Set up a contained Python virtual environment (`.venv`)
- Install Python dependencies
- Create launcher links (`/usr/local/share/applications/hyprsettings*.desktop`)

---

## Run Interactively

To be safe, please check the content of the `hyprsettings.sh` and `hyprsettings.py` files in the repo first.

````bash
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.sh | sh
````

---

## Non-interactive Install (for automation)

Installs system-wide:

- `/usr/local/share/hyprsettings/`
- `/usr/local/bin/hyprsettings`

```bash
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.sh | sh -s -- --auto
```

---

## Supported System Dependencies

For non-detected distros, the installer will prompt you to install the following manually if missing:

- **Python Bridge**: `python3-gobject` / `python3-gi` / `pygobject3` / `gobject-introspection`
- **WebKit Engine**: `libwebkit2gtk-4.1` / `libwebkit2gtk41`
- **GUI Toolkit**: `gtk3` (or `gtk4` in some distros)

Pre-tested distro-specific mappings:

| Distro   | Packages Installed Automatically                                              |
|----------|-------------------------------------------------------------------------------|
| Arch     | `python-gobject`, `webkit2gtk`                                                |
| Fedora   | `python3-gobject`, `webkit2gtk4.1`, `gtk3`                                    |
| Void     | `gobject-introspection`, `libwebkit2gtk41`                                    |
| openSUSE | `python3-gobject`, `python3-gobject-Gdk`, `typelib-1_0-Gtk-4_0`, `libgtk-4-1` |
| Debian   | `python3-gi`, `python3-gi-cairo`, `gir1.2-gtk-4.0`                            |
| Alpine   | `python3-dev`, `py3-gobject3`, `webkit2gtk-4.1`                               |

Other distros can still run the installer, which will **check dependencies** and guide you.

---

## Arch Linux (AUR Package)

**HyprSettings is available on the AUR.** Install using your helper (example: `yay`):

```bash
yay -S hyprsettings-git
```

> **Note:** Arch users who initially installed via the installer script will be prompted to install from the AUR on
> rerun.
>
> After the first install, updates should be done through your package manager (pacman/AUR helper).  
> Running `hyprsettings --update` **is not available** for Arch package installations.

---

## NixOS Installation

See [INSTALLATION_NIX.md](INSTALLATION_NIX.md) for more info. You can also just run the script interactively and it will
give you options on how you want to install it. Available options include Flakes, Traditional, and Home Manager.

```bash
nix profile add github:acropolis914/hyprsettings
```

**Update Nix installation:**

```bash
nix profile upgrade hyprsettings --refresh
```

> **Note** Though we say that nix installation is supported, that is only applicable to the running of the Hyprsettings
> GUI. Configurations still have to be on separate `.conf` files for this to work. If your configuration is inside nix
> files, then this won't parse that.

---

## Non-Nix Users with Nix Installed

You can run the installer with:

```bash
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.sh | sh -s -- -e nixos
```

- The script will treat the system as NixOS
- Requires [`nixGL`](https://github.com/NixOS/nixGL) to run GUI apps
- Launch with:

```bash
nixGL hyprsettings [args]
```

---

## Other Linux Distros

For Debian, Fedora, Void, Alpine, openSUSE, and unknown distros:

- Run the universal installer as above
- Updates can be fetched by running:

```bash
hyprsettings --update
```

> **Note:** `--update` is not available for Arch/AUR or Nix installations.

---

## After Installation

You can now:

- Launch from your app launcher (rofi, wofi, walker, fuzzel, etc.) by searching **“HyprSettings”**
- Run from terminal:

```bash
hyprsettings
```

### Optional: Hyprland Keybind

```hyprland.conf
bind = SUPER, I, Exec, hyprsettings
```

### Optional: Autostart in background (may not work on GPU-only setups)

```hyprland.conf
exec-once = hyprsettings -d -H
```