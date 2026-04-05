#!/usr/bin/env python3
import json
import os
import re
import sys
import threading
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from typing import Literal, get_args
import inspect
from os import PathLike

import rich
import rich.traceback
from rich.console import Console

# import pretty_errors

try:
	from .shared import state
except ImportError:
	# Fallback for standalone execution
	class _State:
		verbose = False


	state = _State()

files = []
rich.traceback.install(show_locals=True)
console = Console()
global_verbose = False
changedFileList = []


def ui_print(*args, **kwargs):
	frame = inspect.currentframe().f_back.f_back
	lineno = frame.f_lineno
	now = datetime.now().strftime('%H:%M:%S')
	console.print(f'[green]\\[HyprParser : {lineno}] {now} [/green]', *args, **kwargs)


_last_log_message = None
_last_log_count = 1


def log(msg, prefix='', only_verbose=False):
	global _last_log_message, _last_log_count

	if not only_verbose or state.verbose:
		prefix_str = f'{prefix}' if prefix else ''
		full_message = f'{prefix_str} {msg}'
		if full_message == _last_log_message:
			_last_log_count += 1

			console.file.write('\033[F\033[K')
			ui_print(f'{full_message} [dim](×{_last_log_count})[/dim]')
		else:
			ui_print(f'{full_message}')
			_last_log_message = full_message
			_last_log_count = 1


config_path = Path.home() / '.config' / 'hypr' / 'hyprland.conf'
NodeType = Literal['KEY', 'GROUP', 'COMMENT', 'BLANK', 'FILE', 'GROUPEND', 'UNKNOWN']
_DISABLED_LINE_RE = re.compile(r'^#\s*disabled\b', re.IGNORECASE)
_DISABLED_PREFIX_RE = re.compile(r'^\s*#\s*disabled\b\s*', re.IGNORECASE)
_ANY_WHITESPACE_RE = re.compile(r'\s')


def makeUUID(length: int):
	return str(uuid.uuid4()).replace('-', '')[:length]


_write_lock = threading.Lock()
_timers: dict[Path, threading.Timer] = {}
_DEBOUNCE_SECONDS = 0.2


def debounced_write(path: Path, contents: str):
	def _write():
		with _write_lock:
			with open(path, 'w', encoding='UTF-8') as f:
				f.write(contents)

	with _write_lock:
		if path in _timers:
			_timers[path].cancel()

		timer = threading.Timer(_DEBOUNCE_SECONDS, _write)
		_timers[path] = timer
		timer.start()


