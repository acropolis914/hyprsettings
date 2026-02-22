# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all
import os

# --- SETTINGS SWITCH ---
onefile = True 
# -----------------------

datas, binaries, hiddenimports = collect_all('rich')
datas += [
    ('ui', 'ui'),
    ('hyprland-wiki-content', 'hyprland-wiki-content'),
    ('default_config.toml', '.'),
    ('icon-48.png', '.'),
    ('.version', '.'),
    ('themes_builtin', 'themes_builtin')
]

a = Analysis(
    ['hyprsettings'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
hooksconfig={
        # This is the "Magic" part for Linux/GTK bloat
        'gi': {
            'themes': [],    # Collect NO system themes
            'icons': [],     # Collect NO system icons
            'languages': ['en_US'] # Only collect English translations (shaves off MBs)
        }
    },
runtime_hooks=[],
    excludes=[
        'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 
        'tkinter', 'notebook', 'scipy', 'matplotlib', 
        'numpy', 'PIL', 'test', 'unittest'
    ],
    noarchive=False,
    optimize=2,
)

# --- THE SURGICAL STRIKE ---
# Instead of a whitelist, we use a targeted blacklist for the 'share' bloat.
# This keeps 'encodings', 'lib-dynload', and other core Python shit safe.
a.datas = [x for x in a.datas if not (
    x[1].startswith('share/icons') or 
    x[1].startswith('share/themes') or 
    x[1].startswith('share/locale') or
    x[1].startswith('share/doc')
)]

a.datas = [x for x in a.datas if not (x[1].startswith('share/') and not x[1].endswith('.py'))]
a.excludes += ['unittest', 'pydoc', 'email', 'html', 'http', 'xml', 'distutils']

excluded_libs = ['libQt5', 'libQt6', 'libGLESv2', 'libEGL', 'libicu', 'libxml2']
a.binaries = [x for x in a.binaries if not any(lib in x[0] for lib in excluded_libs)]

pyz = PYZ(a.pure)

if onefile:
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.datas,
        [],
        name='hyprsettings',
        debug=False,
        strip=True,
        upx=False, 
        console=True,
        runtime_tmpdir=None,
        icon= "hyprsettings.ico"
    )
else:
    exe = EXE(
        pyz,
        a.scripts,
        [],
        exclude_binaries=True,
        name='hyprsettings',
        debug=False,
        strip=True,
        upx=False,
        console=True,
        icon= "hyprsettings.ico"
    )
    coll = COLLECT(
        exe,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=True,
        upx=False,
        name='hyprsettings'
    )
