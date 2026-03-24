# Contributing to hyprsettings

Thanks for contributing.

## Prerequisites

Install these tools first:

- [`just`](https://github.com/casey/just) (task runner)
- [`uv`](https://docs.astral.sh/uv/) (Python env/deps)
- [`bun`](https://bun.sh/) (UI deps/build tooling)

Example install commands (Linux):

```bash
# just (choose one that matches your distro)
sudo pacman -S just
# or: sudo apt install just

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# bun
curl -fsSL https://bun.sh/install | bash
```

## Recommended workflow (Justfile)

Use `just` recipes from the project root.

```bash
just setup_dev
just dev
```

What each does:

- `just setup_dev`
  - runs `uv sync` for backend dependencies
  - runs `bun install` in `src/ui-src` for frontend dependencies
- `just dev`
  - starts Python backend and Vite dev server concurrently

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

Tooling-focused notes:

- `just generate-new-config-description` updates config description data from `tooling/ConfigDescriptions`.
- `just generate-dispatchers` refreshes dispatcher metadata via `tooling/Dispatchers/getdispatchers.py`.
- `just fmt` formats the `justfile` itself (`just --unstable --fmt`).

## UI dependency policy (`src/ui-src`)

When updating imports, keep `package.json` aligned with **actual Node module imports**.

- Add to `dependencies`/`devDependencies` only when importing from a package name (for example: `import tippy from 'tippy.js'`).
- Do **not** add packages for assets/libraries imported from local files (for example: `scripts/jslib/*`).
- `eruda` is currently file-based (`scripts/jslib/eruda.min.js` / optional script include), so it should not be added as an npm/bun dependency unless imports are switched to `node_modules`.

If you migrate a library from local file import to `node_modules` import, update `src/ui-src/package.json` in the same PR.

## Verify before opening a PR

```bash
just setup_dev
just format
just bld-prev
```

If you only changed UI dependencies, you can also run:

```bash
cd src/ui-src
bun install
bunx vite build
```

