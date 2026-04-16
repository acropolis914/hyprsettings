import json
import os
from os import PathLike
import subprocess
from pathlib import Path
from typing import Mapping

from packaging.version import Version
import rich
import rich.traceback
from rich.console import Console

import tomlkit as toml
from tomlkit import toml_document, TOMLDocument

from .shared import hs_globals, state
from .hyprland_parser import HyprParser, makeUUID
from .utils import log, ui_print, get_user_string, list_fonts

thisfile_path_parent = Path(__file__).parent.parent.resolve()
window_config: TOMLDocument = None


def read_window_config():
	if not hs_globals.HYPRSETTINGS_CONFIG_PATH.is_file():
		log(f'Configuration file not found in {hs_globals.HYPRSETTINGS_CONFIG_PATH}')
		return create_new_config()
	if hs_globals.HYPRSETTINGS_CONFIG_PATH.is_file() and hs_globals.HYPRSETTINGS_CONFIG_PATH.stat().st_size == 0:
		log('Config file exists but is empty. Creating a new one.')
		return create_new_config()
	else:
		try:
			log('Configuration found. Reading configuration file')
			config = read_old_config()
			# log(config)
			return config
		except Exception as e:
			log(f'Encountered an exception reading your old config: {e}')
			log('Backing up old config and creating a new one')
			old_config = open(hs_globals.HYPRSETTINGS_CONFIG_PATH, 'r', encoding='utf-8').read()
			old_config_parent = hs_globals.HYPRSETTINGS_CONFIG_PATH.parent
			with open(old_config_parent / 'hyprsettings.toml.bak', 'w', encoding='utf-8') as backup_file:
				backup_file.write(old_config)
			return create_new_config()


def read_old_config():
	log('Opening old config file', only_verbose=True)
	config_file = open(hs_globals.HYPRSETTINGS_CONFIG_PATH, encoding="utf-8")
	config: TOMLDocument
	try:
		log('Parsing old config', only_verbose=True)
		config = toml.parse(config_file.read())
		config_file.close()
	except Exception as e:
		log(f'Exception reading old config: {e}')
		raise Exception('Encountered an exception reading your old config:', e)
	global window_config
	window_config = config
	log('Adding missing keys', only_verbose=True)
	add_missing_keys()
	log('Checking onboarding version', only_verbose=True)
	if window_config.get("persistence")['onboarding_version'] != hs_globals.ONBOARDING_VERSION:
		log('Updating onboarding version and setting first_run', only_verbose=True)
		window_config['persistence']['first_run'] = True
		window_config['persistence']['onboarding_version'] = hs_globals.ONBOARDING_VERSION
	log('Checking user info', only_verbose=True)
	if str(window_config['file_info']["user"]).lower() == "hyprsettings":
		log('Updating user info', only_verbose=True)
		window_config['file_info']["user"] = get_user_string()
	log('Running version migration', only_verbose=True)
	version_migration()
	log('Checking daemon setting', only_verbose=True)
	if window_config['config']['daemon']:
		log('Setting daemon to True', only_verbose=True)
		state.daemon = True
	log('Finished reading old config', only_verbose=True)
	return window_config


def create_new_config():
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
	global window_config
	window_config = toml.parse(default_config_text)
	window_config['config'].setdefault('font', temporary_font if temporary_font else 'monospace')
	add_missing_keys()
	if window_config['persistence']['onboarding_version'] != hs_globals.ONBOARDING_VERSION:
		window_config['persistence']['fist_run'] = True
		window_config['persistence']['onboarding_version'] = hs_globals.ONBOARDING_VERSION
	if str(window_config['file_info']["user"]).lower() == "hyprsettings":
		window_config['file_info']["user"] = get_user_string()
	version_migration()
	if window_config.get("config", toml.table())['daemon']:
		state.daemon = True
	hyprsettings_config_path_parent = hs_globals.HYPRSETTINGS_CONFIG_PATH.parent
	hyprsettings_config_path_parent.mkdir(parents=True, exist_ok=True)
	with hs_globals.HYPRSETTINGS_CONFIG_PATH.open('w') as config_file:
		config_file.write(default_config_text)
	return window_config


def version_migration():
	file_info = window_config.get("file_info", toml.table())
	persistence = window_config.setdefault('persistence', toml.table())

	# Define the migration map: (key, from_table, to_table)
	migrations = [
		  ('last_tab', 'config', 'persistence'),
		  ('first_run', 'config', 'persistence'),
		  ('onboarding_version', 'file_info', 'persistence'),
	]

	def move_key(k, v, d):
		try:
			global window_config
			if k in window_config.get(v, toml.table()):
				window_config.get(d).add(k, window_config.get(v).get(k))
				window_config.get(v).remove(k)
			return True
		except Exception as e:
			log(f'{e} in hyprsettings.toml[{v}]', prefix='Config Version Migrator')
			return False

	# Check version and migrate
	current_v = Version('.'.join(hs_globals.CURRENT_VERSION.split('.')[:3]))
	if Version(file_info.get("version", "")) < current_v:
		log(f'Config version {file_info["version"]} older than {hs_globals.CURRENT_VERSION}. Migrating...')
		file_info.setdefault("version", hs_globals.CURRENT_VERSION)
		log("pakyu")
		for key, src, dest in migrations[:2]:  # Handles last_tab and first_run
			try:
				move_key(key, src, dest)
			except Exception as e:
				log(e)
		return

	if persistence.get('onboarding_version', "") != hs_globals.ONBOARDING_VERSION:
		if move_key('onboarding_version', 'file_info', 'persistence'):
			# persistence['onboarding_version'] = hs_globals.ONBOARDING_VERSION
			persistence.setdefault('onboarding_version', hs_globals.ONBOARDING_VERSION)


def add_missing_keys():
	defaults = {'daemon': False}
	persistence_keys = {'onboarding_version': 0.8}
	config_lines = window_config['config']

	for key, val in defaults.items():
		if key not in config_lines:
			config_lines[key] = val

	persistence = window_config.get('persistence', toml.table())
	for key, val in persistence_keys.items():
		if key not in persistence:
			persistence[key] = val


def save_window_config(json_fromjs, part='config'):
	log('Saving window config')
	config_from_json = json.loads(json_fromjs)
	for key in config_from_json:
		window_config[part][key] = config_from_json[key]
	hs_globals.HYPRSETTINGS_CONFIG_PATH = Path.home() / '.config' / 'hypr' / 'hyprsettings.toml'
	with open(hs_globals.HYPRSETTINGS_CONFIG_PATH, 'w', encoding='utf-8') as config_file:
		config_tosave = toml.dumps(window_config)
		config_file.write(config_tosave)
