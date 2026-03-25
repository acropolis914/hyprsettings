# Contributing

(Uhm please... 🥹)

There are so many things that can be improved in the project and you'll know that if you're using it. Please if you can,
take a look at what can be improved and if you can code, help me. If you can't please suggest things that I should
fix/prioritize. Thank you 💕

This project is Python (backend) + GTK WebView + Bun (UI), so a few system packages first, then you're good.

## 1) System packages first (GI + WebKit)

`hyprsettings.py` checks for these at runtime:

- shared libs: `gtk-4`, `webkit2gtk-4.1`, `gobject-2.0`
- typelibs: `Gtk-4.0`, `WebKit2-4.1`, `GObject-2.0`

So before anything else, install your distro's GI/GObject + WebKit2GTK packages:

- **Arch:** `sudo pacman -Sy --needed python-gobject webkit2gtk`
- **Fedora:** `sudo dnf install -y python3-gobject webkit2gtk4.1 gtk3`
- **Debian/Ubuntu/Mint:** `sudo apt install -y python3-gi python3-gi-cairo gir1.2-gtk-4.0 gir1.2-webkit2-4.1`
- **Void:** `sudo xbps-install -Sy gobject-introspection libwebkit2gtk41`
- **openSUSE:** `sudo zypper install -y python3-gobject python3-gobject-Gdk typelib-1_0-Gtk-4_0 libgtk-4-1`
- **Alpine:** `sudo apk add python3-dev py3-gobject3 webkit2gtk-4.1`

Other distros: install Python GI bridge (`python3-gi` / `python3-gobject` / `pygobject3`), WebKit2GTK 4.1, and
GTK/GObject introspection typelibs.

## 2) Tooling you need

Install these:

- [`just`](https://github.com/casey/just) - task runner (recommended)
- [`uv`](https://docs.astral.sh/uv/) - Python env/deps
- [`bun`](https://bun.sh/) - frontend deps/build

Example install commands (Linux):

```bash
# just (pick your distro package manager)
sudo pacman -S just
# or: sudo apt install just

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# bun
curl -fsSL https://bun.sh/install | bash
```

## 3) Recommended workflow (Justfile)

From project root:

```bash
just setup_dev
just dev
```

What those do:

- `just setup_dev`: runs `uv sync`, then `bun install` in `src/ui-src`
- `just dev`: starts backend + Vite dev server together

Other useful recipes:

```bash
just hs
just bld-prev
just build-py
just format
just kill-ports
just generate-new-config-description
just generate-dispatchers
just fmt
```

Tooling notes:

- `just generate-new-config-description` updates data from `tooling/ConfigDescriptions`
- `just generate-dispatchers` refreshes dispatcher data via `tooling/Dispatchers/getdispatchers.py`
- `just fmt` formats the `justfile` itself (`just --unstable --fmt`)

## 4) UI dependency policy (`src/ui-src`)

Keep `src/ui-src/package.json` aligned with real Node imports only.

- Add deps only when importing package names (example: `import tippy from 'tippy.js'`)
- Do not add deps for local file libs (example: `scripts/jslib/*`)
- `eruda` is currently file-based (`scripts/jslib/eruda.min.js` / optional HTML script), so do not add it to Bun deps
  unless you migrate it to `node_modules`

If you migrate a library from file import to package import, update `src/ui-src/package.json` in the same PR.

## 5) Quick checks before PR

```bash
just setup_dev
just format
just bld-prev
```

If you only changed UI deps:

```bash
cd src/ui-src
bun install
bunx vite build
```