class HyprParser:
	def __init__(
		  self,
		  name: str,
		  type_: NodeType,
		  value: str | None = None,
		  comment: str | None = None,
		  position=None,
		  disabled=False,
		  line_number: int | None = None,
		  resolved_path: str | None = None,
	):
		allowed_types = get_args(NodeType)
		assert type_ in allowed_types, f'Invalid node type {type_}. Must be one of {allowed_types}'
		self.name = name
		self.type = type_
		self.value = value
		self.comment = comment
		self.children: list = []
		self.position = position
		self.uuid = makeUUID(8)
		self.disabled = disabled
		self.line_number = line_number
		self.resolved_path = resolved_path

	def addChildren(self, child):
		self.children.append(child)

	def to_dict(self) -> dict:
		dict_entry = {'type': self.type, 'name': self.name, 'uuid': self.uuid}
		# new
		if self.comment:
			dict_entry['comment'] = self.comment
		if self.position:
			dict_entry['position'] = self.position
		if self.value is not None:
			dict_entry['value'] = self.value
		if self.children:
			dict_entry['children'] = [child.to_dict() for child in self.children]
		if self.disabled:
			dict_entry['disabled'] = self.disabled
		if self.line_number:
			dict_entry['line_number'] = self.line_number
		if self.resolved_path:
			dict_entry['resolved_path'] = self.resolved_path
		return dict_entry

	def to_json(self) -> str:
		return json.dumps(self.to_dict(), indent=4)

	def to_hyprland(self, indent_level: int = 0, save=False, changedFiles=None, disabled=False) -> list | str | dict:
		if changedFiles is None:
			changedFiles = []
		global changedFileList, files
		if len(changedFiles) > 0:
			# log(f"Some files are changed:{changedFiles}")
			changedFileList = changedFiles

		indent = '  '
		if self.type == 'KEY':
			disabled_text = '#DISABLED ' if (self.disabled or disabled) else ''
			# if self.disabled or disabled:
			# log(f'Key {self.name} is disabled by {"itself" if self.disabled else "parent"}.')
			comment = f' # {self.comment}' if self.comment else ''
			return f'{indent * indent_level}{disabled_text}{self.name} = {self.value}{comment}'
		if self.type == 'BLANK':
			return ''
		if self.type == 'COMMENT':
			if self.comment.startswith('#'):
				return f'{indent * indent_level}{self.comment}'
			else:
				return f'{indent * indent_level} {self.comment}'
		if self.children:
			if self.type == 'GROUP' and self.name == 'root':  # implied that the type is file
				if self.children[0].type == 'FILE':
					files.clear()
					for file in self.children:
						file.to_hyprland(0, save)
					return files
				else:
					content = []
					for child in self.children:
						content.append(child.to_hyprland(0, save))
					return '\n'.join(content)

			if self.type == 'FILE':
				path: str | None = self.resolved_path
				contains_any: bool = any(sub in path for sub in changedFileList)
				save_all: bool = changedFileList == 'all'

				content = []
				for child in self.children:
					if child.type == 'FILE':
						child.to_hyprland(0, save)
					else:
						file_content = child.to_hyprland()
						content.append(file_content)
				contents = '\n'.join(content)
				files.append({'path': path, 'content': contents})
				if save and (contains_any or save_all):
					if save_all:
						log(f'Saving file {path}')
					if contains_any:
						log(f'File {path} has been changed. Saving.')
					debounced_write(Path(path), contents)

				return {'path': path, 'contents': contents}

			if self.type == 'GROUP' and self.name != 'root':
				# is_disabled = self.disabled or disabled
				# ui_print(f'Proc. group {self.name} which is {"disabled" if is_disabled else "not disabled"}')
				group_content: list = []
				comment = f' # {self.comment}' if self.comment else ''
				disabled_text = '#DISABLED ' if (self.disabled or disabled) else ''
				group_content.append(f'{indent * indent_level}{disabled_text}{self.name}' + ' {' + comment)
				indent_level += 1
				groupeend_comment = None
				for child in self.children:
					# log(
					# 	f"Processing child {child.name} of type {child.type} in group {self.name} which is {self.disabled or disabled}"
					# )
					if child.type == 'GROUPEND':
						groupeend_comment = f'# {child.comment}' if child.comment else ''
						continue
					# disable_child: bool = disabled
					# log(
					# 	f"{child.name} is Self disabled: {self.disabled}, Parent disabled: {disabled}, Child disabled: {child.disabled}, Final disable: {disable_child}"
					# )
					content = child.to_hyprland(indent_level)
					group_content.append(content)
				indent_level -= 1
				group_content.append(
					  f'{indent * indent_level}' + f'{disabled_text}' + '}' + f' {groupeend_comment}')
				group_text = '\n'.join(group_content)
				return group_text
		elif len(self.children) == 0:
			# log(f"{self.name} is empty.")
			pass
		else:
			log(f'{self.name} has encountered an unknown error.')
		return ''

	@staticmethod
	def from_dict(data: dict) -> 'HyprParser':
		node = HyprParser(
			  name=data['name'],
			  type_=data['type'],
			  value=data.get('value'),
			  comment=data.get('comment'),
			  position=data.get('position'),
			  disabled=data.get('disabled', False),
			  line_number=data.get('line_number'),
			  resolved_path=data.get('resolved_path'),
		)
		if 'uuid' in data:
			node.uuid = data['uuid']
		for child in data.get('children', []):
			node.addChildren(HyprParser.from_dict(child))
		return node

	@staticmethod
	def from_json(json_string: str) -> 'HyprParser':
		data = json.loads(json_string)
		data = HyprParser.from_dict(data)
		return data

	@classmethod
	def from_json_to_hyprland(cls, json_string: str, **kwargs) -> str:
		return cls.from_json(json_string).to_hyprland(**kwargs)

	@staticmethod
	def load(path: PathLike) -> HyprParser:
		return _ConfigParser.load(path)

	@staticmethod
	def load_string(string: str) -> 'HyprParser':
		return _ConfigParser.load_string(string)

	def __repr__(self):
		is_disabled = {self.disabled}
		disabled_text = '[red]DISABLED[/red]' if self.disabled else ''
		if self.type == 'KEY':
			return f'Node: {disabled_text} {self.name} with type {self.type}'
		if self.type == 'GROUP':
			return f'Node: {disabled_text} {self.name} with type {self.type}. Children {len(self.children)}'
		return f'Node: {disabled_text} {self.name} with type {self.type}. Children {len(self.children)}'


