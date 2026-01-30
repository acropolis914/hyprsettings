from configparser import ConfigParser
import json
import os
import subprocess
from pathlib import Path
from packaging.version import Version
from python.shared import state, hs_globals
import tomlkit as toml

thisfile_path = Path(__file__).parent.resolve()
thisfile_path_parent = thisfile_path.parent.resolve()

from 


class Api:
	def __init__(self):
		self.window_config = None

	def init(self):
		return self.get_config()

	@staticmethod
	def get_config(path=None):
		state.hyprland_config_path = path if path else state.hyprland_config_path
		config = ConfigParser(state.hyprland_config_path, verbose=state.verbose).root.to_json()
		return config

	@staticmethod
	def save_config(json: str, changedFiles: list = []):
		# console.print_json(json)
		Node.from_json(json).to_hyprland(indent_level=0, save=True, changedFiles=changedFiles)

	@staticmethod
	def new_uuid(length: int = 8) -> str:
		return makeUUID(length)

	def read_window_config(self):
		def version_migration():
			file_info = self.window_config['file_info']
			if Version(file_info['version']) < Version(hs_globals.CURRENT_VERSION):
				log(
					f'Config version {file_info["version"]} is older than current {hs_globals.CURRENT_VERSION}. Updating version, moving keys.'
				)
				file_info['version'] = hs_globals.CURRENT_VERSION
				persistence = self.window_config.get('persistence')
				if persistence is None:
					self.window_config['persistence'] = toml.table()
				try:
					# self.window_config["config"]["last_tab"]
					self.window_config['persistence']['last_tab'] = self.window_config['config']['last_tab']
					self.window_config['config'].pop('last_tab')
					self.window_config = self.window_config
				except Exception as exception:
					log(
						str(exception) + 'in hyprsettings.toml[config]',
						prefix='Config Version Migrator',
					)
				try:
					# self.window_config["config"]["last_tab"]
					self.window_config['persistence']['first_run'] = self.window_config['config']['first_run']
					self.window_config['config'].pop('first_run')
					self.window_config = self.window_config
				except Exception as exception:
					log(
						str(exception) + 'in hyprsettings.toml[config]',
						prefix='Config Version Migrator',
					)

		def add_missing_keys():
			defaults = {'daemon': False}
			config_lines = self.window_config['config']
			for key, val in defaults.items():
				if key not in config_lines:
					config_lines[key] = val

		window_config_path = Path.home() / '.config' / 'hypr' / 'hyprsettings.toml'
		template = Path(thisfile_path_parent / 'default_config.toml')

		if not window_config_path.is_file() or window_config_path.stat().st_size == 0:
			temporary_font = None
			try:
				temporary_font = self.list_fonts(mono=False, nerd=True)[1]
			except IndexError:
				log('No nerd font found. Using monospace.')
			temporary_font = None

			log(f'Config file not found in {window_config_path}')
			with open(
				template,
				'r',
			) as default_config:
				default_config_text = default_config.read()

			self.window_config = toml.parse(default_config_text)
			self.window_config['config']['font'] = temporary_font if temporary_font else 'Monospace'
			add_missing_keys()
			version_migration()
			if self.window_config['config']['daemon']:
				state.daemon = True
			with window_config_path.open('w') as config_file:
				config_file.write(default_config_text)
			return self.window_config
		else:
			with window_config_path.open('r', encoding='utf-8') as config_file:
				config = None
				try:
					config = toml.parse(config_file.read())
				except toml.exceptions.TOMLKitError as e:
					log(e)
					return {'configuration-error': str(e)}
				self.window_config = config
				version_migration()
				add_missing_keys()
				if self.window_config['config']['daemon']:
					state.daemon = True
				return self.window_config

	def get_builtin_themes(self):
		file_path = thisfile_path_parent / 'ui' / 'themes_builtin'
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

	def save_window_config(self, json_fromjs, part='config'):
		# print(f"Called save window {part}")
		config_from_json = json.loads(json_fromjs)
		for key in config_from_json:
			self.window_config[part][key] = config_from_json[key]
		window_config_path = Path.home() / '.config' / 'hypr' / 'hyprsettings.toml'
		with open(window_config_path, 'w', encoding='utf-8') as config_file:
			config_tosave = toml.dumps(self.window_config)
			config_file.write(config_tosave)

	@staticmethod
	def list_fonts(mono=False, nerd=False):
		cmd = "fc-list --format='%{family}\n'"
		if mono:
			cmd = "fc-list :spacing=100 --format='%{family}\n'"
		if nerd:
			cmd += " | grep -i 'Nerd'"
		cmd += ' | sort -u'
		result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
		return [f.strip() for f in result.stdout.splitlines() if f.strip()]

	@staticmethod
	def getDebugStatus():
		isDebugging = state.args.debug
		# print("Debug mode: ", isDebugging)
		return isDebugging


api = Api()
