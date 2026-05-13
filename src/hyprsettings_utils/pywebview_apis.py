import os
from os import PathLike
import subprocess
from pathlib import Path
from typing import cast

import rich
import rich.traceback
from rich.console import Console

import tomlkit as toml

from nirisettings_utils.node_types import BaseNode, ItemPropsFile
from .shared import hs_globals, state
from .hyprland_parser import HyprParser, makeUUID

from .utils import log, ui_print
from nirisettings_utils.niri_parser import NiriParser

thisfile_path = Path(__file__).parent.resolve()
thisfile_path_parent = thisfile_path.parent.resolve()
rich.traceback.install(show_locals=True)
console = Console()


class Api:
	global current_config

	def __init__(self):
		self.window_config = None

	@staticmethod
	def get_wm_config(path: str | None = None):
		path = Path(path) if path else state.hyprland_config_path
		config = None
		if str(path).endswith("conf"):
			log(f'Loading Hyprland Conf {path}')
			config = HyprParser.load_file(path).to_json()
		# console.print_json(config)
		elif str(path).endswith("kdl"):
			log(f'Loading Niri Configuration: {str(path.resolve()).strip()}')
			config = NiriParser.load_file(path).to_json()
		# console.print_json(config)
		return config

	@staticmethod
	def parse_hypr_string(string) -> str:
		json = HyprParser.load_string(string).to_json()
		console.print_json(json)
		return json

	# @staticmethod
	# def parse_niri_string(string: str) -> str:
	# 	return NiriParser.parse()

	@staticmethod
	def get_hyprland_config_texts(json_string: str):
		if str(state.hyprland_config_path).endswith("conf"):
			node = HyprParser.from_json(json_string)
			files = node.to_hyprland(indent_level=0, save=False)
			return files
		return ""

	@staticmethod
	def save_wm_config(json_string: str, changedFiles=None):
		file = None
		if hs_globals.CONFIG_MODE == "HYPRLAND" or hs_globals.CONFIG_MODE == "MANGO":
			node = HyprParser.from_json(json_string)
			files = cast(dict, node.to_hyprland(save=True, changedFiles=changedFiles))
		elif hs_globals.CONFIG_MODE == "NIRI":
			node = BaseNode.from_json_to_file(json_string)
			files = node
			files_nodes = [cast(ItemPropsFile, file) for file in node["children"]]
			for file in files_nodes:
				# path = str(file["resolved_path"])
				path = Path(file["resolved_path"])
				parentpath = Path(path).parent.resolve()
				if file["name"] in changedFiles:
					Path.mkdir(parentpath, parents=True, exist_ok=True)
					new_path = path.with_name(f"{path.stem}_1{path.suffix}")
					console.print(f"Saving file: {file["resolved_path"]} as {new_path}")

					with open(new_path, "w+", encoding="utf-8") as new_file:
						new_file.write(file["text"])

		# print(node)
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