def print_hyprland(config_list, print: bool = False, save: bool = False):
	# rich.print(type(config_list))
	for file in config_list:
		if print:
			rich.print(f'===Content of {file["name"]}===')
			rich.print(f'{file["path"]}')
			rich.print(file['content'])


# if save:
# 	with open(f"test_{file["name"]}", "w", encoding="UTF-8") as file:
# 		file.write(file["content"])

node_count = 0


class _ConfigParser:
	def __init__(self, path: Path | PathLike = None, verbose=state.verbose):
		global global_verbose
		global_verbose = verbose

		self.root = HyprParser('root', 'GROUP')
		self.stack: list[HyprParser] = [self.root]
		if path:
			start = time.time()
			self._load_path(path)
			end = time.time()
			log(f'Done parsing {node_count} nodes. Took {round(end - start, 3)} seconds.')

	@classmethod
	def load(cls, path: Path | PathLike) -> HyprParser:
		global node_count
		node_count = 0

		parser = cls(path)

		return parser.root

	@classmethod
	def load_string(cls, config_string: str) -> HyprParser:
		global node_count
		parser = cls()
		node_count = 0
		start = time.time()
		parser.parse_config(config_string.splitlines())
		end = time.time()
		log(f'Done parsing {node_count} nodes. Took {round(end - start, 3)} seconds.')
		return parser.root

	def _load_path(self, path: Path | PathLike) -> HyprParser:
		with open(path, 'r', encoding='UTF-8') as config_file:
			new_file_node = HyprParser(
				  Path(path).name,
				  'FILE',
				  str(path),
				  resolved_path=str(path),
			)
			if len(self.stack) > 0:
				self.stack[-1].addChildren(new_file_node)
			self.stack.append(new_file_node)
			self.parse_config(config_file.readlines())

	def parse_config(self, config_lines: list[str]) -> None:
		global node_count
		sources: list[PathLike] = []
		variables: dict[str, str] = {}
		stack = self.stack
		current_parent = stack[-1]
		add_child = current_parent.addChildren

		for line_index, line_content in enumerate(config_lines, start=1):
			node_count += 1
			current_node = None
			# log(f'Parsing line {line_index, line_content} of {len(config_lines)}.', only_verbose=True)
			line_stripped = line_content.strip()
			# First check if a line is disabled and give the line and tells if it is disabled
			match = _DISABLED_LINE_RE.match(line_content.lstrip())
			is_disabled = bool(match)
			# log({is_disabled})
			none_disabled_name: str = line_content
			if is_disabled:
				none_disabled_name = _DISABLED_PREFIX_RE.sub(
					  '',
					  line_content,
				).lstrip()
			# log(f'{none_disabled_name.strip()} is disabled: {is_disabled}')
			# log({none_disabled_name})
			check: str = self.sanitize(none_disabled_name)
			# log({check})
			line: str
			comment: str
			line, comment = self.get_line_and_comment(none_disabled_name)
			is_comment: bool = line_stripped.startswith('#') and not is_disabled and '=' not in line
			position: str = ':'.join(node.name for node in self.stack)
			# log({check, line, comment, position, is_comment})

			if not check and not comment:
				blank_line = HyprParser(
					  'blank',
					  'BLANK',
					  position=position,
					  line_number=line_index,
				)
				add_child(blank_line)
				continue
			# if colon_index != -1 and equal_index != -1 and colon_index < equal_index:
			# 	# TODO:IMPLEMENT COLON GROUPS
			# 	# print(f"Line {line_content} has ':' before '='")
			#
			# 	pass
			elif '=' in none_disabled_name and not is_comment:
				name, value = self.get_parts(line, '=')
				if value is None:
					ui_print(f'{name} has no value.')
					return
				node = HyprParser(
					  name,
					  'KEY',
					  value=value,
					  comment=comment,
					  position=position,
					  disabled=is_disabled,
					  line_number=line_index,
				)
				current_node = node
				if '$' in value:
					log(
						  f'Global {name} uses globals in its value {value}',
						  only_verbose=True,
					)
					for key, val in variables.items():
						if key in value:
							value = value.replace(key, val)
							log(
								  f'Replaced {name} value to {value} based on globals.',
								  only_verbose=True,
							)
							break
					old_value = value
					value = os.path.expandvars(value)
					if value != old_value:
						log(
							  f'Expanded {old_value} to {value} based on os variables.',
							  only_verbose=True,
						)
					variables[name] = value
				else:
					variables[name] = value
				add_child(node)
			elif line_stripped.startswith('#') and not is_disabled:
				new_comment = f'#{comment}' if line_stripped.startswith('##') else f'# {comment}'
				comment_node = HyprParser(
					  '_',
					  'COMMENT',
					  value=None,
					  comment=new_comment,
					  position=position,
					  line_number=line_index,
				)
				add_child(comment_node)
			elif check.endswith('{'):
				name = line.rstrip('{').strip()
				child_node = HyprParser(
					  name,
					  'GROUP',
					  value=None,
					  comment=comment,
					  position=position,
					  line_number=line_index,
					  disabled=is_disabled,
				)
				add_child(child_node)
				stack.append(child_node)
				current_parent = stack[-1]
				add_child = current_parent.addChildren
			elif check.endswith('}'):
				groupend_node = HyprParser(
					  'group_end',
					  'GROUPEND',
					  value=None,
					  comment=comment,
					  position=position,
					  line_number=line_index,
					  disabled=is_disabled,
				)
				add_child(groupend_node)
				stack.pop()
				if stack:
					current_parent = stack[-1]
					add_child = current_parent.addChildren
			else:
				unknown_node = HyprParser(
					  '_',
					  'UNKNOWN',
					  value=line_content,
					  comment=None,
					  position=position,
					  line_number=line_index,
					  disabled=is_disabled,
				)
				add_child(unknown_node)
				if state.verbose:
					ui_print(f'Line {line_index} is unrecognized: {line_stripped}')

			if check.startswith('source'):
				_, file_path = map(str.strip, line.split('=', 1))
				if '$' in file_path:
					log(f'Source {file_path} uses globals', only_verbose=True)
					for key, val in variables.items():
						if key in file_path:
							file_path = file_path.replace(key, val)
							break
					log(f'Sourcing {file_path} based on globals.', only_verbose=True)
					file_path = os.path.expandvars(file_path)

				if file_path.startswith('~'):
					file_path = str(Path(file_path).expanduser())
					if file_path.endswith('.conf'):
						current_node.resolved_path = str(Path(file_path).resolve())
						sources.append(Path(file_path).resolve())
						log(f'Added ~ conf: {file_path}', only_verbose=True)
					elif file_path.endswith('*'):
						sources.append(self.glob_path(file_path))

				elif file_path.startswith('/'):
					if file_path.endswith('.conf'):
						current_node.resolved_path = str(Path(file_path).resolve())
						sources.append(Path(file_path).resolve())
						log(f'Added abs conf: {file_path}', only_verbose=True)
					elif file_path.endswith('*'):
						sources.append(self.glob_path(file_path))
				else:
					resolved = (config_path.parent / file_path).resolve()
					current_node.resolved_path = str(resolved)

					# current_node['resolved_path'] = resolved
					sources.append(resolved)
					log(f'Added relative: {resolved}', only_verbose=True)

		if sources:
			# log('Reading files sourced in the main config file.')
			for source in sources:
				try:
					self._load_path(source)
				except FileNotFoundError:
					ui_print(f'File {source} not found. Skipping')
				except Exception as e:
					ui_print(f'Error reading sourced file {source}: {type(e).__name__}: {e}')
					if global_verbose:
						traceback.print_exc()

		if len(self.stack) > 0:
			# log(self.stack)
			self.stack.pop()

	@staticmethod
	def sanitize(string: str) -> str:
		if '#' not in string and _ANY_WHITESPACE_RE.search(string) is None:
			return string
		no_comments = string.split('#', 1)[0]
		return ''.join(no_comments.split())

	@staticmethod
	def get_parts(string, delimiter) -> tuple:
		if delimiter in string:
			part1, part2 = map(str.strip, string.split(delimiter, 1))
			return part1, part2
		else:
			# ui_print(
			#     f'String "{string}" has no right side on the given delimiter ',
			#     delimiter,
			# )
			part2 = None
			part1 = string.strip()
			return part1, part2

	@staticmethod
	def get_line_and_comment(line):
		# print(line)
		in_quote = False
		quote_char = None

		for i, char in enumerate(line):
			if char in ('"', "'"):
				if not in_quote:
					in_quote = True
					quote_char = char
				elif char == quote_char:
					in_quote = False
					quote_char = None

			if char == '#' and not in_quote:
				line, comment = line[:i].strip(), line[i + 1:].strip()
				if line.startswith("exec"):
					log(line, comment)
				return line, comment
		return line.strip(), ""

	def glob_path(self, path: Path | str):
		path_str = str(path).rstrip('*')
		if not os.path.exists(path_str):
			ui_print(f'Path does not exist: {path_str}')
			return None
		for content in os.listdir(path_str):
			if Path(path_str, content).is_file():
				return Path(path_str, content).resolve()
			elif Path(path_str, content).is_dir():
				return self.glob_path(str(Path(path_str, content)))
			log(
				  f'Added via glob: {Path(path_str, content).resolve()}',
				  only_verbose=True,
			)
			return None
		return None


