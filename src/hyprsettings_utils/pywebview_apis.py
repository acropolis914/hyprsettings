from configparser import ConfigParser
import json
import os
import subprocess
from pathlib import Path
from packaging.version import Version
from rich.console import Console

from .shared import hs_globals, state
import tomlkit as toml

thisfile_path = Path(__file__).parent.resolve()
thisfile_path_parent = thisfile_path.parent.resolve()
console = Console()

from .hyprland_parser import ConfigParser, Node, makeUUID
from .utils import log, ui_print


class Api:
	global current_config

	def __init__(self):
		self.window_config = None

	def init(self):
		return self.get_config()

	@staticmethod
	def get_hyprland_config(path=None):
		global current_config
		path = path if path else state.hyprland_config_path
		config = ConfigParser(path).root.to_json()
		current_config = config
		return config

	@staticmethod
	def get_hyprland_config_texts(json_string: str):
		node = Node.from_json(json_string)
		files = node.to_hyprland(indent_level=0, save=False)
		return files

	@staticmethod
	def save_config(json_string: str, changedFiles=None):
		# console.print_json(json)
		node = Node.from_json(json_string)
		files = node.to_hyprland(save=True, changedFiles=changedFiles)
		# console.print(Pretty(files))
		return files

	@staticmethod
	def new_uuid(length: int = 8) -> str:
		return makeUUID(length)

	@staticmethod
	def get_hyprsettings_version():
		return hs_globals.CURRENT_VERSION

	def read_window_config(self):
		def version_migration():
			file_info = self.window_config['file_info']
			persistence = self.window_config.setdefault('persistence', toml.table())

			# Define the migration map: (key, from_table, to_table)
			migrations = [
				('last_tab', 'config', 'persistence'),
				('first_run', 'config', 'persistence'),
				('onboarding_version', 'file_info', 'persistence'),
			]

			def move_key(key, src, dest):
				try:
					if key in self.window_config.get(src, {}):
						self.window_config[dest][key] = self.window_config[src].pop(key)
						return True
				except Exception as e:
					log(f'{e} in hyprsettings.toml[{src}]', prefix='Config Version Migrator')
				return False

			# Check version and migrate
			current_v = Version('.'.join(hs_globals.CURRENT_VERSION.split('.')[:3]))
			if Version(file_info['version']) < current_v:
				log(f'Config version {file_info["version"]} older than {hs_globals.CURRENT_VERSION}. Migrating...')
				file_info['version'] = hs_globals.CURRENT_VERSION

				for key, src, dest in migrations[:2]:  # Handles last_tab and first_run
					move_key(key, src, dest)

			# Handle onboarding specifically
			if persistence.get('onboarding_version') != hs_globals.ONBOARDING_VERSION:
				if move_key('onboarding_version', 'file_info', 'persistence'):
					persistence['onboarding_version'] = hs_globals.ONBOARDING_VERSION

			self.window_config = self.window_config

		def add_missing_keys():
			defaults = {'daemon': False}
			persistence_keys = {'onboarding_version': 0.8}
			config_lines = self.window_config['config']

			for key, val in defaults.items():
				if key not in config_lines:
					config_lines[key] = val

			persistence = self.window_config.get('persistence')
			if persistence is None:
				self.window_config['persistence'] = toml.table()
			for key, val in persistence_keys.items():
				if key not in persistence:
					persistence[key] = val

		def create_new_config():
			def list_fonts(mono=False, nerd=False):
				cmd = "fc-list --format='%{family}\n'"
				if mono:
					cmd = "fc-list :spacing=100 --format='%{family}\n'"
				if nerd:
					cmd += " | grep -i 'Nerd'"
				cmd += ' | sort -u'
				result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
				return [f.strip() for f in result.stdout.splitlines() if f.strip()]

			template = Path(thisfile_path_parent / 'default_config.toml')
			if not template:
				log('Template not found in the directory')
				return {'configuration-error': 'Template not found in the directory'}
			temporary_font = None
			try:
				temporary_font = list_fonts(mono=False, nerd=True)[1]
			except IndexError as e:
				log(f'No nerd font found. Using monospace., {e}')
				temporary_font = None

			with open(
				template,
				'r',
			) as default_config:
				default_config_text = default_config.read()

			self.window_config = toml.parse(default_config_text)
			self.window_config['config']['font'] = temporary_font if temporary_font else 'monospace'
			add_missing_keys()
			if self.window_config['persistence']['onboarding_version'] != hs_globals.ONBOARDING_VERSION:
				self.window_config['persistence']['fist_run'] = True
				self.window_config['persistence']['onboarding_version'] = hs_globals.ONBOARDING_VERSION
			version_migration()
			if self.window_config['config']['daemon']:
				state.daemon = True
			with hs_globals.HYPRSETTINGS_CONFIG_PATH.open('w') as config_file:
				config_file.write(default_config_text)
			return self.window_config

		def read_old_config():
			with hs_globals.HYPRSETTINGS_CONFIG_PATH.open('r', encoding='utf-8') as config_file:
				config = None
				try:
					config = toml.parse(config_file.read())
				except toml.exceptions.TOMLKitError as e:
					log('')
					raise Exception('Encountered an exception reading your old config:', e)
				# log(config)
				self.window_config = config
				add_missing_keys()
				if self.window_config['persistence']['onboarding_version'] != hs_globals.ONBOARDING_VERSION:
					self.window_config['persistence']['first_run'] = True
					self.window_config['persistence']['onboarding_version'] = hs_globals.ONBOARDING_VERSION
				version_migration()
				if self.window_config['config']['daemon']:
					state.daemon = True
				return self.window_config

		if not hs_globals.HYPRSETTINGS_CONFIG_PATH.is_file() or hs_globals.HYPRSETTINGS_CONFIG_PATH.stat().st_size == 0:
			if hs_globals.HYPRSETTINGS_CONFIG_PATH.stat().st_size == 0:
				log('Config file exists but is empty. Creating a new one.')
			else:
				log(f'Configuration file not found in {hs_globals.HYPRSETTINGS_CONFIG_PATH}')
			create_new_config()
		else:
			try:
				log('Configuration found. Reading configuration file')
				return read_old_config()
			except Exception as e:
				log(f'Encountered an exception reading your old config: {e}')
				log('Backing up old config and creating a new one')
				old_config = open(hs_globals.HYPRSETTINGS_CONFIG_PATH, 'r', encoding='utf-8').read()
				old_config_parent = hs_globals.HYPRSETTINGS_CONFIG_PATH.parent
				with open(old_config_parent / 'hyprsettings.toml.bak', 'w', encoding='utf-8') as backup_file:
					backup_file.write(old_config)
				return create_new_config()

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

	def save_window_config(self, json_fromjs, part='config'):
		log(f'Called save window {part}')
		config_from_json = json.loads(json_fromjs)
		for key in config_from_json:
			self.window_config[part][key] = config_from_json[key]
		hs_globals.HYPRSETTINGS_CONFIG_PATH = Path.home() / '.config' / 'hypr' / 'hyprsettings.toml'
		with open(hs_globals.HYPRSETTINGS_CONFIG_PATH, 'w', encoding='utf-8') as config_file:
			config_tosave = toml.dumps(self.window_config)
			config_file.write(config_tosave)

	@staticmethod
	def getDebugStatus():
		isDebugging = state.args.debug
		# print("Debug mode: ", isDebugging)
		return isDebugging

	@staticmethod
	def open_file(file_path: str):
		ui_print(f'Opening {file_path}')
		try:
			subprocess.Popen(
				['code', file_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, close_fds=True
			)
			return True
		except Exception as e:
			ui_print(f'Failed to open {file_path}: {e}')
			return False


api = Api()
