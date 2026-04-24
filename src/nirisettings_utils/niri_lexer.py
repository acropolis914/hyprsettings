from dataclasses import dataclass
from pathlib import Path

from typing import Literal

from pygments.lexers.webassembly import builtins
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
# from rich import print, print_json
from rich.json import JSON
import json

console = Console()

try:
	from src.hyprsettings_utils.shared import state
except ImportError:
	class _State:
		hyprland_config_path: Path = Path(__file__).parent.parent.parent.resolve() / "config.kdl"
		verbose = False


	state = _State()


@dataclass
class KDLToken:
	type: Literal[
		"INT", "FLOAT", "WORD", "STRING", "LBRACE", "RBRACE", "WS", "COMMENT", "COMMENTBL", "SLASHDASH", "EOF", "BR", "UNKNOWN", "RAW", "FLOAT", "INT", "REGX", "OPERATION", "SEMIC", "BOOL"]
	value: str | None

	def get(self, field: str, default=None):
		return getattr(self, field, default)

	def to_dict(self):
		return {
			  "type": self.type,
			  "value": self.value
		}

	def __repr__(self):
		t = self.get("type")
		v = self.get("value")

		RESET = "\x1b[0m"
		BOLD = "\x1b[1m"

		DIM = "\x1b[2m"

		COLORS = {
			  "COMMENT": "\x1b[90m",
			  "WORD": "\x1b[32m",
			  "OPERATION": "\x1b[33m",
			  "STRING": "\x1b[35m",
			  "LBRACE": "\x1b[36m",
			  "RBRACE": "\x1b[36m",
			  "WS": "\x1b[37m",
			  "BR": "\x1b[34m",
			  "SEMIC": "\x1b[31m",
			  "EOF": "\x1b[90m",
			  "UNKNOWN": "\x1b[41m",
		}

		color = COLORS.get(t, "\x1b[37m")

		if v is None:
			value_str = f"{DIM}None{RESET}"
		else:
			raw = str(v).replace("\n", "\\n").replace("\t", "\\t")
			value_str = f"{DIM}'{RESET}{raw}{DIM}'{RESET}"

		return f"{BOLD}{color}{t:<10}{RESET} {value_str}"


class Lexer:
	def __init__(self, string: str):
		self.text = string
		self.pos = 0
		self.char = self.text[self.pos] if self.text else None
		self.tokens = []

	def advance(self, amount: int = 1):
		self.pos += amount
		if self.pos < len(self.text):
			self.char = self.text[self.pos]
		else:
			self.char = None

	def tokenize(self):
		while self.char is not None:
			try:
				if self.char == "r" and self.peek(1) == "#" and self.peek(2) == "\"":
					raw_string = self.gather_regx()
					newNode = KDLToken("REGX", raw_string)
					self.tokens.append(newNode)
					continue
				elif self.char.isdigit():
					num: str
					isFloat: bool
					num, is_float = self.gather_num()
					token_type: Literal["FLOAT", "INT"] = "FLOAT" if is_float else "INT"
					newNode = KDLToken(token_type, num)
					self.tokens.append(newNode)
					continue
				elif self.char.isalpha():
					word = self.gather_word()
					if word == "true" or word == "false":
						newNode = KDLToken("BOOL", word)
					else:
						newNode = KDLToken("WORD", word)
					self.tokens.append(newNode)
					continue
				elif self.char == "/" and self.peek(1) == "/":
					comment_string = self.gather_comment()
					newNode = KDLToken("COMMENT", comment_string)
					# self.advance()
					self.tokens.append(newNode)
					while self.char.isspace() and self.char != "\n":
						self.advance()
					continue
				elif self.char == "/" and self.peek(1) == "-":
					newNode = KDLToken("SLASHDASH", "/-")
					self.tokens.append(newNode)
					self.advance(2)
					continue
				elif self.char == "/" and self.peek(1) == "*":
					comment_block = self.gather_comment_block()
					newNode = KDLToken("COMMENTBL", comment_block)
					self.tokens.append(newNode)
					self.advance(2)
					while self.char.isspace():
						self.advance()
					continue
				elif self.char == "\"":
					raw_string = self.gather_string()
					newNode = KDLToken("STRING", raw_string)
					self.advance()
					self.tokens.append(newNode)
					continue
				elif self.char == "\n":
					newNode = KDLToken("BR", self.char)
					self.tokens.append(newNode)
					self.advance()
					continue
				elif self.char.isspace():
					while self.peek().isspace():
						self.advance()
					newNode = KDLToken("WS", self.char)
					self.tokens.append(newNode)
					self.advance()
					continue
				elif self.char == "{":
					newNode = KDLToken("LBRACE", self.char)
					self.tokens.append(newNode)
					self.advance()
					continue
				elif self.char == "}":
					newNode = KDLToken("RBRACE", self.char)
					self.tokens.append(newNode)
					self.advance()
					continue
				elif self.char == ";":
					newNode = KDLToken("SEMIC", self.char)
					self.tokens.append(newNode)
					self.advance()
					continue
				elif self.char in "+=-*":
					newNode = KDLToken("OPERATION", self.char)
					self.tokens.append(newNode)
					self.advance()
					continue
				elif self.char is not None:
					newNode = KDLToken("UNKNOWN", self.char)
					self.tokens.append(newNode)
					self.advance()
					continue
				else:
					break
			# if self.char is None:
			# 	break
			except Exception as e:
				console.print(f"Error parsing {self.char}:\n{e}\n")
		return self.tokens

	def peek(self, direction: int = 1) -> str:
		if self.pos + direction >= len(self.text):
			return ""
		return self.text[self.pos + direction]

	def gather_word(self):
		start_pos = self.pos
		while (self.pos < len(self.text)) and (self.text[self.pos].isalpha() or self.text[self.pos] in ["-", "_"]):
			self.advance()
		return self.text[start_pos:self.pos]

	def gather_regx(self) -> str:
		start_pos = self.pos
		while not (self.peek(1) == "\"" and self.peek(2) == "#"):
			self.advance()
		self.advance(3)
		return self.text[start_pos:self.pos]

	def gather_num(self):
		start_pos = self.pos
		isFloat = False
		while self.char is not None and (self.char.isdigit() or self.char == "."):
			if self.char == ".":
				isFloat = True
			self.advance()
		return self.text[start_pos:self.pos], isFloat

	def gather_string(self):
		self.advance()
		start_pos = self.pos
		while self.char is not None:
			if self.char == "\"" and self.text[self.pos - 1] != "\\":
				break
			self.advance()
		return self.text[start_pos:self.pos]

	def gather_comment(self) -> str:
		self.advance(2)
		if self.char == " ":
			self.advance()
		start_pos = self.pos
		while self.char is not None:
			if (self.pos > len(self.text)) or (self.text[self.pos] in ["\n"]):
				# self.advance()
				break
			self.advance()
		comment = self.text[start_pos:self.pos]
		self.advance()
		return comment

	def gather_comment_block(self):
		self.advance(2)
		start_pos = self.pos
		while self.char is not None:
			if self.char == "*" and self.peek() == "/":
				break
			self.advance()
		block_comment = self.text[start_pos:self.pos]
		# self.advance(2)
		return block_comment