def test():
	"""Simple roundtrip test for ConfigParser.load_string"""

	def normalize_whitespace(s: str) -> str:
		"""Normalize whitespace in each line while preserving newlines"""
		lines = s.split('\n')
		normalized_lines = [line.strip() for line in lines]
		return '\n'.join(normalized_lines)

	def compare_configs(input_str: str, output_str: str) -> tuple[bool, float]:
		"""Compare two config strings with whitespace normalization.
		Returns (is_similar, similarity_ratio)"""
		norm_input = normalize_whitespace(input_str)
		norm_output = normalize_whitespace(output_str)

		# Remove empty lines for comparison
		input_lines = [line for line in norm_input.split('\n') if line]
		output_lines = [line for line in norm_output.split('\n') if line]

		if not input_lines:
			return True, 1.0

		# Simple similarity: count matching lines
		matches = sum(1 for i, line in enumerate(input_lines) if i < len(output_lines) and line == output_lines[i])
		similarity = matches / max(len(input_lines), len(output_lines))

		return similarity >= 0.8, similarity

	test_cases = [
		  # Simple key-value
		  'monitor = DP-1, 1920x1080, 0x0, 1',
		  # Multiple keys
		  'input {\n  kb_layout = us\n  mouse_speed = 0.5\n}',
		  # With comment
		  'general {\n  gaps_in = 10 # inner gaps\n  gaps_out = 20\n}',
		  # Disabled config
		  '#DISABLED exec = some_command',
		  # Multiple sections
		  'decoration {\n  blur = yes\n}\nanimations {\n  enabled = yes\n}',
		  # Blank lines and comments
		  '# This is a comment\n\ngeneral {\n  border_size = 2\n}\n\n# Another comment',
	]

	log('Running roundtrip tests...\n')

	for i, config_str in enumerate(test_cases, 1):
		try:
			# Parse the config string
			root = HyprParser.load_string(config_str)
			# print(root)

			# Convert back to hyprland format
			result = HyprParser.to_hyprland(root)

			# to_hyprland() returns a list of file dicts when called on root, extract content
			if isinstance(result, list) and result and isinstance(result[0], dict):
				result_str = result[0].get('content', '')
			else:
				result_str = str(result) if result else ''

			# Compare input and output
			is_similar, similarity = compare_configs(config_str, result_str)

			status = '✓' if is_similar else '✗'
			log(f'{status} Test {i}: {similarity * 100:.1f}% similar')
			log(f'  Input:    {repr(config_str)}')
			log(f'  Output:   {repr(result_str)}\n')
		# print()

		except Exception as e:
			log(f'[red]✗ Test {i} failed: {e}\n[red]')

	log('[bold]Tests completed!')


if __name__ == '__main__':
	args = sys.argv[1:]
	if '--test' in args:
		test()
