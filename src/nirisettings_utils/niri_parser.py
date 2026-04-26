from dataclasses import dataclass
from hmac import new
from pathlib import Path

from typing import Literal, cast
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from rich import print, print_json
from rich.json import JSON
import json
from niri_lexer import KDLToken, Lexer
from textwrap import dedent


console = Console()

try:
	from src.hyprsettings_utils.shared import state
except ImportError:

	class _State:
		hyprland_config_path: Path = Path(__file__).parent.parent.parent.resolve() / 'config_niri_short.kdl'
		verbose = False

	state = _State()
NodeType = Literal['KEY', 'GROUP', 'COMMENT', 'BLANK', 'FILE', 'GROUPEND', 'UNKNOWN']


class NiriNodeTree:
	def __init__(
		self,
		name: str | None,
		type_: NodeType,
		value: str = '',
		comment: str | None = None,
		position=None,
		disabled=False,
		resolved_path: str | None = None,
		token_number: int | None = None,
	):
		self.name = name
		self.type = type_
		self.value = value
		self.comment = comment
		self.position = position
		self.disabled = disabled
		self.resolved_path = resolved_path
		self.token_number = token_number
		self.children: list[NiriNodeTree] = []

	def __repr__(self, indent=0) -> str:
		indent_str = '   ' * indent
		result = f'{indent_str}name="{self.name}", type={self.type}, value="{self.value}", token_number={self.token_number}'
		if self.children:
			result += ', children: [\n'
			for child in self.children:
				result += child.__repr__(indent + 1)
			result += f'{indent_str}]\n'
		else:
			result += '\n'
		return result


class Parser:
	def __init__(self, tokens: list[KDLToken]):
		self.tokens = tokens
		self.position = 0
		self.current_token: KDLToken = self.tokens[self.position] if self.tokens else KDLToken(type='EOF', value=None)
		self.ast = NiriNodeTree(name='root', type_='GROUP')
		self.parentStack = [self.ast]

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

	# def peek_until(self, token_type: str) -> list[KDLToken]:
	# 	result = []
	# 	pos = self.position
	# 	while pos < len(self.tokens) and self.tokens[pos].type != token_type:
	# 		result.append(self.tokens[pos])
	# 		pos += 1
	# 	return result

	def consume(self, ignore_ws=False):
		if ignore_ws:
			while self.current_token.type == 'WS':
				self.consume()
		else:
			self.position += 1
			self.current_token = self.tokens[self.position] if self.position < len(self.tokens) else KDLToken(type='EOF', value=None)

	def parse(self):
		while self.current_token.type != 'EOF':
			if self.current_token.type == 'COMMENT':
				newNode = NiriNodeTree(name=None, type_='COMMENT', value=self.current_token.value or '', token_number=self.position)
				self.parentStack[-1].children.append(newNode)
				self.consume()
				continue

			elif (
				self.current_token.type in ['WORD']
				and self.is_modifier(cast(str, self.current_token.value))
				and self.peek().type in ['OPERATION', 'WORD', 'INT']
			):
				newNodeName: str = self.current_token.value or ''
				while self.peek().type in ['OPERATION', 'WORD', 'INT', 'WS']:
					newNodeName += self.peek().value
					self.consume()
				self.consume_until('LBRACE')
				self.consume()  # consume '{'
				newNode = NiriNodeTree(name=newNodeName, type_='KEYBIND_GROUP', token_number=self.position)
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				continue

			elif self.current_token.type == 'RBRACE':
				if len(self.parentStack) > 1:
					self.parentStack.pop()
				else:
					console.print(
						f'\
[red]Warning: Unmatched closing brace at token {self.position}: [/red]\n\
{self.tokens[(self.position - 15) : (self.position - 1)]}\n\
----> [red]{self.current_token}[/red]\
{self.tokens[(self.position + 1) : (self.position + 5)]}\
					'
					)
				self.consume()
				continue

			elif self.current_token.type == 'WORD' and self.peek(ignore_ws=True).type == 'LBRACE':
				newNodeName = self.current_token.value or ''
				self.consume_until('LBRACE')
				self.consume()  # consume '{'
				newNode = NiriNodeTree(name=newNodeName, type_='GROUP', token_number=self.position)
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				continue
			elif (
				self.current_token.type == 'WORD' and self.peek(ignore_ws=True).type == 'STRING' and self.peek(2, ignore_ws=True).type == 'LBRACE'
			):
				newNodeName = self.current_token.value or ''
				while self.current_token.type != 'LBRACE' and self.current_token.type != 'EOF':
					newNodeName += self.current_token.value if self.current_token.value else ''
					self.consume()
				self.consume()  # consume '{'
				newNode = NiriNodeTree(name=newNodeName, type_='GROUP', token_number=self.position)
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				continue
			# Handle key-value pairs where both key and value are WORD tokens
			elif self.current_token.type == 'WORD' and self.peek(ignore_ws=True).type in ['FLOAT', 'INT', 'STRING']:
				key_token = self.current_token
				value_token = self.peek(ignore_ws=True)
				newNode = NiriNodeTree(
					name=key_token.value,
					type_='KEY',
					value=value_token.value if value_token.type != 'STRING' else f'"{value_token.value}"',
					token_number=self.position,
				)
				self.parentStack[-1].children.append(newNode)
				self.consume()  # consume keys
				self.consume(ignore_ws=True)  # consume value
				continue

			elif self.current_token.type == 'LBRACE':
				group_name = self.peek(-1, ignore_ws=True).value if self.peek(-1, ignore_ws=True).type == 'WORD' else ''
				new_group = NiriNodeTree(name=group_name, type_='GROUP')
				self.parentStack[-1].children.append(new_group)
				self.parentStack.append(new_group)
				self.consume()  # consume '{'
				continue

			elif self.current_token.type == 'WORD':
				self.parentStack[-1].children.append(NiriNodeTree(name=self.current_token.value, type_='KEY', token_number=self.position))
				self.consume()
				continue
			# elif self.current_token.type not in ['BR', 'WS']:
			# 	self.parentStack[-1].children.append(NiriNodeTree(name=self.current_token.value or '', type_=self.current_token.type))
			# 	self.consume()
			# 	continue
			else:
				if self.current_token.type not in [
					'BR',
					'WS',
				]:
					console.print(f'[yellow]Skipping token {self.position} {self.current_token}[/yellow]')
				self.consume()
				continue
		return self.ast

	def consume_until(self, token_type: str):
		while self.current_token.type != token_type and self.current_token.type != 'EOF':
			self.consume()

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
		}

		return k in modifiers


if __name__ == '__main__':
	console.clear()
	# test_lexer_permutations()
	tokens = Lexer(open(state.hyprland_config_path).read()).tokenize()
	parsed = Parser(tokens).parse()
	print(parsed)
	# print('\n'.join(repr(t) for t in tokens))
