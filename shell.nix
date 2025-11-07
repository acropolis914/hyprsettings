{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    python3Packages.pywebview
    python3Packages.tomlkit
    python3Packages.rich
    python3Packages.pygobject3
    gtk3
    gobject-introspection
  ];

  shellHook = ''
    echo "HyprSettings development environment"
    echo "Run 'python src/ui.py' to start the application"
  '';
}
