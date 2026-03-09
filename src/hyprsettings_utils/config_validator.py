"""
Validates a parsed hyprsettings.toml dict against the JSON Schema.

Usage (from Python):

    from hyprsettings_utils.config_validator import validate_window_config, ConfigValidationError

    try:
        validate_window_config(config_dict)
    except ConfigValidationError as e:
        print(e)

The validator is intentionally *lenient*: it warns about unknown / missing
keys without raising, so that a new HyprSettings version does not break
existing configs that were written by an older version.  Hard errors are only
raised for type mismatches that would definitely cause runtime crashes
(e.g. ``transparency`` not being a number).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Path to the schema file, relative to this module
_SCHEMA_PATH = Path(__file__).parent.parent / 'hyprsettings_config.schema.json'


class ConfigValidationError(ValueError):
    """Raised when a loaded hyprsettings.toml fails schema validation."""


def _load_schema() -> dict:
    with open(_SCHEMA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Lightweight built-in validator (no external dependencies)
# ---------------------------------------------------------------------------

def _check_type(value: Any, expected_types, path: str) -> list[str]:
    """Return a list of error strings if *value* does not match *expected_types*."""
    errors: list[str] = []
    if not isinstance(expected_types, list):
        expected_types = [expected_types]
    type_map = {
        'string': str,
        'boolean': bool,
        'number': (int, float),
        'integer': int,
        'array': list,
        'object': dict,
        'null': type(None),
    }
    py_types = tuple(t for name in expected_types if name != 'null' for t in [type_map.get(name, object)])
    allows_null = 'null' in expected_types
    if value is None:
        if not allows_null:
            errors.append(f'{path}: expected {expected_types}, got null')
    elif py_types and not isinstance(value, py_types):
        errors.append(f'{path}: expected {expected_types}, got {type(value).__name__}')
    return errors


def _validate_section(data: dict, schema_props: dict, section: str, strict: bool = False) -> list[str]:
    """Validate a flat section dict against its JSON Schema properties."""
    errors: list[str] = []
    for key, prop in schema_props.items():
        if key not in data:
            continue
        path = f'{section}.{key}'
        value = data[key]
        t = prop.get('type')
        if t:
            errors.extend(_check_type(value, t, path))
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if 'minimum' in prop and value < prop['minimum']:
                errors.append(f'{path}: {value} is less than minimum {prop["minimum"]}')
            if 'maximum' in prop and value > prop['maximum']:
                errors.append(f'{path}: {value} exceeds maximum {prop["maximum"]}')
        if isinstance(value, str) and 'enum' in prop and value not in prop['enum']:
            errors.append(f'{path}: {value!r} is not one of {prop["enum"]}')
    if strict:
        extra = set(data) - set(schema_props)
        for key in extra:
            errors.append(f'{section}: unknown key {key!r}')
    return errors


def _validate_theme(theme: dict, index: int) -> list[str]:
    """Validate a single [[theme]] entry."""
    errors: list[str] = []
    path = f'theme[{index}]'

    # Required fields
    for field in ('name', 'variant'):
        if field not in theme:
            errors.append(f'{path}: missing required field {field!r}')
        elif not isinstance(theme[field], str):
            errors.append(f'{path}.{field}: expected string')

    if 'variant' in theme and theme['variant'] not in ('Dark', 'Light'):
        errors.append(f'{path}.variant: must be "Dark" or "Light", got {theme["variant"]!r}')

    # Colour fields — must be strings matching #RRGGBB(AA)
    import re
    hex_pattern = re.compile(r'^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$')
    color_fields = [
        'surface-0', 'surface-1', 'surface-2', 'surface-border',
        'text-0', 'text-1', 'text-2', 'text-3', 'text-4',
        'text-disabled', 'text-contrast',
        'accent', 'accent-hover', 'accent-active',
        'accent-success', 'accent-warning', 'accent-danger',
        'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'pink', 'purple',
        'overlay', 'shadow',
    ]
    for field in color_fields:
        if field in theme:
            val = theme[field]
            if not isinstance(val, str):
                errors.append(f'{path}.{field}: expected a colour string, got {type(val).__name__}')
            elif not hex_pattern.match(val):
                errors.append(
                    f'{path}.{field}: {val!r} is not a valid hex colour (#RRGGBB or #RRGGBBAA)'
                )
    return errors


def validate_window_config(config: dict) -> list[str]:
    """
    Validate a parsed ``hyprsettings.toml`` dict.

    Returns a list of human-readable warning/error strings.
    An empty list means the config looks valid.

    This does **not** raise by default so that old configs keep working.
    Call :func:`validate_window_config_strict` if you want an exception on
    any problem.
    """
    schema = _load_schema()
    errors: list[str] = []

    # Top-level required sections
    for section in schema.get('required', []):
        if section not in config:
            errors.append(f'Missing required section [{section}]')

    # [file_info]
    if 'file_info' in config:
        fi = config['file_info']
        if not isinstance(fi, dict):
            errors.append('file_info: must be a table')
        else:
            fi_props = schema['properties']['file_info']['properties']
            errors.extend(_validate_section(fi, fi_props, 'file_info'))

    # [config]
    if 'config' in config:
        cfg = config['config']
        if not isinstance(cfg, dict):
            errors.append('config: must be a table')
        else:
            cfg_props = schema['properties']['config']['properties']
            errors.extend(_validate_section(cfg, cfg_props, 'config'))

    # [persistence]
    if 'persistence' in config:
        pers = config['persistence']
        if not isinstance(pers, dict):
            errors.append('persistence: must be a table')
        else:
            pers_props = schema['properties']['persistence']['properties']
            errors.extend(_validate_section(pers, pers_props, 'persistence'))

    # [[theme]]
    if 'theme' in config:
        themes = config['theme']
        if not isinstance(themes, list):
            errors.append('theme: must be an array of tables')
        else:
            for i, theme in enumerate(themes):
                errors.extend(_validate_theme(theme, i))

    if errors:
        for msg in errors:
            logger.warning('hyprsettings.toml validation: %s', msg)

    return errors


def validate_window_config_strict(config: dict) -> None:
    """
    Like :func:`validate_window_config` but raises :exc:`ConfigValidationError`
    on the first problem found.
    """
    problems = validate_window_config(config)
    if problems:
        raise ConfigValidationError(
            'hyprsettings.toml is invalid:\n' + '\n'.join(f'  • {p}' for p in problems)
        )
