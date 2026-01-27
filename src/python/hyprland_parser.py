#!/usr/bin/env python3
import json
import os
import re
import threading
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from typing import Literal, get_args

import rich
import rich.traceback
from rich.console import Console

rich.traceback.install(show_locals=True)
console = Console()
global_verbose = False
changedFileList = []


def ui_print(*args, **kwargs):
	now = datetime.now().strftime("%H:%M:%S")
	console.print(f"[green]\\[HyprParser] {now} [/green]", *args, **kwargs)


_last_log_message = None
_last_log_count = 1


def log(msg, prefix="", only_verbose=False):
	global _last_log_message, _last_log_count

	prefix_str = f"{prefix}" if prefix else ""
	full_message = f"{prefix_str} {msg}"

	# if not only_verbose or verbose:
	if full_message == _last_log_message:
		_last_log_count += 1

		console.file.write("\033[F\033[K")
		ui_print(f"{full_message} [dim](×{_last_log_count})[/dim]")
	else:
		ui_print(f"{full_message}")
		_last_log_message = full_message
		_last_log_count = 1


config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
NodeType = Literal["KEY", "GROUP", "COMMENT", "BLANK", "FILE", "GROUPEND"]


def makeUUID(length: int):
	return str(uuid.uuid4()).replace("-", "")[:length]


_write_lock = threading.Lock()
_timers: dict[Path, threading.Timer] = {}
_DEBOUNCE_SECONDS = 0.2


def debounced_write(path: Path, contents: str):
	def _write():
		with _write_lock:
			with open(path, "w", encoding="UTF-8") as f:
				f.write(contents)

	with _write_lock:
		if path in _timers:
			_timers[path].cancel()

		timer = threading.Timer(_DEBOUNCE_SECONDS, _write)
		_timers[path] = timer
		timer.start()


class Node:
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
		assert type_ in allowed_types, f"Invalid node type {type_}. Must be one of {allowed_types}"
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
		dict = {"type": self.type, "name": self.name, "uuid": self.uuid}
		# new
		if self.comment:
			dict["comment"] = self.comment
		if self.position:
			dict["position"] = self.position
		if self.value is not None:
			dict["value"] = self.value
		if self.children:
			dict["children"] = [child.to_dict() for child in self.children]
		if self.disabled:
			dict["disabled"] = self.disabled
		if self.line_number:
			dict["line_number"] = self.line_number
		if self.resolved_path:
			dict["resolved_path"] = self.resolved_path
		return dict

	def to_json(self) -> str:
		return json.dumps(self.to_dict(), indent=4)

	def to_hyprland(self, indent_level: int = 0, save=False, changedFiles: list = [], disabled=False) -> list | str:
		if len(changedFiles) > 0:
			global changedFileList
			# log(f"Some files are changed:{changedFiles}")
			changedFileList = changedFiles

		indent = "  "

		if self.type == "KEY":
			disabled_text = "#DISABLED " if (self.disabled or disabled) else ""
			if self.disabled or disabled:
				log(f"Key {self.name} is disabled by {'itself' if self.disabled else 'parent'}.")
			comment = f" # {self.comment}" if self.comment else ""
			return f"{indent * indent_level}{disabled_text}{self.name} = {self.value}{comment}"
		if self.type == "BLANK":
			return ""
		if self.type == "COMMENT":
			if self.comment.startswith("#"):
				return f"{indent * indent_level}{self.comment}"
			else:
				return f"{indent * indent_level} {self.comment}"
		if self.children:
			if self.type == "GROUP" and self.name == "root":  # implied that the type is file
				stack = []
				for file in self.children:
					# new_file = {}
					# new_file["name"] = str(file.name)
					# new_file["path"] = file.value
					# new_file["resolved_path"] = file.resolved_path
					new_file = file.to_hyprland(0, save)
					stack.append(new_file)
				return stack
			if self.type == "FILE":
				path: str = self.resolved_path
				contains_any: bool = any(sub in path for sub in changedFileList)
				content = []
				for child in self.children:
					if child.type == "FILE":
						child.to_hyprland(0, save)
					else:
						file_content = child.to_hyprland()
						content.append(file_content)
				contents = "\n".join(content)

				if save and contains_any:
					log(f"File {path} has been changed. Saving.")
					debounced_write(Path(path), contents)

				return contents

			if self.type == "GROUP" and self.name != "root":
				ui_print(f"Proc. group {self.name} which is disabled: {self.disabled or disabled}")
				group_content: list = []
				comment = f" # {self.comment}" if self.comment else ""
				disabled_text = "#DISABLED " if self.disabled or disabled else ""
				group_content.append(f"{indent * indent_level}{disabled_text}{self.name}" + " {" + comment)
				indent_level += 1
				groupeend_comment = None
				for child in self.children:
					# log(
					# 	f"Processing child {child.name} of type {child.type} in group {self.name} which is {self.disabled or disabled}"
					# )
					if child.type == "GROUPEND":
						groupeend_comment = f"# {child.comment}" if child.comment else ""
						continue
					disable_child: bool = (
						(self.disabled or disabled) if (self.disabled or disabled) else False
					)
					log(
						f"{child.name} is Self disabled: {self.disabled}, Parent disabled: {disabled}, Child disabled: {child.disabled}, Final disable: {disable_child}"
					)
					content = child.to_hyprland(indent_level, disabled=disable_child)
					group_content.append(content)
				indent_level -= 1
				group_content.append(
					f"{indent * indent_level}" + f"{disabled_text}" + "}" + f" {groupeend_comment}"
				)
				group_text = "\n".join(group_content)
				return group_text
		elif len(self.children) == 0:
			# log(f"{self.name} is empty.")
			pass
		else:
			log(f"{self.name} has encountered an unknown error.")
		return ""

	@staticmethod
	def from_dict(data: dict) -> "Node":
		node = Node(
			name=data["name"],
			type_=data["type"],
			value=data.get("value"),
			comment=data.get("comment"),
			position=data.get("position"),
			disabled=data.get("disabled"),
			line_number=data.get("line_number"),
			resolved_path=data.get("resolved_path"),
		)
		if "uuid" in data:
			node.uuid = data["uuid"]
		for child in data.get("children", []):
			node.addChildren(Node.from_dict(child))
		return node

	@staticmethod
	def from_json(json_string: str) -> "Node":
		console.print_json(json_string)
		data = json.loads(json_string)
		data = Node.from_dict(data)
		log(data)
		return data

	def __repr__(self):
		is_disabled = {self.disabled}
		disabled_text = "[red]DISABLED[/red]" if self.disabled else ""
		if self.type == "KEY":
			return f"Node: {disabled_text} {self.name} with type {self.type}"
		if self.type == "GROUP":
			return f"Node: {disabled_text} {self.name} with type {self.type}. Children {len(self.children)}"
		return f"Node: {disabled_text} {self.name} with type {self.type}. Children {len(self.children)}"


