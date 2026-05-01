import collections
import json
from dataclasses import dataclass, field, asdict, fields
from logging import root
from typing import Literal, Union, Optional, cast

from rich.console import Console

console = Console()

# Strict type definitions
NodeType = Literal[
	'KEY', 'GROUP', 'COMMENT', 'COMMENT_BLOCK', 'BLANK', 'FILE',
	'GROUPEND', 'UNKNOWN', 'KEYBIND_GROUP'
]


@dataclass(slots=True)
class BaseNode:
	"""Shared properties for all configuration nodes."""
	type: NodeType
	name: Optional[str] = None
	uuid: Optional[str] = None
	position: Optional[str] = None
	comment: Optional[str] = None
	# line_number: Union[str, int, None] = None
	# preserve token/index info from the parser
	token_number: Optional[int] = None
	# path resolution used by file nodes
	resolved_path: Optional[str] = None
	disabled: bool = False
	# temporary field set by parser to indicate which parse-branch created/handled this node
	resolver: Optional[str] = None

	one_line: Optional[bool] = None
	last_one_line: Optional[bool] = None
	mode: Literal["niri", "mango", "hyprland"] = "niri"
	children: Optional[list] = None
	value: Optional[str] = None

	def to_dict(self):
		"""Converts the dataclass to a dictionary, removing None values recursively for a cleaner JSON.

		asdict(self) will produce nested dict/list structures for nested dataclasses. We need to
		walk that structure and drop any keys whose value is None at any depth so the resulting
		JSON doesn't contain null entries.
		"""
		raw = asdict(self)

		def _clean(obj):
			# Recursively remove None values from dicts; clean list/tuple elements.
			if isinstance(obj, dict):
				out = {}
				for k, v in obj.items():
					# drop explicit None values
					if v is None:
						continue
					# omit disabled when it's False to keep output concise
					if v is False:
						continue
					out[k] = _clean(v)
				return out
			if isinstance(obj, (list, tuple)):
				cleaned = [_clean(v) for v in obj]
				return cleaned if isinstance(obj, list) else tuple(cleaned)
			return obj

		return _clean(raw)

	def to_json(self, indent: int = 5):
		"""Returns a JSON string representation of the node."""
		return json.dumps(self.to_dict(), indent=indent)

	@staticmethod
	def from_dict(data: dict):
		"""Create a BaseNode (or subclass) from a plain dict.

		Only keys that match dataclass fields and whose values are not None
		will be forwarded to the constructor. This keeps the resulting
		object free of explicit None entries.
		"""

		if not isinstance(data, dict):
			raise TypeError("from_dict expects a dict")
		base_fields = {f.name for f in fields(BaseNode)}

		kwargs = {}
		for k, v in data.items():
			if k == "children" and len(v) > 0:
				kwargs[k] = []
				for child in v:
					kwargs[k].append(BaseNode.from_dict(child))
				continue
			if k in base_fields and v is not None:
				kwargs[k] = v

		# Ensure 'type' exists (it's required)
		if 'type' not in kwargs:
			raise ValueError("missing required field 'type' for BaseNode")

		return BaseNode(**kwargs)

	@staticmethod
	def from_json(json_string: str, indent=0):
		# console.print(json_string)
		data = None
		if isinstance(json_string, str):
			data: dict = json.loads(json_string)
		data = BaseNode.from_dict(data)
		return data

	@staticmethod
	def from_json_to_file(json: dict | str):
		data = BaseNode.from_json(json)
		string = data.to_file()
		return string

	def to_file(self, indent: int = 0):
		"""Recursive, clean tree representation with icons."""
		# Root group should produce a simple dict with children
		indent_ = '  '
		indent_str = indent_ * indent
		# if self.name == "struts":
		# 	print(self.to_json())
		if self.type == "GROUP" and self.name == "root":
			dict_ = {"name": "root", "children": []}
			for child in cast(list, self.children or []):
				# append the child's file representation (may be str or dict)
				dict_["children"].append(child.to_file())
			return dict_
		elif self.type == "FILE":
			dict_ = {"resolved_path": self.resolved_path, "name": self.name}
			text = ""
			for child in cast(list, self.children or []):
				text += str(child.to_file())
			dict_["text"] = text
			return dict_
		elif self.type.startswith("GROUP") and self.children and len(self.children) < 1:
			disabled_text = "/-" if self.disabled else ""
			text = f"{indent_str}{disabled_text}{self.name} " + "{ }\n"
			return text
		elif self.type.startswith("GROUP") and self.one_line:
			disabled_text = "/-" if self.disabled else ""
			text = f"{indent_str}{disabled_text}{self.name} " + "{ "

			for child in cast(list, self.children or []):
				text += str(str(child.to_file(0)) + ";").replace("\n", "")
			text += " }\n"
			return text
		elif self.type.startswith("GROUP"):
			disabled_text = "/-" if self.disabled else ""
			newline = "\n" if not self.one_line else ""
			text = f"{indent_str}{disabled_text}{self.name} " + "{" + f"{newline}"
			# if self.name == "default-column-width":
			# 	print(self.to_json())
			for child in cast(list, self.children or []):
				text += str(child.to_file(indent + 2))
			text += f"{indent_str}" + "}\n"
			return text
		elif self.type == "COMMENT":
			# print(self.to_json())
			return f"{indent_str}{self.comment}\n"
		else:
			name_part = f'{self.name}' if self.name else ""
			disabled_text = "// " if self.disabled else ""
			header = f"{indent_str}{disabled_text}{name_part}"

			if hasattr(self, 'value') and self.value and not self.type == "COMMENT":
				header += f" {self.value}"

			if self.comment and self.type == "COMMENT":
				header += f"{self.comment}"
			elif self.comment:
				header += f"\t {self.comment}"

			if hasattr(self, 'children') and getattr(self, 'children'):
				result = f"{header} " + "{" + "\n"
				for child in getattr(self, 'children'):
					result += child.to_file(indent + 1)
				result += f"{indent_ * indent}" + "}\n"
				return result
			if self.type.startswith("GROUP") and self.one_line:
				console.print(f"{self} is one line")
				return f"{header.replace("\n", " ")}\n"
			return f"{header}\n"

	def __repr__(self, indent: int = 0) -> str:
		"""Recursive, clean tree representation with icons."""
		indent_ = '    '
		indent_str = indent_ * indent
		line_prefix = f"{self.token_number}: " if self.token_number is not None else ""

		name_part = f'{self.name}' if self.name else ""
		header = f"{line_prefix}{indent_str}{name_part}".strip()

		if hasattr(self, 'value') and self.value:
			header += f" {self.value}"

		if self.comment:
			header += f"{indent_str} {self.comment}"

		if hasattr(self, 'children') and getattr(self, 'children'):
			result = f"{header} [\n"
			for child in getattr(self, 'children'):
				result += child.__repr__(indent + 1)
			result += f"{indent_ * (indent + 1)}]\n"
			return result

		return f"{header}\n"


@dataclass(slots=True, repr=False)
class ItemPropsKey(BaseNode):
	type: NodeType = 'KEY'
	value: str = ""


@dataclass(slots=True, repr=False)
class ItemPropsGroup(BaseNode):
	type: NodeType = 'GROUP'

	one_line: Optional[bool] = None
	last_one_line: Optional[bool] = None
	comment: Optional[str] = None
	mode: Literal["niri", "mango", "hyprland"] = "niri"
	children: list['ItemProps'] = field(default_factory=list)


@dataclass(slots=True, repr=False)
class ItemPropsFile(BaseNode):
	type: NodeType = 'FILE'
	resolved_path: str = ""
	children: list['ItemProps'] = field(default_factory=list)


@dataclass(slots=True, repr=False)
class ItemPropsMisc(BaseNode):
	type: NodeType = 'COMMENT'
	value: Optional[str] = None


ItemProps = Union[ItemPropsKey, ItemPropsGroup, ItemPropsFile, ItemPropsMisc]
