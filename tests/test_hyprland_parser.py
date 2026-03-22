"""
Tests for the HyprSettings Hyprland configuration parser.

Covers the core Node and ConfigParser classes in
src/hyprsettings_utils/hyprland_parser.py.
"""

import json
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

# Allow importing the package without a fully installed environment
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from hyprsettings_utils.hyprland_parser import ConfigParser, Node


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse(config_text: str) -> Node:
    """Write *config_text* to a temp file and return the parsed root Node."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False, encoding='utf-8') as f:
        f.write(textwrap.dedent(config_text))
        tmp_path = Path(f.name)
    try:
        return ConfigParser(tmp_path).root
    finally:
        tmp_path.unlink(missing_ok=True)


def _get_file_children(root: Node) -> list:
    """Return the children of the first FILE node under *root*."""
    for child in root.children:
        if child.type == 'FILE':
            return child.children
    return []


# ---------------------------------------------------------------------------
# Node unit tests
# ---------------------------------------------------------------------------

class TestNode(unittest.TestCase):

    def test_key_node_to_dict(self):
        node = Node('general', 'KEY', value='value')
        d = node.to_dict()
        self.assertEqual(d['name'], 'general')
        self.assertEqual(d['type'], 'KEY')
        self.assertEqual(d['value'], 'value')
        self.assertIn('uuid', d)

    def test_group_node_children(self):
        parent = Node('root', 'GROUP')
        child = Node('child_key', 'KEY', value='42')
        parent.addChildren(child)
        d = parent.to_dict()
        self.assertEqual(len(d['children']), 1)
        self.assertEqual(d['children'][0]['name'], 'child_key')

    def test_comment_stored_in_dict(self):
        node = Node('key', 'KEY', value='1', comment='my comment')
        d = node.to_dict()
        self.assertEqual(d['comment'], 'my comment')

    def test_disabled_stored_in_dict(self):
        node = Node('key', 'KEY', value='1', disabled=True)
        d = node.to_dict()
        self.assertTrue(d['disabled'])

    def test_position_stored_in_dict(self):
        node = Node('key', 'KEY', value='1', position='root:file')
        d = node.to_dict()
        self.assertEqual(d['position'], 'root:file')

    def test_to_json_round_trip(self):
        node = Node('root', 'GROUP')
        child = Node('border_size', 'KEY', value='2')
        node.addChildren(child)
        json_str = node.to_json()
        restored = Node.from_json(json_str)
        self.assertEqual(restored.name, 'root')
        self.assertEqual(len(restored.children), 1)
        self.assertEqual(restored.children[0].name, 'border_size')
        self.assertEqual(restored.children[0].value, '2')

    def test_invalid_node_type_raises(self):
        with self.assertRaises(AssertionError):
            Node('bad', 'UNKNOWN_TYPE')

    def test_uuid_is_unique(self):
        a = Node('a', 'KEY', value='1')
        b = Node('b', 'KEY', value='2')
        self.assertNotEqual(a.uuid, b.uuid)


# ---------------------------------------------------------------------------
# ConfigParser integration tests
# ---------------------------------------------------------------------------

class TestConfigParserBasic(unittest.TestCase):

    def test_simple_key_value(self):
        root = _parse('border_size = 2\n')
        children = _get_file_children(root)
        keys = [c for c in children if c.type == 'KEY']
        self.assertEqual(len(keys), 1)
        self.assertEqual(keys[0].name, 'border_size')
        self.assertEqual(keys[0].value, '2')

    def test_multiple_keys(self):
        root = _parse(
            'border_size = 2\n'
            'gaps_in = 5\n'
            'gaps_out = 10\n'
        )
        keys = [c for c in _get_file_children(root) if c.type == 'KEY']
        self.assertEqual(len(keys), 3)
        names = [k.name for k in keys]
        self.assertIn('border_size', names)
        self.assertIn('gaps_in', names)
        self.assertIn('gaps_out', names)

    def test_blank_lines_preserved(self):
        root = _parse('border_size = 2\n\ngaps_in = 5\n')
        blanks = [c for c in _get_file_children(root) if c.type == 'BLANK']
        self.assertGreater(len(blanks), 0)

    def test_comment_node(self):
        root = _parse('# This is a comment\nborder_size = 2\n')
        comments = [c for c in _get_file_children(root) if c.type == 'COMMENT']
        self.assertEqual(len(comments), 1)
        self.assertIn('This is a comment', comments[0].comment)

    def test_inline_comment_on_key(self):
        root = _parse('border_size = 2 # my comment\n')
        keys = [c for c in _get_file_children(root) if c.type == 'KEY']
        self.assertEqual(len(keys), 1)
        self.assertEqual(keys[0].value, '2')
        self.assertEqual(keys[0].comment, 'my comment')

    def test_group_node(self):
        root = _parse(
            'general {\n'
            '  border_size = 2\n'
            '}\n'
        )
        groups = [c for c in _get_file_children(root) if c.type == 'GROUP']
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0].name, 'general')

    def test_nested_group(self):
        root = _parse(
            'outer {\n'
            '  inner {\n'
            '    key = value\n'
            '  }\n'
            '}\n'
        )
        outer = next(c for c in _get_file_children(root) if c.type == 'GROUP')
        inner = next(c for c in outer.children if c.type == 'GROUP')
        self.assertEqual(inner.name, 'inner')
        keys = [c for c in inner.children if c.type == 'KEY']
        self.assertEqual(keys[0].name, 'key')
        self.assertEqual(keys[0].value, 'value')

    def test_disabled_key(self):
        root = _parse('#DISABLED border_size = 2\n')
        keys = [c for c in _get_file_children(root) if c.type == 'KEY']
        self.assertEqual(len(keys), 1)
        self.assertTrue(keys[0].disabled)

    def test_disabled_group(self):
        root = _parse(
            '#DISABLED general {\n'
            '  border_size = 2\n'
            '}\n'
        )
        groups = [c for c in _get_file_children(root) if c.type == 'GROUP']
        self.assertEqual(len(groups), 1)
        self.assertTrue(groups[0].disabled)

    def test_group_end_comment(self):
        root = _parse(
            'general {\n'
            '  border_size = 2\n'
            '} # end of general\n'
        )
        groups = [c for c in _get_file_children(root) if c.type == 'GROUP']
        self.assertEqual(len(groups), 1)
        # The GROUPEND child should carry the comment
        groupend_nodes = [c for c in groups[0].children if c.type == 'GROUPEND']
        self.assertEqual(len(groupend_nodes), 1)
        self.assertIn('end of general', groupend_nodes[0].comment)

    def test_value_with_spaces(self):
        root = _parse('font_family = JetBrains Mono Nerd Font\n')
        keys = [c for c in _get_file_children(root) if c.type == 'KEY']
        self.assertEqual(keys[0].value, 'JetBrains Mono Nerd Font')

    def test_empty_string_value(self):
        root = _parse('kb_variant = \n')
        keys = [c for c in _get_file_children(root) if c.type == 'KEY']
        self.assertEqual(len(keys), 1)
        self.assertEqual(keys[0].value, '')

    def test_quoted_string_value(self):
        root = _parse('name = "default"\n')
        keys = [c for c in _get_file_children(root) if c.type == 'KEY']
        self.assertEqual(keys[0].value, '"default"')

    def test_double_hash_comment_preserved(self):
        root = _parse('## Section header\n')
        comments = [c for c in _get_file_children(root) if c.type == 'COMMENT']
        self.assertEqual(len(comments), 1)
        self.assertTrue(comments[0].comment.startswith('##'))


# ---------------------------------------------------------------------------
# Round-trip tests (parse → to_hyprland → compare)
# ---------------------------------------------------------------------------

class TestConfigParserRoundTrip(unittest.TestCase):

    def _round_trip(self, config_text: str) -> list[dict]:
        """Parse *config_text*, then re-serialise to hyprland format."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False, encoding='utf-8') as f:
            f.write(textwrap.dedent(config_text))
            tmp_path = Path(f.name)
        try:
            root = ConfigParser(tmp_path).root
            return root.to_hyprland(save=False)
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_simple_key_roundtrip(self):
        cfg = 'border_size = 2\n'
        files = self._round_trip(cfg)
        self.assertEqual(len(files), 1)
        self.assertIn('border_size = 2', files[0]['content'])

    def test_group_roundtrip(self):
        cfg = 'general {\n  border_size = 2\n}\n'
        files = self._round_trip(cfg)
        content = files[0]['content']
        self.assertIn('general {', content)
        self.assertIn('border_size = 2', content)

    def test_comment_roundtrip(self):
        cfg = '# My section\nborder_size = 2\n'
        files = self._round_trip(cfg)
        content = files[0]['content']
        self.assertIn('# My section', content)
        self.assertIn('border_size = 2', content)

    def test_disabled_key_roundtrip(self):
        cfg = '#DISABLED border_size = 2\n'
        files = self._round_trip(cfg)
        content = files[0]['content']
        self.assertIn('#DISABLED', content)
        self.assertIn('border_size = 2', content)

    def test_inline_comment_roundtrip(self):
        cfg = 'border_size = 2 # keep this\n'
        files = self._round_trip(cfg)
        content = files[0]['content']
        self.assertIn('# keep this', content)

    def test_blank_lines_roundtrip(self):
        cfg = 'a = 1\n\nb = 2\n'
        files = self._round_trip(cfg)
        content = files[0]['content']
        self.assertIn('a = 1', content)
        self.assertIn('b = 2', content)


