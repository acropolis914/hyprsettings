"""
Tests for the HyprSettings config schema validator.

Validates src/hyprsettings_utils/config_validator.py against
src/hyprsettings_config.schema.json using the real default_config.toml.
"""

import json
import sys
import unittest
from pathlib import Path

import tomlkit

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from hyprsettings_utils.config_validator import (
    ConfigValidationError,
    validate_window_config,
    validate_window_config_strict,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SRC = Path(__file__).resolve().parents[1] / 'src'


def _load_default_config() -> dict:
    with open(_SRC / 'default_config.toml', 'r', encoding='utf-8') as f:
        return dict(tomlkit.load(f))


def _minimal_valid() -> dict:
    """Smallest config dict that should pass validation."""
    return {
        'file_info': {'version': '0.9.1'},
        'config': {},
        'persistence': {},
    }


def _minimal_theme() -> dict:
    color = '#1e1e2e'
    return {
        'name': 'Test Theme',
        'variant': 'Dark',
        'surface-0': color,
        'surface-1': color,
        'surface-2': color,
        'surface-border': color,
        'text-0': color,
        'text-1': color,
        'text-2': color,
        'text-3': color,
        'text-4': color,
        'text-disabled': color,
        'text-contrast': color,
        'accent': color,
        'accent-hover': color,
        'accent-active': color,
        'accent-success': color,
        'accent-warning': color,
        'accent-danger': color,
        'red': color,
        'orange': color,
        'yellow': color,
        'green': color,
        'teal': color,
        'blue': color,
        'pink': color,
        'purple': color,
        'overlay': color,
        'shadow': color,
    }


# ---------------------------------------------------------------------------
# Schema file tests
# ---------------------------------------------------------------------------


class TestSchemaFile(unittest.TestCase):

    def test_schema_exists(self):
        self.assertTrue((_SRC / 'hyprsettings_config.schema.json').is_file())

    def test_schema_is_valid_json(self):
        schema = json.loads((_SRC / 'hyprsettings_config.schema.json').read_text())
        self.assertIn('properties', schema)

    def test_schema_has_required_sections(self):
        schema = json.loads((_SRC / 'hyprsettings_config.schema.json').read_text())
        required = schema.get('required', [])
        for section in ('file_info', 'config', 'persistence'):
            self.assertIn(section, required)

    def test_theme_definition_in_defs(self):
        schema = json.loads((_SRC / 'hyprsettings_config.schema.json').read_text())
        self.assertIn('ThemeDefinition', schema.get('$defs', {}))


# ---------------------------------------------------------------------------
# Default config round-trip
# ---------------------------------------------------------------------------


class TestDefaultConfigValid(unittest.TestCase):

    def test_default_config_loads(self):
        cfg = _load_default_config()
        self.assertIn('file_info', cfg)
        self.assertIn('config', cfg)
        self.assertIn('persistence', cfg)

    def test_default_config_passes_validation(self):
        cfg = _load_default_config()
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [], msg=f'Unexpected errors: {errors}')

    def test_default_config_strict_passes(self):
        cfg = _load_default_config()
        # Should not raise
        validate_window_config_strict(cfg)

    def test_default_config_has_themes(self):
        cfg = _load_default_config()
        self.assertIn('theme', cfg)
        self.assertIsInstance(cfg['theme'], list)
        self.assertGreater(len(cfg['theme']), 0)


# ---------------------------------------------------------------------------
# Section-level validation
# ---------------------------------------------------------------------------


class TestFileInfoValidation(unittest.TestCase):

    def test_valid_version_string(self):
        cfg = _minimal_valid()
        cfg['file_info']['version'] = '1.0.0'
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_missing_file_info(self):
        cfg = _minimal_valid()
        del cfg['file_info']
        errors = validate_window_config(cfg)
        self.assertTrue(any('file_info' in e for e in errors))


