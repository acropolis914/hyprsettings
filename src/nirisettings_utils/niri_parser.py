from dataclasses import dataclass
from pathlib import Path
from typing import cast
from unittest import result
from textwrap import dedent
import hashlib
import base64

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from rich import print_json
from rich.json import JSON
import json

try:
	from node_types import (
		NodeType,
		ItemProps,
		ItemPropsKey,
		ItemPropsGroup,
		ItemPropsFile,
		ItemPropsMisc, BaseNode
	)
except Exception:
	from .node_types import (
		NodeType,
		ItemProps,
		ItemPropsKey,
		ItemPropsGroup,
		ItemPropsFile,
		ItemPropsMisc, BaseNode,
	)

try:
	from niri_lexer import KDLToken, NiriLexer
except Exception:
	from .niri_lexer import KDLToken, NiriLexer

console = Console()

try:
	from src.hyprsettings_utils.shared import state
except ImportError:
	class _State:
		hyprland_config_path: Path = Path(__file__).parent.parent.parent.resolve() / 'config_niri_short.kdl'
		verbose = False


	state = _State()
try:
	from hyprsettings_utils.utils import stable_hash
except:
	def stable_hash(value: str, length: int = 9) -> str:
		digest = hashlib.sha256(value.encode()).digest()
		return base64.urlsafe_b64encode(digest).decode().rstrip("=")[:length]


