# Changelog

All notable changes to HyprSettings are documented here.

## [Unreleased – v1.0.0]

### Added
- Automated test suite (`tests/`) covering the core `Node` and `ConfigParser`
  classes in `hyprland_parser.py` — 34 tests across unit, integration,
  round-trip, JSON serialisation, and source-file inclusion scenarios.
- `pytest` listed as an optional dev dependency (`pip install -e ".[dev]"`).
- Proper project description in `pyproject.toml`.

### Fixed
- Typo `fist_run` → `first_run` in `pywebview_apis.py` config persistence
  logic (would silently write the wrong key to `hyprsettings.toml`).

---

## [0.9.1] — build 84

_Release candidate phase._

### Added
- Ability to add keys and comments from the UI.
- Basic key/comment adding feature (grouped-key selector deferred).

### Fixed
- Opaque onboarding background when DMABUF renderer is disabled.
- Generic item value editor now auto-updates without requiring Enter.

---

## [0.1.6]

### Added
- Glob support for `source =` directives (e.g. `~/*.conf`, `/dir/*`).
- Comments above keys are now bound to the key directly below them.
- PyWebView cache moved to `~/.cache/hyprsettings`.
- Key descriptions/tooltips sourced from Hyprland's `sconfigdescriptions.hpp`.

---

## [Earlier releases]

See [`releases/`](releases/) for version-specific notes.
