import json
from dataclasses import dataclass, field, asdict
from typing import Literal, Union, Optional

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

	def __repr__(self, indent: int = 0) -> str:
		"""Recursive, clean tree representation with icons."""
		indent_ = '    '
		indent_str = indent_ * indent
		line_prefix = f"{self.token_number}: " if self.token_number is not None else ""

		name_part = f'name={self.name}' if self.name else ""
		header = f"{line_prefix}{indent_str}{self.type} {name_part}".strip()

		if hasattr(self, 'value') and self.value:
			header += f" {self.value}"

		if self.comment:
			header += f" # {self.comment}"

		if hasattr(self, 'children') and getattr(self, 'children'):
			result = f"{header} [\n"
			for child in getattr(self, 'children'):
				result += child.__repr__(indent + 1)
			result += f"{indent_ * (indent + 2)}]\n"
			return result

		return f"{header}\n"


@dataclass(slots=True, repr=False)
class ItemPropsKey(BaseNode):
	type: NodeType = 'KEY'
	value: str = ""


@dataclass(slots=True, repr=False)
class ItemPropsGroup(BaseNode):
	type: NodeType = 'GROUP'
	children: list['ItemProps'] = field(default_factory=list)
	one_line: bool = None
	last_one_line: bool = None
	comment: Optional[str] = None


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