class NiriParser:
	def __init__(self, tokens: list[KDLToken]):
		self.tokens = tokens
		self.position = 0
		self.current_token: KDLToken = self.tokens[self.position] if self.tokens else KDLToken(type='EOF', value=None)
		# root AST is a group node
		self.ast: ItemPropsGroup | ItemPropsFile = ItemPropsGroup(name='root')
		# parent stack contains group/file nodes that can have children
		self.parentStack: list[ItemPropsGroup | ItemPropsFile] = [self.ast]

	@staticmethod
	def load_file(path: str | Path):
		"""
		This is a single entrypoint function. Put one file and it will parse the file
		along with other files included within the file
		Args:
			path: str

		Returns:

		"""
		root = ItemPropsGroup(name="root", children=[])

		def load_(path):
			newFileNode = NiriParser.parse_single_file(path)
			root.children.append(newFileNode)
			sourced_files = [file_ for file_ in newFileNode.children if file_.name == "include"]
			for file_ in sourced_files:
				newPath = NiriParser.resolve_paths(path, file_.value.strip('\"'))
				load_(newPath)

		# console.print(newFileNode.to_json())
		load_(path)
		return root

	@staticmethod
	def resolve_paths(parent_path: str | Path, included_path: str | Path) -> Path:
		parent_path = Path(parent_path).resolve()
		if parent_path.is_file():
			parent_path = parent_path.parent
		included_path = Path(included_path.strip())

		if str(included_path)[0].isalpha():
			return Path(parent_path / included_path).resolve()
		elif str(included_path)[0] == "~":
			return Path(included_path).expanduser().resolve()
		return None

	@staticmethod
	def parse_single_file(path):
		file_content = Path(path).read_text()
		file_tokens = NiriLexer(file_content).tokenize()
		# console.print(file_tokens)
		parser = NiriParser(file_tokens)
		newFileNode = ItemPropsFile(resolved_path=str(Path(path).resolve()), name=f"{stable_hash(str(path), 9)}.kdl",
		                            uuid=stable_hash(str(path), 9))
		parser.ast = newFileNode
		parser.parentStack = [newFileNode]
		parsed_ = parser.parse()
		return parsed_

	def peek(self, offset=1, ignore_ws=False) -> KDLToken:
		if ignore_ws:
			pos = self.position
			while pos + offset < len(self.tokens):
				if self.tokens[pos + offset].type != 'WS':
					return self.tokens[pos + offset]
				pos += 1
			return KDLToken(type='EOF', value=None)
		if self.position + offset < len(self.tokens):
			return self.tokens[self.position + offset]
		else:
			return KDLToken(type='EOF', value=None)

	def peek_until(self, token_type: str) -> list[KDLToken]:
		result_ = []
		pos = self.position
		while pos < len(self.tokens) and self.tokens[pos].type != token_type:
			result_.append(self.tokens[pos])
			pos += 1
		return result_

	def peek_back_until(self, token_type: str) -> list[KDLToken]:
		result_ = []
		pos = self.position - 1
		while self.position > 0 and self.tokens[pos].type != token_type:
			result_.insert(0, self.tokens[pos])
			pos -= 1
		# console.print(f"puta {result_}")
		return result_

	def consume_until(self, token_types: str | list[str]) -> list[KDLToken]:
		if isinstance(token_types, str):
			token_types = [token_types]
		consumed = []
		while self.current_token.type not in token_types and self.current_token.type != 'EOF':
			consumed.append(self.current_token)
			self.consume()
		return consumed

	def consume(self, ignore_ws=False):
		self.position += 1
		self.current_token = self.tokens[self.position] if self.position < len(self.tokens) else KDLToken(type='EOF',
		                                                                                                  value=None)
		while ignore_ws and self.current_token.type == 'WS':
			self.position += 1
			self.current_token = self.tokens[self.position] if self.position < len(self.tokens) else KDLToken(
				  type='EOF', value=None)

	def parse(self):
		while self.current_token.type != 'EOF':
			# resolver: comment
			if self.current_token.type in ['COMMENT']:
				resolver_ = 'comment'
				newNode = ItemPropsMisc(name=None, comment=f"// {self.current_token.value}" or '',
				                        value=self.current_token.value or '', type='COMMENT',
				                        token_number=self.position, resolver=resolver_)
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				# console.print(newNode.position)
				self.parentStack[-1].children.append(newNode)
				self.consume()
				self.consume()  # comments always has a \n at the end and were gonna eat that up
				continue
			# resolver: comment_block
			elif self.current_token.type in ['COMMENTBL']:
				resolver_ = 'comment_block'
				newNode = ItemPropsMisc(name=None, comment=self.current_token.value or "",
				                        value=self.current_token.value or '', type='COMMENT',
				                        token_number=self.position, resolver=resolver_)
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				self.parentStack[-1].children.append(newNode)
				self.consume()
				continue
			# This is for keybinds.The rule is that they should not have spaces in between
			# resolver: keybind_group
			elif (
				  self.current_token.type in ['WORD']
				  and self.is_modifier(cast(str, self.current_token.value))
				  and self.peek().type in ['OPERATION', 'WORD', 'INT']
			):
				resolver_ = 'keybind_group'
				newNodeName: str = self.current_token.value or ''
				while self.peek().type in ['OPERATION', 'WORD', 'INT', 'WS', "BOOL", "STRING"]:
					if self.peek().type == "STRING":
						newNodeName += f"\"{self.peek().value}\""
					else:
						newNodeName += self.peek().value
					self.consume()
				self.consume_until('LBRACE')
				self.consume()  # consume '{'
				newNode = ItemPropsGroup(name=newNodeName.strip(), type='GROUP_KB', token_number=self.position,
				                         resolver=resolver_)  # Todo Return to KEYBIND_GROUP
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				continue


			# These are groups uwu
			# resolver: group_word_lbrace
			elif self.current_token.type == 'WORD' and self.peek(ignore_ws=True).type == 'LBRACE':
				resolver_ = 'group_word_lbrace'
				newNodeName = self.current_token.value or ''
				self.consume_until('LBRACE')
				self.consume()  # consume '{'
				newNode = ItemPropsGroup(name=newNodeName, type='GROUP', token_number=self.position,
				                         resolver=resolver_)
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				left_tokens = self.peek_until("BR")
				last_tokens = []
				for token in left_tokens:
					if token.type == "RBRACE":
						newNode.one_line = True
						self.pop_parentstack(resolver_)
					elif token.type == "COMMENT":
						newNode.comment = token.value
					else:
						last_tokens.append(token)
					self.consume()
				console.print(
					  f"[blue bold][GROUP_LBRACE:[/blue bold]{self.position}{newNode} Last Left Tokens:] {last_tokens}") if len(
					  last_tokens) > 0 else None

				continue


			# resolver: group_complex
			elif (
				  self.current_token.type == 'WORD' and self.peek(2).type in ["STRING", "BOOL",
				                                                              "OPERATION"] and self.peek(
				  4).type == 'LBRACE'
			):
				newNodeName = self.current_token.value or ''
				is_disabled = self.peek(-1).type == "SLASHDASH"

				self.consume()
				while self.current_token.type != 'LBRACE' and self.current_token.type != 'EOF':
					if self.current_token.type == "STRING":
						newNodeName += f"\"{self.current_token.value}\""
					else:
						newNodeName += self.current_token.value if self.current_token.value else ''
					self.consume()
				self.consume()  # consume '{'
				newNode = ItemPropsGroup(name=newNodeName.strip(), type='GROUP', token_number=self.position,
				                         resolver='group_complex', disabled=is_disabled)
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				continue
			# Handle key-value pairs
			# resolver: key_value
			elif self.current_token.type == 'WORD' and self.peek(ignore_ws=True).type in ['FLOAT', 'INT', 'STRING',
			                                                                              "REGX", "BOOL", "WORD"]:
				resolver_ = 'key_value'
				key_token = self.current_token
				is_disabled = self.peek(-1).type == "SLASHDASH"
				self.consume()
				value_string = ""
				value_tokens = self.consume_until("BR")
				left_tokens = []
				comment_ = None
				for token in value_tokens:
					if token.type not in ["COMMENT", "SEMIC", "RBRACE"]:
						value_string += token.value if token.type != "STRING" else f'"{token.value}"'
					# left_tokens.remove(token)
					elif token.type == "COMMENT":
						comment_ = token.value
					else:
						left_tokens.append(token)

				newNode = ItemPropsKey(
					  name=key_token.value,
					  type='KEY',
					  value=value_string.strip(),
					  token_number=self.position,
					  disabled=is_disabled,
					  resolver=resolver_,
					  comment=comment_
				)
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				try:
					self.parentStack[-1].children.append(newNode)
				except Exception as e:
					console.print(
						  f"\nEncountered an error: {e}\n for node [blue bold]{key_token.value}[/blue bold], token number {self.position}, Left Tokens {left_tokens}, {self.parentStack}")
				last_tokens = []
				# if any(tok.type == "RBRACE" for tok in left_tokens):
				# 	console.print(self.peek_back_until("BR"))
				for token in left_tokens:
					if (token.type == "RBRACE" and
						  any(tok.type == "LBRACE" for tok in self.peek_back_until("BR"))):
						self.parentStack[-1].one_line = True
						# console.print(f"{repr(newNode).strip()} is a one liner")
						self.pop_parentstack(resolver_)

					elif token.type == "RBRACE":
						self.parentStack[-1].last_one_line = True
						self.pop_parentstack(resolver_)

					elif token.type == "COMMENT":
						setattr(newNode, 'comment', token.value)
					elif token.type == "SEMIC":
						pass
					else:
						last_tokens.append(token)
				console.print(f"[KV {self.position}] Left tokens: {last_tokens}") if len(last_tokens) > 0 else ""
				continue

			# resolver: lbrace
			elif self.current_token.type == 'LBRACE':
				resolver_ = "lbrace"
				group_name = self.peek(-1, ignore_ws=True).value if self.peek(-1,
				                                                              ignore_ws=True).type == 'WORD' else ''
				newNode = ItemPropsGroup(name=group_name, type='GROUP', resolver=resolver_)
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				self.parentStack[-1].children.append(new_group)
				self.parentStack.append(new_group)
				self.consume()  # consume '{'
				continue
			# resolver: word_key
			elif self.current_token.type == 'WORD':
				resolver_ = "word_key"
				newNode = ItemPropsKey(name=self.current_token.value, type='KEY', token_number=self.position,
				                       resolver=resolver_)
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				self.parentStack[-1].children.append(newNode)
				left_tokens = self.consume_until("BR")
				for token in left_tokens:
					if token.type == "COMMENT":
						setattr(newNode, 'comment', token.value)
					elif token.type == "RBRACE":
						self.pop_parentstack(resolver_)
				self.consume()
				continue
			# elif self.current_token.type not in ['BR', 'WS']:
			#   self.parentStack[-1].children.append(NiriNodeTree(name=self.current_token.value or '', type_=self.current_token.type))
			#   self.consume()
			#   continue

			# resolver: rbrace
			elif self.current_token.type == 'RBRACE':
				resolver_ = "rbrace"
				lastNodeGroup = self.parentStack[-1]
				# mark the group that is being closed by a RBRACE
				lastNodeGroup.resolver += "+rbrace"
				self.pop_parentstack(resolver_)
				self.consume()
				left_tokens = self.consume_until("BR")
				last_tokens = []
				for token in left_tokens:
					if token.type == "COMMENT":
						existing = getattr(lastNodeGroup, 'comment', None)
						if existing:
							setattr(lastNodeGroup, 'comment', existing + token.value)
						else:
							setattr(lastNodeGroup, 'comment', token.value)
					elif token.type == "SEMIC":
						pass
					else:
						last_tokens.append(token)
				before_tokens = self.peek_back_until("BR")
				if any(tok.type in ["WORD", "INT", "BOOL", "STR"] for tok in before_tokens):
					lastNodeGroup.last_one_line = True
				console.print(f"[RBRACE:{self.position} Left Tokens]  {last_tokens}") if len(
					  last_tokens) > 0 else None
				continue
			# resolver: blank
			elif self.current_token.type == "BR" and self.peek(-1).type == "BR":
				newNode = ItemPropsMisc(type="BLANK", resolver='blank')
				newNode.position = "root:" + ":".join(node.name or "_" for node in self.parentStack)
				self.parentStack[-1].children.append(newNode)
				self.consume()
				continue
			# resolver: skipped
			else:
				if self.current_token.type not in [
					  'BR',
					  'WS',
					  "SLASHDASH"
				]:
					console.print(f'[yellow]Skipping token {self.position} {self.current_token}[/yellow]')
					# mark the parent as having encountered a skipped token (useful for debugging)
					setattr(self.parentStack[-1], 'resolver', 'skipped')
				self.consume()
				continue
		return self.ast

	@staticmethod
	def is_modifier(key: str) -> bool:
		k = key.strip()

		modifiers = {
			  'Ctrl',
			  'Control',
			  'Shift',
			  'Alt',
			  'Super',
			  'Win',
			  'ISO_Level3_Shift',
			  'Mod5',
			  'ISO_Level5_Shift',
			  'Mod',
			  "XF"
		}

		return k in modifiers

	def pop_parentstack(self, resolver=""):
		if len(self.parentStack) > 1:
			self.parentStack.pop()
		else:
			self.throw_parentstack_error(resolver)

	def throw_parentstack_error(self, current_resolver: str = ""):
		resolver_text = f"while resolving {current_resolver}" if current_resolver else ""
		console.print(dedent(f"""
	        [red]Warning: Unmatched closing brace at token {self.position} {resolver_text}:[/red]
	        {self.tokens[(self.position - 20):(self.position - 1)]}
	        ----> [red]{self.current_token}[/red]
	        {self.tokens[(self.position + 1):(self.position + 5)]}
	    """))
		return