# ---------------------------------------------------------------------------
# JSON serialisation / deserialisation
# ---------------------------------------------------------------------------

class TestNodeJsonSerialization(unittest.TestCase):

    def test_from_dict_preserves_uuid(self):
        node = Node('key', 'KEY', value='42')
        d = node.to_dict()
        restored = Node.from_dict(d)
        self.assertEqual(restored.uuid, node.uuid)

    def test_nested_children_serialized(self):
        root = Node('root', 'GROUP')
        group = Node('general', 'GROUP')
        key = Node('border_size', 'KEY', value='2')
        group.addChildren(key)
        root.addChildren(group)

        json_str = root.to_json()
        data = json.loads(json_str)
        self.assertEqual(data['children'][0]['name'], 'general')
        self.assertEqual(data['children'][0]['children'][0]['name'], 'border_size')

    def test_from_json_reconstructs_tree(self):
        root = Node('root', 'GROUP')
        group = Node('input', 'GROUP')
        key = Node('kb_layout', 'KEY', value='us')
        group.addChildren(key)
        root.addChildren(group)

        restored = Node.from_json(root.to_json())
        self.assertEqual(restored.children[0].name, 'input')
        self.assertEqual(restored.children[0].children[0].value, 'us')

    def test_missing_optional_fields_not_in_dict(self):
        node = Node('key', 'KEY', value='1')
        d = node.to_dict()
        self.assertNotIn('comment', d)
        self.assertNotIn('disabled', d)
        self.assertNotIn('position', d)


