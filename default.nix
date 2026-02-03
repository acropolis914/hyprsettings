{ lib
, stdenv
, python3
, gtk3
, webkitgtk_4_1
, gobject-introspection
, wrapGAppsHook3
, makeWrapper
, runtimeShell
}:

let
  python = python3.withPackages (ps: with ps; [
    pywebview
    tomlkit
    rich
    pygobject3
    packaging
    flask
    python-dotenv
  ]);

  maintainersLocal = {
    acropolis914 = {
      name = "acropolis914";
      github = "acropolis914";
    };
    wiktormalyska = {
      name = "wiktormalyska";
      github = "wiktormalyska";
    };
  };
in
stdenv.mkDerivation rec {
  pname = "hyprsettings";
  version = "0.9.0";

  src = ./.;

  nativeBuildInputs = [
    makeWrapper
    wrapGAppsHook3
    gobject-introspection
  ];

  buildInputs = [
    gtk3
    webkitgtk_4_1
    python
  ];

  installPhase = ''
    runHook preInstall

    # 1. Install source
    mkdir -p $out/lib/hyprsettings
    cp -r ./* $out/lib/hyprsettings/

    # 2. Generate run.sh
    cat > $out/lib/hyprsettings/run.sh <<EOF
#!${runtimeShell}
cd "\$(dirname "\$0")"
exec ${python}/bin/python3 src/hyprsettings "\$@"
EOF
    chmod +x $out/lib/hyprsettings/run.sh

    # 3. Create wrapper
    mkdir -p $out/bin
    cat > $out/bin/hyprsettings <<EOF
#!${runtimeShell}
exec $out/lib/hyprsettings/run.sh "\$@"
EOF
    chmod +x $out/bin/hyprsettings

    # 4. Wrap with paths AND fix EGL crash
#    wrapProgram $out/bin/hyprsettings \
#        --prefix PYTHONPATH : "$out/lib/hyprsettings" \
#        --prefix GI_TYPELIB_PATH : "$GI_TYPELIB_PATH" \
#        --prefix XDG_DATA_DIRS : "$XDG_DATA_DIRS" \
#        --set WEBKIT_DISABLE_COMPOSITING_MODE 1

    runHook postInstall
  '';

  meta = with lib; {
    description = "A configurator for hyprland.conf built with Python and web technologies";
    homepage = "https://github.com/acropolis914/hyprsettings";
    license = licenses.gpl3Plus;
    platforms = platforms.linux;
    mainProgram = "hyprsettings";
    maintainers = [ maintainersLocal.acropolis914 maintainersLocal.wiktormalyska ];
  };
}