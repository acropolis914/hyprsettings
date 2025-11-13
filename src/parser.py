#!/usr/bin/env python3
import os
from pathlib import Path
from typing import Literal, get_args
import json
import uuid
from glob import glob

import rich.pretty as Pretty
from rich.console import Console
import rich
import rich.traceback
import re


rich.traceback.install(show_locals=True)

config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
console = Console()

NodeType = Literal["KEY", "GROUP", "COMMENT", "BLANK", "FILE", "GROUPEND"]


def makeUUID(length: int):
	return str(uuid.uuid4()).replace("-", "")[:length]


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
		return dict

	def to_json(self) -> str:
		return json.dumps(self.to_dict(), indent=4)

	def to_hyprland(self, indent_level: int = 0, save=False) -> list | str:
		indent = "  "

		if self.type == "KEY":
			disabled = "#DISABLED " if self.disabled else ""
			comment = f" # {self.comment}" if self.comment else ""
			return f"{indent * indent_level}{disabled}{self.name} = {self.value}{comment}"
		if self.type == "BLANK":
			return ""
		if self.type == "COMMENT":
			# print(type(self.comment), self.comment)
			if self.comment.startswith("#"):
				return f"{indent * indent_level}{self.comment}"
			else:
				return f"{indent * indent_level} {self.comment}"
		if self.children:
			if self.type == "GROUP" and self.name == "root":
				stack = []
				for file in self.children:
					new_file = {}
					new_file["name"] = str(file.name)
					new_file["path"] = file.value
					new_file["content"] = file.to_hyprland()
					stack.append(new_file)
				if save:
					for file_data in stack:
						path = file_data["path"]
						contents = file_data["content"]
						with open(path, "w", encoding="UTF-8") as f:
							f.write(contents)
				return stack
			if self.type == "FILE":
				content = []
				for child in self.children:
					file_content = child.to_hyprland()
					content.append(file_content)
				return "\n".join(content)
			if self.type == "GROUP" and self.name != "root":
				group_content: list = []
				comment = f" # {self.comment}" if self.comment else ""

				group_content.append(f"{indent * indent_level}{self.name}" + " {" + comment)
				indent_level += 1
				groupeend_comment = None
				for child in self.children:
					if child.type == "GROUPEND":
						groupeend_comment = f"# {child.comment}" if child.comment else ""
						continue
					content = child.to_hyprland(indent_level)
					group_content.append(content)
				indent_level -= 1
				group_content.append(f"{indent * indent_level}" + "}" + f" {groupeend_comment}")

				return "\n".join(group_content)
		else:
			print(f"{self.name} cannot be formatted to a hyprland file")
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
		)
		if "uuid" in data:
			node.uuid = data["uuid"]
		for child in data.get("children", []):
			node.addChildren(Node.from_dict(child))
		return node

	@staticmethod
	def from_json(json_string: str) -> "Node":
		data = json.loads(json_string)
		data = Node.from_dict(data)
		return data

	def __repr__(self):
		if self.type == "KEY":
			return f"Node: {self.name} with type {self.type}"
		if self.type == "GROUP":
			return f"Node: {self.name} with type {self.type}. Children {len(self.children)}"


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
	def __init__(self, path: Path):
		self.root = Node("root", "GROUP")
		self.stack = [self.root]
		self.parse_config(path)

	@classmethod
	def load(cls, path: Path) -> Node:
		parser = cls(path)
		return parser.root

	def parse_config(self, config_path):
		with open(config_path, "r", encoding="UTF-8") as config_file:
			new_file_node = Node(Path(config_path).name, "FILE", str(config_path))
			self.stack[-1].addChildren(new_file_node)
			self.stack.append(new_file_node)
			sources = []
			for line_index, line_content in enumerate(config_file, start=1):
				# for line_content in config_file:
				check: str = self.sanitize(line_content)
				line, comment = self.get_parts(line_content, "#")
				colon_index = line_content.find(":")
				equal_index = line_content.find("=")
				position = ":".join(node.name for node in self.stack)
				# print(line_content)
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
				if colon_index != -1 and equal_index != -1 and colon_index < equal_index:
					# TODO:IMPLEMENT COLON GROUPS
					# print(f"Line {line_content} has ':' before '='")
					pass
				elif re.match(r"^#\s*disabled\b", line_content.lstrip(), re.IGNORECASE):
					# print(f"Line Content {line_content} is disabled")
					line_content = re.sub(
						r"^\s*#\s*disabled\b\s*",
						"",
						line_content,
						flags=re.IGNORECASE,
					).lstrip()
					# print(repr(line_content))
					line, comment = self.get_parts(line_content, "#")
					# print(f"Line: {line} comment:{comment}")
					name, value = self.get_parts(line, "=")
					# print(f"Line: {line} value:{value}")
					if value is None:
						print(f"{name} has no value.")
						return
					node = Node(
						name,
						"KEY",
						value=value,
						comment=comment,
						position=position,
						disabled=True,
						line_number=line_index,
					)
					self.stack[-1].addChildren(node)
				elif line_content.strip().startswith(
					"#"
				):  ##Disabled is checked first before this to ensure it doesnt make a comment
					new_comment = f"#{comment}" if line_content.strip().startswith("##") else f"# {comment}"
					# print(new_comment)
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
					)
					self.stack[-1].addChildren(groupend_node)
					self.stack.pop()
				else:
					name, value = self.get_parts(line, "=")
					if value is None:
						print(f"{value} has no value.")
					node = Node(
						name,
						"KEY",
						value=value,
						comment=comment,
						position=position,
						disabled=False,
						line_number=line_index,
					)
					self.stack[-1].addChildren(node)

				if check.startswith("source"):
					_, file_path = map(str.strip, line.split("=", 1))

					def glob_path(path):
						path_str = path.rstrip("*")
						if not os.path.exists(path_str):
							print(f"Path does not exist: {path_str}")
							return
						for content in os.listdir(path_str):
							if Path(path_str, content).is_file():
								sources.append(Path(path_str, content).resolve())
							elif Path(path_str, content).is_dir():
								glob_path(str(Path(path_str, content)))
							print(f"Added via glob: {Path(path_str, content).resolve()}")

					if file_path.startswith("~"):
						file_path = str(Path(file_path).expanduser())
						if file_path.endswith(".conf"):
							sources.append(Path(file_path).resolve())
							print(f"Added ~ conf: {file_path}")
						elif file_path.endswith("*"):
							glob_path(file_path)

					elif file_path.startswith("/"):
						if file_path.endswith(".conf"):
							sources.append(Path(file_path).resolve())
							print(f"Added abs conf: {file_path}")
						elif file_path.endswith("*"):
							glob_path(file_path)
					else:
						resolved = (config_path.parent / file_path).resolve()
						sources.append(resolved)
						print(f"Added relative: {resolved}")

			self.stack.pop()
			if sources:
				for source in sources:
					try:
						self.parse_config(source)
					except:
						print("File not found. Skipping")

	def sanitize(self, string: str) -> str:
		no_comments = string.split("#", 1)[0]
		return "".join(no_comments.split())

	def get_parts(self, string, delimiter) -> tuple:
		if delimiter in string:
			part1, part2 = map(str.strip, string.split(delimiter, 1))
			return part1, part2
		else:
			# print(
			#     f'String "{string}" has no right side on the given delimiter ',
			#     delimiter,
			# )
			part2 = None
			part1 = string.strip()
			return part1, part2


os.system("clear")
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