# ---------------------------------------------------------------------------
# Source-file inclusion
# ---------------------------------------------------------------------------

class TestSourceInclusion(unittest.TestCase):

    def test_source_relative_path_included(self):
        """A relative `source = ...` directive should include that file's keys."""
        with tempfile.TemporaryDirectory() as tmpdir:
            sourced = Path(tmpdir) / 'extra.conf'
            sourced.write_text('extra_key = 99\n', encoding='utf-8')

            main = Path(tmpdir) / 'hyprland.conf'
            main.write_text('source = extra.conf\nmain_key = 1\n', encoding='utf-8')

            root = ConfigParser(main).root
            # root → FILE(main) → FILE(extra) should be present
            file_nodes = [c for c in root.children if c.type == 'FILE']
            all_file_names = [fn.name for fn in file_nodes]
            self.assertIn('hyprland.conf', all_file_names)

            # Extra file parsed as a child FILE node inside the main file
            main_file = file_nodes[0]
            extra_files = [c for c in main_file.children if c.type == 'FILE']
            self.assertEqual(len(extra_files), 1)
            self.assertEqual(extra_files[0].name, 'extra.conf')

            # extra_key should be present inside the sourced file node
            extra_keys = [c for c in extra_files[0].children if c.type == 'KEY']
            self.assertEqual(extra_keys[0].name, 'extra_key')
            self.assertEqual(extra_keys[0].value, '99')

    def test_nonexistent_source_does_not_crash(self):
        """Missing sourced files should be silently skipped."""
        root = _parse('source = /nonexistent/path/nope.conf\nborder_size = 1\n')
        keys = [c for c in _get_file_children(root) if c.type == 'KEY']
        key_names = [k.name for k in keys]
        self.assertIn('border_size', key_names)


if __name__ == '__main__':
    unittest.main()