def test_lexer_permutations():
	unknown = []
	# These are the "Permutations" to test your loyalty and logic
	test_cases = [
		  "xkb { //booot",  # Comment immediately after brace
		  "touchpad//comment {",  # Comment touching ID and Brace
		  "// Line 1\n// Line 2\ninput {",  # Stacked line comments
		  "/* Block\n   Comment */ node",  # Multi-line block comment
		  "urgent-color \"#9b0000\" //dasdas",  # Inline comment after string

		  # --- 2. KDL SPECIAL TOKENS ---
		  "/-output \"eDP-1\" { mode \"1920\" }",  # The "Slash-Dash" (Node Comment)
		  "default-column-width { proportion 0.5; }",  # Semicolon terminator
		  "window-rule { match app-id=r#\"wez\"# }",  # Raw string (r#"..."#)
		  "position x=1280 y=0",  # Properties (ID=VALUE)
		  "()\"typed-string\"",  # Type annotation (empty parens)

		  # --- 3. NIRI-SPECIFIC QUIRKS ---
		  "Mod+Shift+Slash { show-hotkey; }",  # Complex IDs with '+' and '-'
		  "match app-id=r#\"firefox$\"# title=\"^P\"",  # Multiple props/args no spaces
		  "scale 2.0",  # Floats
		  "open-floating true",  # Booleans
		  "screenshot-path \"~/Pictures/%Y-%m.png\"",  # Strings with symbols

		  # --- 4. STRUCTURAL COMPRESSION ---
		  "node{key=1;key=2};next-node;third{}",  # Maximum density
		  "layout { gaps 16 } // end of layout",  # Trailing comments
		  "window-rule { match app-id=r#\"^org\\.wezfurlong\\.wezterm$\"# }",  # Escaped regex
	]

	for i, code in enumerate(test_cases):

		try:

			console.print(f"[bold cyan]Test Case #{i + 1}[/bold cyan]")
			lexer = Lexer(code)
			tokens = lexer.tokenize()
			# The Raw Input
			console.print("[green bold]KDL Input:[/green bold]")
			console.print(f"{code}\n")

			# table = Table(title="Lexer Output", show_header=True, header_style="bold magenta")
			# table.add_column("Type", style="dim", width=15)
			# table.add_column("Value", style="yellow")
			# json_table = []
			# for token in tokens:
			# 	t_type = token.get('type', 'UNKNOWN')
			# 	t_val = repr(token.get('value', ''))  # repr to see \n or spaces
			# 	# table.add_row(t_type, t_val)
			# 	json_table.append({
			# 		  "type": token.type,
			# 		  "value": token.value
			# 	})
			#
			# # print_json(data=json_table)
			basicTable = "Tokenized:\n"
			for token in tokens:
				if token.get("type") == "UNKNOWN":
					unknown.append(token.get("value"))
					console.print(f"[bold red]UNKNOWN: {token.get("value")}")
				basicTable += f"[bold blue]{token.get("type")}[/bold blue]:\t{repr(token.get("value"))}\n"
			console.print(basicTable)
			# console.print("\n")
			console.print(f"[bold]End of Test Case #{i + 1}[/bold]\n\n")

		except Exception as e:
			console.print(f"\n[red bold]Error parsing case #{i + 1}:\n{test_cases[i]}\n[/red bold]{e}\n")
	print(f"Unknown stuff: {unknown}")


if __name__ == "__main__":
	console.clear()
	# test_lexer_permutations()
	tokens = Lexer(open(state.hyprland_config_path).read()).tokenize()
	print("\n".join(repr(t) for t in tokens))
# print(json.dumps([t.to_dict() for t in tokens], indent=2))
# console.clear()
