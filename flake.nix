{
  description = "HyprSettings - A configurator for hyprland.conf";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages = {
          default = pkgs.callPackage ./default.nix { };
          hyprsettings = self.packages.${system}.default;
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
    ) // {
      # NixOS module
      nixosModules.default = { config, lib, pkgs, ... }:
        with lib;
        let
          cfg = config.programs.hyprsettings;
        in
        {
          options.programs.hyprsettings = {
            enable = mkEnableOption "HyprSettings configuration tool";

            package = mkOption {
              type = types.package;
              default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
              description = "The HyprSettings package to use";
            };
          };

          config = mkIf cfg.enable {
            environment.systemPackages = [ cfg.package ];
          };
        };
    };
}