if __name__ == '__main__':
	# console.clear()
	print("\033[3J\033[H\033[2J", end="")
	# test_lexer_permutations()
	filepath = Path("~/.config/niri/config.kdl").expanduser()
	# 	tokens = NiriLexer(filepath.read_text()).tokenize()
	# 	parsed = NiriParser(tokens).parse()
	# 	string = BaseNode(type="GROUP").from_json(parsed.to_json())
	# console.print(string)
	config = NiriParser.load_file(filepath)
	# console.log(config)
	# roundtriptest
	out = BaseNode.from_json_to_file(config.to_json())
	for file in out["children"]:
		console.print(f"\n\n File:{file["resolved_path"]}")
		# console.print(f"\n\n Content:\n{file["text"]}")
		path = str(file["resolved_path"]).replace("/home/acroarch/.config/niri",
		                                          str(Path(__file__).parent.resolve()))
		parentpath = Path(path).parent.resolve()
		Path.mkdir(parentpath, parents=True, exist_ok=True)
		with open(path, "w+", encoding="utf-8") as new_file:
			new_file.write(file["text"])
# console.print_json(data=)
# with open("ouput.json", "w+") as file:
# 	file.write(parsed.to_json())
# console.print_json(parsed.to_json())
# print('\n'.join(repr(t) for t in tokens))