def print_hyprland(config_list, print: bool = False, save: bool = False):
	# rich.print(type(config_list))
	for file in config_list:
		if print:
			rich.print(f"===Content of {file['name']}===")
			rich.print(f"{file['path']}")
			rich.print(file["content"])


# if save:
# 	with open(f"test_{file["name"]}", "w", encoding="UTF-8") as file:
# 		file.write(file["content"])


class ConfigParser:
	def __init__(self, path: Path, verbose=False):
		global global_verbose
		global_verbose = verbose
		self.root = Node("root", "GROUP")
		self.stack = [self.root]
		self.parse_config(path)

	@classmethod
	def load(cls, path: Path) -> Node:
		parser = cls(path)
		return parser.root

	def parse_config(self, config_path):
		with open(config_path, "r", encoding="UTF-8") as config_file:
			new_file_node = Node(
				Path(config_path).name,
				"FILE",
				str(config_path),
				resolved_path=str(config_path),
			)
			self.stack[-1].addChildren(new_file_node)
			self.stack.append(new_file_node)
			sources = []
			globals = {}

			for line_index, line_content in enumerate(config_file, start=1):
				match = re.match(r"^#\s*disabled\b", line_content.lstrip(), re.IGNORECASE)
				is_disabled = bool(match)
				none_disabled_name = re.sub(
					r"^\s*#\s*disabled\b\s*",
					"",
					line_content,
					flags=re.IGNORECASE,
				).lstrip()
				check: str = self.sanitize(none_disabled_name)
				line, comment = self.get_parts(none_disabled_name, "#")
				position = ":".join(node.name for node in self.stack)

				if not check and not comment:
					blank_line = Node(
						"blank",
						"BLANK",
						value=None,
						comment=None,
						position=position,
						disabled=False,
						line_number=line_index,
					)
					self.stack[-1].addChildren(blank_line)
					continue
				# if colon_index != -1 and equal_index != -1 and colon_index < equal_index:
				# 	# TODO:IMPLEMENT COLON GROUPS
				# 	# print(f"Line {line_content} has ':' before '='")
				#
				# 	pass
				elif "=" in none_disabled_name:
					name, value = self.get_parts(line, "=")
					if value is None:
						ui_print(f"{name} has no value.")
						return
					node = Node(
						name,
						"KEY",
						value=value,
						comment=comment,
						position=position,
						disabled=is_disabled,
						line_number=line_index,
					)
					if "$" in value:
						log(
							f"Global {name} uses globals in its value {value}",
							only_verbose=True,
						)
						for key, val in globals.items():
							if key in value:
								value = value.replace(key, val)
								log(
									f"Replaced {name} value to {value} based on globals.",
									only_verbose=True,
								)
								break
						old_value = value
						value = os.path.expandvars(value)
						if value != old_value:
							log(
								f"Expanded {old_value} to {value} based on os variables.",
								only_verbose=True,
							)
						globals[name] = value
					else:
						globals[name] = value
					self.stack[-1].addChildren(node)
				elif line_content.strip().startswith("#") and not is_disabled:
					new_comment = f"#{comment}" if line_content.strip().startswith("##") else f"# {comment}"
					comment_node = Node(
						"comment",
						"COMMENT",
						value=None,
						comment=new_comment,
						position=position,
						line_number=line_index,
					)
					self.stack[-1].addChildren(comment_node)
				elif check.endswith("{"):
					name = line.rstrip("{").strip()
					child_node = Node(
						name,
						"GROUP",
						value=None,
						comment=comment,
						position=position,
						line_number=line_index,
						disabled=is_disabled,
					)
					self.stack[-1].addChildren(child_node)
					self.stack.append(child_node)
				elif check.endswith("}"):
					groupend_node = Node(
						"group_end",
						"GROUPEND",
						value=None,
						comment=comment,
						position=position,
						line_number=line_index,
						disabled=is_disabled,
					)
					self.stack[-1].addChildren(groupend_node)
					self.stack.pop()
				else:
					ui_print(f"Line {line_index} is unrecognized: {line_content.strip()}")
					# name, value = self.get_parts(line, "=")
					# if value is None:
					# 	print(f"{value} has no value.")
					# node = Node(
					# 	name,
					# 	"KEY",
					# 	value=value,
					# 	comment=comment,
					# 	position=position,
					# 	disabled=is_disabled,
					# 	line_number=line_index,
					# )
					# if name.startswith("$"):
					# 	if "$" in value:
					# 		log(
					# 			f"Global {name} uses globals in its value {value}",
					# 			only_verbose=True,
					# 		)
					# 		for key, val in globals.items():
					# 			if key in value:
					# 				value = value.replace(key, val)
					# 				log(
					# 					f"Replaced {name} value to {value} based on globals.",
					# 					only_verbose=True,
					# 				)
					# 				break
					# 		old_value = value
					# 		value = os.path.expandvars(value)
					# 		if value != old_value:
					# 			log(
					# 				f"Expanded {old_value} to {value} based on os variables.",
					# 				only_verbose=True,
					# 			)
					# 		globals[name] = value
					# 	else:
					# 		globals[name] = value
					# self.stack[-1].addChildren(node)

				if check.startswith("source"):
					_, file_path = map(str.strip, line.split("=", 1))
					if "$" in file_path:
						log(f"Source {file_path} uses globals", only_verbose=True)
						for key, val in globals.items():
							if key in file_path:
								file_path = file_path.replace(key, val)
								break
						log(f"Sourcing {file_path} based on globals.", only_verbose=True)
						file_path = os.path.expandvars(file_path)

					def glob_path(path):
						path_str = path.rstrip("*")
						if not os.path.exists(path_str):
							ui_print(f"Path does not exist: {path_str}")
							return
						for content in os.listdir(path_str):
							if Path(path_str, content).is_file():
								sources.append(Path(path_str, content).resolve())
							elif Path(path_str, content).is_dir():
								glob_path(str(Path(path_str, content)))
							log(
								f"Added via glob: {Path(path_str, content).resolve()}",
								only_verbose=True,
							)

					if file_path.startswith("~"):
						file_path = str(Path(file_path).expanduser())
						if file_path.endswith(".conf"):
							sources.append(Path(file_path).resolve())
							log(f"Added ~ conf: {file_path}", only_verbose=True)
						elif file_path.endswith("*"):
							glob_path(file_path)

					elif file_path.startswith("/"):
						if file_path.endswith(".conf"):
							sources.append(Path(file_path).resolve())
							log(f"Added abs conf: {file_path}", only_verbose=True)
						elif file_path.endswith("*"):
							glob_path(file_path)
					else:
						resolved = (config_path.parent / file_path).resolve()
						sources.append(resolved)
						log(f"Added relative: {resolved}", only_verbose=True)

			if sources:
				# global global_verbose
				# ui_print(global_verbose)
				log("Reading files sourced in the main config file.")
				for source in sources:
					try:
						self.parse_config(source)
					except FileNotFoundError:
						ui_print(f"File {source} not found. Skipping")
					except Exception as e:
						ui_print(f"Error reading sourced file {source}: {type(e).__name__}: {e}")
						if global_verbose:
							traceback.print_exc()

			if len(self.stack) > 0:
				self.stack.pop()

	def sanitize(self, string: str) -> str:
		no_comments = string.split("#", 1)[0]
		return "".join(no_comments.split())

	def get_parts(self, string, delimiter) -> tuple:
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


# os.system("clear")
# config_node1 = ConfigParser.load(config_path).to_hyprland()
# print(type(config_node1))
# print_hyprland(config_node1, print=True)
# rich.print_json(config_node1)
# with open("config_node1.txt", "w", encoding="UTF-8") as node1:
#     node1.write(config_node1)

# config_node2 = Node.from_json(config_node1).to_json()
# with open("config_node2.txt", "w", encoding="UTF-8") as node2:
#     node2.write(config_node2)
# rich.print(config_node2)
# hyrpland_files = ConfigParser(config_path).root.to_hyprland()
# print_hyprland(hyrpland_files, print=True, save=True)
