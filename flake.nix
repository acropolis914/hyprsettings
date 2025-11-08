{
  description = "HyprSettings - A configurator for hyprland.conf";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages = rec {
          default = pkgs.callPackage ./default.nix { };
          hyprsettings = default;
        };

        apps = {
          default = {
            type = "app";
            program = "${self.packages.${system}.default}/bin/hyprsettings";
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            python3
            python3Packages.pywebview
            python3Packages.tomlkit
            python3Packages.rich
            python3Packages.pygobject3
            gtk3
            gobject-introspection
          ];
        };
      }
    )
    // {
      nixosModules.default = { config, lib, pkgs, ... }:
        with lib;
        let
          system = pkgs.stdenv.hostPlatform.system;
        in {
          options.programs.hyprsettings = {
            enable = mkEnableOption "HyprSettings configuration tool";

            package = mkOption {
              type = types.package;
              description = "The HyprSettings package to use";
              default = self.packages.${system}.default;
            };
          };

          config = mkIf config.programs.hyprsettings.enable {
            environment.systemPackages = [ config.programs.hyprsettings.package ];
          };
        };
    };
}