from dataclasses import dataclass
from pathlib import Path
from typing import cast
from unittest import result

from node_types import (
	NodeType,
	ItemProps,
	ItemPropsKey,
	ItemPropsGroup,
	ItemPropsFile,
	ItemPropsMisc,
)

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from rich import print_json
from rich.json import JSON
import json
from niri_lexer import KDLToken, Lexer

console = Console()

try:
	from src.hyprsettings_utils.shared import state
except ImportError:

	class _State:
		hyprland_config_path: Path = Path(__file__).parent.parent.parent.resolve() / 'config_niri_short.kdl'
		verbose = False


	state = _State()


class Parser:
	def __init__(self, tokens: list[KDLToken]):
		self.tokens = tokens
		self.position = 0
		self.current_token: KDLToken = self.tokens[self.position] if self.tokens else KDLToken(type='EOF', value=None)
		# root AST is a group node
		self.ast: ItemPropsGroup = ItemPropsGroup(name='root')
		# parent stack contains group/file nodes that can have children
		self.parentStack: list[ItemPropsGroup] = [self.ast]

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
		result = []
		pos = self.position
		while pos < len(self.tokens) and self.tokens[pos].type != token_type:
			result.append(self.tokens[pos])
			pos += 1
		return result

	def peek_back_until(self, token_type: str) -> list[KDLToken]:
		result_ = []
		pos = self.position - 1
		while self.tokens[pos].type != token_type:
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
				newNode = ItemPropsMisc(name=None, value=self.current_token.value or '', type='COMMENT',
				                        token_number=self.position, resolver='comment')
				self.parentStack[-1].children.append(newNode)
				self.consume()
				self.consume()  # comments always has a \n at the end and were gonna eat that up
				continue
			# resolver: comment_block
			elif self.current_token.type in ['COMMENTBL']:
				newNode = ItemPropsMisc(name=None, value=self.current_token.value or '', type='COMMENT_BLOCK',
				                        token_number=self.position, resolver='comment_block')
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
				newNodeName: str = self.current_token.value or ''
				while self.peek().type in ['OPERATION', 'WORD', 'INT', 'WS']:
					newNodeName += self.peek().value
					self.consume()
				self.consume_until('LBRACE')
				self.consume()  # consume '{'
				newNode = ItemPropsGroup(name=newNodeName.strip(), type='KEYBIND_GROUP', token_number=self.position,
				                         resolver='keybind_group')
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				continue


			# These are groups uwu
			# resolver: group_word_lbrace
			elif self.current_token.type == 'WORD' and self.peek(ignore_ws=True).type == 'LBRACE':
				newNodeName = self.current_token.value or ''
				self.consume_until('LBRACE')
				self.consume()  # consume '{'
				newNode = ItemPropsGroup(name=newNodeName, type='GROUP', token_number=self.position,
				                         resolver='group_word_lbrace')
				left_tokens = self.peek_until("BR")
				last_tokens = []
				for token in left_tokens:
					if token.type == "RBRACE":
						newNode.one_line = True
					elif token.type == "COMMENT":
						newNode.comment = token.value
					else:
						last_tokens.append(token)
					self.consume()
				console.print(
					  f"[blue bold][GROUP_LBRACE:[/blue bold]{self.position}{newNode} Last Left Tokens:] {last_tokens}") if len(
					  last_tokens) > 0 else None

				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
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
				self.parentStack[-1].children.append(newNode)
				self.parentStack.append(newNode)
				continue
			# Handle key-value pairs
			# resolver: key_value
			elif self.current_token.type == 'WORD' and self.peek(ignore_ws=True).type in ['FLOAT', 'INT', 'STRING',
			                                                                              "REGX", "BOOL", "WORD"]:
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
					  resolver='key_value',
					  comment=comment_
				)

				self.parentStack[-1].children.append(newNode)
				last_tokens = []
				# if any(tok.type == "RBRACE" for tok in left_tokens):
				# 	console.print(self.peek_back_until("BR"))
				for token in left_tokens:
					if (token.type == "RBRACE" and
						  any(tok.type == "LBRACE" for tok in self.peek_back_until("BR"))):
						self.parentStack[-1].one_line = True
						# console.print(f"{repr(newNode).strip()} is a one liner")
						self.parentStack.pop()

					elif token.type == "RBRACE":
						self.parentStack[-1].last_one_line = True
						self.parentStack.pop()

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
				group_name = self.peek(-1, ignore_ws=True).value if self.peek(-1,
				                                                              ignore_ws=True).type == 'WORD' else ''
				new_group = ItemPropsGroup(name=group_name, type='GROUP', resolver='lbrace')
				self.parentStack[-1].children.append(new_group)
				self.parentStack.append(new_group)
				self.consume()  # consume '{'
				continue
			# resolver: word_key
			elif self.current_token.type == 'WORD':
				newNode = ItemPropsKey(name=self.current_token.value, type='KEY', token_number=self.position,
				                       resolver='word_key')
				self.parentStack[-1].children.append(newNode)
				left_tokens = self.consume_until("BR")
				for token in left_tokens:
					if token.type == "COMMENT":
						setattr(newNode, 'comment', token.value)
					elif token.type == "RBRACE":
						self.parentStack.pop()
				self.consume()
				continue
			# elif self.current_token.type not in ['BR', 'WS']:
			#   self.parentStack[-1].children.append(NiriNodeTree(name=self.current_token.value or '', type_=self.current_token.type))
			#   self.consume()
			#   continue

			# resolver: rbrace
			elif self.current_token.type == 'RBRACE':
				lastNodeGroup = self.parentStack[-1]
				# mark the group that is being closed by a RBRACE
				lastNodeGroup.resolver += "+rbrace"
				if len(self.parentStack) > 1:
					self.parentStack.pop()
				else:
					console.print(
						  f'\
[red]Warning: Unmatched closing brace at token {self.position}: [/red]\n\
{self.tokens[(self.position - 15): (self.position - 1)]}\n\
----> [red]{self.current_token}[/red]\
{self.tokens[(self.position + 1): (self.position + 5)]}\
					'
					)
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
		}

		return k in modifiers


if __name__ == '__main__':
	# console.clear()
	print("\033[3J\033[H\033[2J", end="")
	# test_lexer_permutations()
	tokens = Lexer(open(state.hyprland_config_path).read()).tokenize()
	parsed = Parser(tokens).parse()
	with open("ouput.json", "w+") as file:
		file.write(parsed.to_json())
# console.print_json(parsed.to_json())
# print('\n'.join(repr(t) for t in tokens))
