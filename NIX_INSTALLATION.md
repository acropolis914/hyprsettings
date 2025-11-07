# NixOS Installation Guide for HyprSettings

This repository now includes NixOS packaging support, making it easy to install and use HyprSettings on NixOS systems.

## Installation Methods

### Method 1: Using Nix Flakes (Recommended)

#### As a system package

Add to your NixOS configuration (`/etc/nixos/configuration.nix` or flake):

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    hyprsettings.url = "github:wiktormalyska/hyprsettings-nixos";
  };

  outputs = { self, nixpkgs, hyprsettings, ... }: {
    nixosConfigurations.yourHostname = nixpkgs.lib.nixosSystem {
      modules = [
        hyprsettings.nixosModules.default
        {
          programs.hyprsettings.enable = true;
        }
      ];
    };
  };
}
```

#### Try without installing

```bash
nix run github:wiktormalyska/hyprsettings-nixos --no-write-lock-file
```

#### Install to user profile

```bash
nix profile install github:wiktormalyska/hyprsettings-nixos
```

### Method 2: Using traditional Nix

#### Build the package

```bash
nix-build
```

#### Install to user profile

```bash
nix-env -f default.nix -i
```

### Method 3: Using Home Manager

Add to your Home Manager configuration:

```nix
{
  home.packages = [
    (pkgs.callPackage /path/to/hyprsettings-nixos/default.nix { })
  ];
}
```

Or with flakes:

```nix
{
  inputs = {
    hyprsettings.url = "github:wiktormalyska/hyprsettings-nixos";
  };

  # In your home configuration
  home.packages = [
    inputs.hyprsettings.packages.${system}.default
  ];
}
```

## Usage

After installation, you can run HyprSettings with:

```bash
hyprsettings
```

### Adding to Hyprland

Add this keybind to your `~/.config/hypr/hyprland.conf`:

```
bind = SUPER, I, exec, hyprsettings
```

Replace `SUPER, I` with your preferred key combination.

## Development

### Enter development shell

```bash
nix develop
```

This will provide all necessary dependencies for development.

### Build locally

```bash
nix build
```

The result will be in `./result/bin/hyprsettings`.

## Features

- Full NixOS integration
- Automatic dependency management
- Clean installation and uninstallation
- Works with both Nix flakes and traditional Nix
- Optional NixOS module for system-wide installation

## Dependencies

All dependencies are handled automatically by Nix:
- Python 3
- PyWebView with GTK support
- python-tomlkit
- python-rich
- GTK3
- GObject Introspection

## License

See the LICENSE file in the repository root.