class TestConfigSectionValidation(unittest.TestCase):

    def test_transparency_in_range(self):
        cfg = _minimal_valid()
        cfg['config']['transparency'] = 0.5
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_transparency_below_minimum(self):
        cfg = _minimal_valid()
        cfg['config']['transparency'] = -0.1
        errors = validate_window_config(cfg)
        self.assertTrue(any('transparency' in e for e in errors))

    def test_transparency_above_maximum(self):
        cfg = _minimal_valid()
        cfg['config']['transparency'] = 1.5
        errors = validate_window_config(cfg)
        self.assertTrue(any('transparency' in e for e in errors))

    def test_boolean_fields(self):
        cfg = _minimal_valid()
        for field in ('dryrun', 'compact', 'daemon', 'show_line_comments',
                      'show_header_comments', 'show_contextmenu_label', 'show_sidebar_icons'):
            cfg['config'][field] = True
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_wrong_type_for_boolean(self):
        cfg = _minimal_valid()
        cfg['config']['dryrun'] = 'yes'
        errors = validate_window_config(cfg)
        self.assertTrue(any('dryrun' in e for e in errors))

    def test_font_can_be_null(self):
        cfg = _minimal_valid()
        cfg['config']['font'] = None
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_font_can_be_string(self):
        cfg = _minimal_valid()
        cfg['config']['font'] = 'JetBrains Mono Nerd Font'
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])


class TestPersistenceValidation(unittest.TestCase):

    def test_first_run_boolean(self):
        cfg = _minimal_valid()
        cfg['persistence']['first_run'] = True
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_last_tab_string(self):
        cfg = _minimal_valid()
        cfg['persistence']['last_tab'] = 'general'
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_wrong_type_for_first_run(self):
        cfg = _minimal_valid()
        cfg['persistence']['first_run'] = 'yes'
        errors = validate_window_config(cfg)
        self.assertTrue(any('first_run' in e for e in errors))


# ---------------------------------------------------------------------------
# Theme validation
# ---------------------------------------------------------------------------


class TestThemeValidation(unittest.TestCase):

    def test_valid_complete_theme(self):
        cfg = _minimal_valid()
        cfg['theme'] = [_minimal_theme()]
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_invalid_hex_colour(self):
        cfg = _minimal_valid()
        bad_theme = _minimal_theme()
        bad_theme['surface-0'] = 'not-a-colour'
        cfg['theme'] = [bad_theme]
        errors = validate_window_config(cfg)
        self.assertTrue(any('surface-0' in e for e in errors))

    def test_invalid_variant(self):
        cfg = _minimal_valid()
        bad_theme = _minimal_theme()
        bad_theme['variant'] = 'Midnight'
        cfg['theme'] = [bad_theme]
        errors = validate_window_config(cfg)
        self.assertTrue(any('variant' in e for e in errors))

    def test_8digit_hex_colour_accepted(self):
        """Colours like '#1e1e2eff' (with alpha) should be valid."""
        cfg = _minimal_valid()
        theme = _minimal_theme()
        theme['surface-0'] = '#1e1e2eff'
        cfg['theme'] = [theme]
        errors = validate_window_config(cfg)
        self.assertEqual(errors, [])

    def test_missing_name_in_theme(self):
        cfg = _minimal_valid()
        bad_theme = _minimal_theme()
        del bad_theme['name']
        cfg['theme'] = [bad_theme]
        errors = validate_window_config(cfg)
        self.assertTrue(any('name' in e for e in errors))

    def test_themes_from_default_config(self):
        """Every [[theme]] entry in default_config.toml must validate cleanly."""
        cfg = _load_default_config()
        for i, theme in enumerate(cfg.get('theme', [])):
            theme_errors = []
            # Import the internal helper to check each theme independently
            from hyprsettings_utils.config_validator import _validate_theme
            theme_errors = _validate_theme(dict(theme), i)
            self.assertEqual(theme_errors, [], msg=f'Theme {i} ({theme.get("name")}) errors: {theme_errors}')


# ---------------------------------------------------------------------------
# Strict mode
# ---------------------------------------------------------------------------


class TestStrictMode(unittest.TestCase):

    def test_strict_raises_on_error(self):
        cfg = _minimal_valid()
        cfg['config']['transparency'] = 5.0  # out of range
        with self.assertRaises(ConfigValidationError):
            validate_window_config_strict(cfg)

    def test_strict_does_not_raise_on_valid(self):
        cfg = _minimal_valid()
        validate_window_config_strict(cfg)  # must not raise

    def test_strict_error_message_contains_detail(self):
        cfg = _minimal_valid()
        del cfg['persistence']
        try:
            validate_window_config_strict(cfg)
            self.fail('Expected ConfigValidationError')
        except ConfigValidationError as e:
            self.assertIn('persistence', str(e))


if __name__ == '__main__':
    unittest.main()
