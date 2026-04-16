import json
import os
from os import PathLike
import subprocess
from pathlib import Path
from packaging.version import Version
import rich
import rich.traceback
from rich.console import Console

import tomlkit as toml

from .shared import hs_globals, state
from .hyprland_parser import HyprParser, makeUUID
from .utils import log, ui_print, get_user_string

thisfile_path = Path(__file__).parent.resolve()
thisfile_path_parent = thisfile_path.parent.resolve()
rich.traceback.install(show_locals=True)
console = Console()


class Api:
	global current_config

	def __init__(self):
		self.window_config = None

	@staticmethod
	def get_hyprland_config(path: PathLike | None = None):
		global current_config
		path = path if path else state.hyprland_config_path
		config_node = HyprParser.load(path)
		# log(f'Config loaded from {path},{config_node}')
		config = config_node.to_json()
		# current_config = config
		return config

	@staticmethod
	def parse_hypr_string(string) -> str:
		return HyprParser.load_string(string).to_json()

	@staticmethod
	def get_hyprland_config_texts(json_string: str):
		node = HyprParser.from_json(json_string)
		files = node.to_hyprland(indent_level=0, save=False)
		return files

	@staticmethod
	def save_config(json_string: str, changedFiles=None):
		node = HyprParser.from_json(json_string)
		files = node.to_hyprland(save=True, changedFiles=changedFiles)
		return files

	@staticmethod
	def new_uuid(length: int = 8) -> str:
		return makeUUID(length)

	@staticmethod
	def get_hyprsettings_version():
		return hs_globals.CURRENT_VERSION

	def get_builtin_themes(self):
		file_path = thisfile_path_parent / 'themes_builtin'
		themes = []
		for file in os.listdir(file_path):
			theme_file = Path(file_path / file)
			if not theme_file.is_file():
				continue
			if not str(theme_file).endswith('.toml'):
				continue
			with open(theme_file, 'r', encoding='utf-8') as theme:
				file_content = theme.read()
				theme_content = toml.parse(file_content)
				# print(f'Theme content: {theme_content}')
				for theme_definition in theme_content.get('theme', []):
					themes.append(theme_definition)
		return themes

	@staticmethod
	def getDebugStatus():
		isDebugging = state.args.debug
		# print("Debug mode: ", isDebugging)
		return isDebugging

	@staticmethod
	def open_file(file_path: str):
		ui_print(f'Opening {file_path}')
		try:
			subprocess.Popen(['code', file_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
			                 stdin=subprocess.DEVNULL, close_fds=True)
			return True
		except Exception as e:
			ui_print(f'Failed to open {file_path}: {e}')
			return False


api = Api()
