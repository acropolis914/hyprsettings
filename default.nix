{ lib
, stdenv
, python3
, fetchFromGitHub
, gtk3
, gobject-introspection
, wrapGAppsHook3
, makeWrapper
}:

let
  python = python3.withPackages (ps: with ps; [
    pywebview
    tomlkit
    rich
    pygobject3
  ]);
in
stdenv.mkDerivation rec {
  pname = "hyprsettings";
  version = "0.1.0";

  src = ./.;

  nativeBuildInputs = [
    makeWrapper
    wrapGAppsHook3
    gobject-introspection
  ];

  buildInputs = [
    gtk3
    python
  ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/share/hyprsettings
    cp -r src/* $out/share/hyprsettings/
    
    mkdir -p $out/bin
    makeWrapper ${python}/bin/python $out/bin/hyprsettings \
      --add-flags "$out/share/hyprsettings/ui.py" \
      --prefix PYTHONPATH : "$out/share/hyprsettings" \
      --prefix GI_TYPELIB_PATH : "$GI_TYPELIB_PATH"

    runHook postInstall
  '';

  meta = with lib; {
    description = "A configurator for hyprland.conf built with Python and web technologies";
    homepage = "https://github.com/wiktormalyska/hyprsettings-nixos";
    license = licenses.gpl3Plus;
    maintainers = [ ];
    platforms = platforms.linux;
    mainProgram = "hyprsettings";
  };
}
