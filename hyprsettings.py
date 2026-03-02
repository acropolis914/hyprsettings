#!/usr/bin/env python3

import argparse
import ctypes
import ctypes.util
import datetime
import os
import subprocess
from os import PathLike
from typing import Literal, List
from pathlib import Path
import shutil
import threading
import sys
import time
import re
import signal


TYPE = Literal['arch', 'debian', 'fedora', 'nixos']
LOGTYPE = Literal['INFO', 'ERROR', 'WARNING', 'DEBUG', 'CRITICAL']


class GLOBALS:
	NO_GIT_PULL: bool = False
	INSTALLATION_PATH: Literal['System', 'User'] = None
	EXISTING_INSTALLATION: Path | None = None  # if this is not None, it will be a Path object pointing to the existing installation
	PACKAGE_MANAGER_INSTALLED: Path = None
	IN_LOCAL_CLONE: bool = False
	VERBOSE: bool = False
	IS_HYPRLAND_INSTALLED: Path = None
	OS_RELEASE: str = None
	BIN_DIRECTORY: PathLike | Path = None
	LIB_DIRECTORY: PathLike | Path = None
	ICON_DIRECTORY: PathLike | Path = None
	DESKTOP_DIRECTORY: PathLike | Path = None
	IS_DEPENDENCY_INSTALLED = False
	IS_VENV_INSTALLED: bool = False
	CLONE_REPOSITORY: Path = None
	IS_SOURCEFILES_INSTALLED = False
	IS_BINARY_INSTALLED = False
	IS_DESKTOPFILE_INSTALLED = False
	IS_ICON_INSTALLED = False
	IS_DESKTOP_ICON_CACHE_DONE = False
	IS_REPO_UPDATED: bool = False
	MODE: Literal['NORMAL', 'UPDATE', 'AUTO_INSTALL'] = 'NORMAL'
	NO_GTK: bool = None
	NO_WEBVIEW: bool = None
	MISSING_DEPENDENCIES: list[str] = []


GLOBAL = GLOBALS()

ANSI = {
	'reset': '\033[0m',
	'bold': '\033[1m',
	'dim': '\033[2m',
	'underline': '\033[4m',
	'italic': '\033[3m',
	'red': '\033[31m',
	'green': '\033[32m',
	'yellow': '\033[33m',
	'blue': '\033[34m',
	'magenta': '\033[35m',
	'cyan': '\033[36m',
	'code': '\033[36m',  # commands appear in cyan
}

TAG_PATTERN = re.compile(r'\[(/?)(\w+)(?:=(.+?))?]')


def bbcode(text: str) -> str:
	"""
	Convert a small BBCode subset to ANSI terminal codes.
	Supported tags:
	  [bold], [underline], [italic]/[i], [red], [green], [yellow], [blue],
	  [magenta], [cyan], [code], [link=url]
	"""

	def repl(match):
		closing, tag, value = match.groups()
		tag = tag.lower()

		# alias
		if tag == 'i':
			tag = 'italic'

		# closing tag
		if closing:
			if tag == 'link':
				# Close OSC 8 link
				return '\033]8;;\033\\'
			return ANSI['reset']

		# opening link
		if tag == 'link' and value:
			return f'\033]8;;{value}\033\\'

		# normal tag
		return ANSI.get(tag, match.group(0))

	return TAG_PATTERN.sub(repl, text) + ANSI['reset']


def log(message: str = '', level: LOGTYPE = 'INFO', no_prefix: bool = False, onlyWhenVerbose: bool = False):
	# map log levels to BBCode-colored prefixes (with brackets included)
	LEVEL_COLORS = {
		'INFO': '[green][/green]',
		'ERROR': '[red][/red]',
		'WARNING': '[yellow]󰈿[/yellow]',
		'DEBUG': '[blue][/blue]',
		'CRITICAL': '[bold][red]󰈸[/red][/bold]',
	}
	if GLOBAL.VERBOSE or not onlyWhenVerbose:
		prefix = LEVEL_COLORS.get(level, f'[{level}]')
		text = f'{prefix} {message}' if not no_prefix else message
		print(
			bbcode(text),
		)


def run(cmd: List[str] | str, check=True, capture_output=True, text=True, shell=False, stdout=None, stderr=None, bufsize=-1):
	if isinstance(cmd, str) and not shell:
		cmd = cmd.split()

	if GLOBAL.INSTALLATION_PATH == 'System':
		if isinstance(cmd, list):
			if cmd[0] != 'sudo':
				cmd = ['sudo', *cmd]
		elif isinstance(cmd, str):  # shell=True case usually
			if not cmd.strip().startswith('sudo'):
				cmd = f'sudo {cmd}'
	marker = ConsoleMarker()
	# log(f'[dim][bold]Executing command:[/bold] {" ".join(cmd)}[/dim]')
	marker.clear()

	return subprocess.run(cmd, check=check, capture_output=capture_output, text=text, shell=shell)


class Spinner:
	def __init__(self, message='Loading...'):
		self.message = self.original_message = message
		self._stop_event = threading.Event()
		self._thread = threading.Thread(target=self._spin, daemon=True)
		self._status = 0
		self.start()

	def _spin(self):
		chars = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
		i = 0
		while not self._stop_event.is_set():
			sys.stdout.write(f'\r\033[K {bbcode(self.message)} {chars[i % len(chars)]}')
			sys.stdout.flush()
			i += 1
			time.sleep(0.02)
		sys.stdout.write('\r\033[K')
		sys.stdout.flush()

	def update(self, new_message: str):
		self.message = new_message

	def reset(self):
		self.message = self.original_message

	def temporary_message(self, message: str, delay_ms: int):
		self.update(message)
		# Use a Timer to avoid blocking the main execution
		threading.Timer(delay_ms / 1000, self.reset).start()

	def start(self):
		if not self._thread.is_alive():
			self._thread.start()
		return self

	def stop(self, status=0):
		self._status = status
		self._stop_event.set()
		if self._thread.is_alive():
			self._thread.join()


class ConsoleMarker:
	def __init__(self):
		self.active = False
		self.mark()

	def mark(self):
		# Save cursor position
		sys.stdout.write('\033[s')
		sys.stdout.flush()
		self.active = True

	def clear(self):
		if not self.active:
			return
		# Restore cursor + clear screen below
		sys.stdout.write('\033[u')  # restore cursor
		sys.stdout.write('\033[J')  # clear to end of screen
		sys.stdout.flush()
		self.active = False


def print_title():
	version = ''
	if GLOBAL.CLONE_REPOSITORY and Path(GLOBAL.CLONE_REPOSITORY / 'src' / '.version').is_file():
		with open(GLOBAL.CLONE_REPOSITORY / 'src' / '.version', 'r') as f:
			version = f.read().strip()

	version_text = f'v[green][bold]{version}[/bold][/green]' if version else ''
	art = f"""  
[bold][blue]   ╻ ╻╻ ╻┏━┓┏━┓┏━┓┏━╸╺┳╸╺┳╸╻┏┓╻┏━╸┏━┓
   ┣━┫┗┳┛┣━┛┣┳┛┗━┓┣╸  ┃  ┃ ┃┃┗┫┃╺┓┗━┓
   ╹ ╹ ╹ ╹  ╹┗╸┗━┛┗━╸ ╹  ╹ ╹╹ ╹┗━┛┗━┛[/bold][/blue]{version_text}
   Your loyal hyprland config parser
[blue][link=https://github.com/acropolis914/hyprsettings]  github.com/acropolis914/hyprsettings[/link][/blue]\n"""
	log(art, no_prefix=True)


def confirm(
	message='Do you want to continue?',
	default: bool = True,
	add_indent: int = 0,
) -> bool:
	indent = add_indent
	indent_text = '  ' * indent
	marker = ConsoleMarker()
	log(f'\n\n{indent_text}[bold]󰁀 {message}[/bold]', no_prefix=True)
	if default:
		log(f'{indent_text + "  "}[green][bold]1. Yes[/bold][/green]', no_prefix=True)
		log(f'{indent_text + "  "}2. No', no_prefix=True)
	else:
		log(f'{indent_text + "  "}1. Yes', no_prefix=True)
		log(f'{indent_text + "  "}[green][bold]2.  No[/bold][/green]', no_prefix=True)
	log(f'{indent_text + "  "}0. Exit', no_prefix=True)
	response = input('\n>> ')
	marker.clear()
	if response.strip() == '1':
		return True
	elif response.strip() == '2':
		return False
	elif response.strip() == '0':
		cleanup(False)
		# return None
	elif response.strip() == '':
		return default
	else:
		log(f'Invalid response: {response}')
		new_response: bool = confirm(message=message, default=default)
		return new_response


def choose_from(
	message: str,
	choices: List[str],
	default: str = '1',
	add_indent: int = 0,
):
	indent = add_indent
	indent_text = '  ' * indent
	marker = ConsoleMarker()

	log(f'\n\n{indent_text}[bold]󱜸 {message}[/bold]', no_prefix=True)

	for i, choice in enumerate(choices, start=1):
		if str(i) == default:
			log(f'{indent_text + "  "}[green][bold]{i}. {choice}[/bold][/green]', no_prefix=True)
		else:
			log(f'{indent_text + "  "}{i}. {choice}', no_prefix=True)

	log(f'{indent_text + "  "}0. Cancel', no_prefix=True)

	response = input('\n>> ')
	marker.clear()

	if response.strip() == '0':
		cleanup(False)

	elif response.strip() == '':
		if default.isdigit() and 1 <= int(default) <= len(choices):
			return choices[int(default) - 1]

	elif response.strip().isdigit():
		value = int(response.strip())
		if 1 <= value <= len(choices):
			return choices[value - 1]

	log(f'Invalid response: {response}')
	return choose_from(
		message=message,
		choices=choices,
		default=default,
		add_indent=add_indent,
	)


def check_hyprland_installation():
	marker = ConsoleMarker()
	spinner = Spinner('Checking hyprland installation')
	try:
		hyprland_path = shutil.which('hyprland')
		spinner.stop()
		marker.clear()
		# log('[bold]Hyprland:[/bold] installed')
		GLOBAL.IS_HYPRLAND_INSTALLED = Path(hyprland_path)
		return 0
	except Exception:
		spinner.stop(1)
		marker.clear()
		# log(f'Hyprland installation not found. Consider installing hyprland(lol). Error: {e}', 'WARNING')
		return 1


def check_os_release(emulate: str = None):
	release = (
		run(
			['grep', '^ID=', '/etc/os-release'],
		)
		.stdout.strip()
		.split('=')[1]
		.strip()
	)
	if emulate is not None:
		release = emulate
	release = detect_family(release, '')
	if release not in ['arch', 'fedora', 'nix', 'nixos', 'void']:
		GLOBAL.OS_RELEASE = f'{release} (unsupported)'
	else:
		GLOBAL.OS_RELEASE = release


def ask_os_release():
	release = GLOBAL.OS_RELEASE
	if 'unsupported' in release:
		choice = choose_from(
			'Unsupported Distro detected. Is it based on one of the following distros?:',
			['Arch', 'Fedora', 'NixOs', "Void", "None of the above"],
			default='99',
		)
		if choice == 'Debian/Ubuntu/APT':
			release = 'debian'
		elif choice == 'Fedora':
			release = 'fedora'
		elif choice == 'Arch':
			release = 'arch'
		elif choice == 'NixOs':
			release = 'nixos'
		elif choice == 'Void':
			release = 'void'
		else:
			show_unsupported_linux_prompt()
	else:
		return


def detect_family(distro_id: str, id_like: str) -> str:
	distro_id = (distro_id or '').lower()
	id_like_list = (id_like or '').lower().split() if id_like else []

	families = {
		'arch': [
			'arch',
			'artix',
			'endeavouros',
			'manjaro',
			'garuda',
			'arcolinux',
			'cachyos',
			'rebornos',
			'archcraft',
			'blackarch',
			'archbang',
			'chakra',
		],
		'debian': [
			'debian',
			'ubuntu',
			'linuxmint',
			'pop',
			'kali',
			'raspbian',
			'parrot',
			'elementary',
			'zorin',
			'deepin',
			'neon',
			'mx',
			'peppermint',
			'bunsenlabs',
		],
		'fedora': [
			'fedora',
			'nobara',
			'ultramarine',
			'korora',
			'rocky-fedora-spinoff',
			'silverblue',
			'cinammon-fedora',
			'redhat-fedora-workstation',
		],
		'rhel': ['rhel', 'centos', 'rocky', 'almalinux', 'ol', 'oraclelinux', 'scientific', 'amazon', 'cloudlinux', 'virtuozzo'],
		'suse': ['suse', 'opensuse', 'sled', 'sles', 'tumbleweed', 'leap', 'microos', 'gecko'],
		'gentoo': ['gentoo', 'funtoo', 'calculate', 'redcore', 'pentoo'],
		'slackware': ['slackware', 'salix', 'zenwalk', 'slax'],
		'alpine': ['alpine', 'postmarketos'],
		'void': ['void'],
		'nixos': ['nixos'],
		'solus': ['solus'],
	}

	def match(name: str):
		for family, distros in families.items():
			if name in distros:
				return family
		return None

	family = match(distro_id)
	if family:
		return family
	for entry in id_like_list:
		family = match(entry)
		if family:
			return family

	return 'unsupported'


def install_via_aur():
	def install():
		clear_view('Installing hyprsettings via AUR')
		aur_helpers = ['yay', 'paru', 'trizen', 'pikaur']
		aur_helper = next((h for h in aur_helpers if shutil.which(h)), None)
		if aur_helper is None:
			log(
				'No aur helper found. Please install yay, paru, or any other aur helper.',
				'CRITICAL',
			)
			cleanup(True)
		spinner = Spinner('Installing hyprsettings via AUR')
		try:
			run(
				[
					aur_helper,
					'-Sy',
					'--noconfirm',
					'--needed',
					'-q',
					'hyprsettings-git',
				],
				capture_output=True,
			)
			spinner.stop()
		except Exception as e:
			spinner.stop(1)
			reset_view()
			log(
				f'Failed to install hyprsettings via {aur_helper}. Error: {e}',
				'CRITICAL',
			)
			cleanup(True)

	# log(
	# 	'Arch/Arch-based distro detected. It is available on the aur',
	# 	'WARNING',
	# )
	confirm_aur = confirm(
		'------ Arch/Arch-based distro detected. -----\n'
		'  It is [blue]recommended[/blue] to install Hyprsettings via AUR. Continue?\n'
		'  [dim]Cancelling this will proceed with the manual installation via script[/dim]'
	)
	if confirm_aur:
		install()
		return 0
	else:
		return 1


def run_nixos_wizard(log_message: bool = True):
	"""
	Interactive wizard to install or update HyprSettings on NixOS using choose_from().
	Uses `log(message, level)` for output (supports basic BBCode).
	"""

	nix_message = """[bold][underline]Detected NixOS[/underline][/bold]
  I know, many of you want control over your installation.
  Please read and choose your preferred method.
  [yellow]HyprSettings requires your hyprland configs
  to be in .conf files like on other Linux systems.[/yellow]

[bold][green]󰜗[/green] Flakes (recommended)[/bold]
  Try without installing:
    [cyan]nix run github:acropolis914/hyprsettings[/cyan]
  Install by adding to your profile:
    [cyan]nix profile add github:acropolis914/hyprsettings[/cyan]

[bold][yellow]󱌣[/yellow] Traditional Nix[/bold]
  Build package:
    [cyan]nix-build[/cyan]
  Install to profile:
    [cyan]nix-env -f default.nix -i[/cyan]

[bold][blue][/blue] Home Manager[/bold]
  Add to config (traditional):
    [cyan]home.packages = [ (pkgs.callPackage /path/to/hyprsettings-nixos/default.nix {}) ][/cyan]
  Add to config (flakes):
    [cyan]home.packages = [ inputs.hyprsettings.packages.${system}.default ][/cyan]

[bold][magenta][/magenta] Web version[/bold]
  Read the guide here:
    [link=https://github.com/acropolis914/hyprsettings/blob/master/NIX_INSTALLATION.md][cyan]HyprSettings Nix Installation Guide[/cyan][/link]
"""
	if log_message:
		log(nix_message)
	repo_url = 'https://github.com/acropolis914/hyprsettings'
	cache_dir = GLOBAL.CLONE_REPOSITORY
	method = None

	# 1. Detection Logic
	try:
		# Check Flakes Profile
		profile_list = subprocess.getoutput('nix profile list')
		if 'hyprsettings' in profile_list:
			method = 'flakes'
		# Check Traditional nix-env
		elif 'hyprsettings' in subprocess.getoutput('nix-env -q').lower():
			method = 'traditional'
		# Check if Home Manager is installed/active
		elif subprocess.run(['command', '-v', 'home-manager'], capture_output=True).returncode == 0:
			method = 'home-manager'
	except Exception:
		pass

	if method == 'flakes' or method == 'traditional':
		message = f'[bold]Existing {method} installation detected[/bold]'
		choices = [f'Update ({method})', f'Remove ({method})', 'Back']
	elif method == 'home-manager':
		message = '[bold]Home Manager detected[/bold]'
		choices = ['Update (home-manager switch)', 'Show Install Snippet', 'Back']
	else:
		message = '[bold]Select installation method[/bold]'
		choices = ['Flakes: Install', 'Traditional: Install', 'Home Manager: Instructions']

	choice = choose_from(message, choices, default='1')
	if 'Back' in choice:
		run_nixos_wizard(False)

	try:
		# --- UPDATE PATHS ---
		if 'Update' in choice:
			if method == 'flakes':
				subprocess.run(['nix', 'profile', 'upgrade', 'hyprsettings'], check=True)
			elif method == 'traditional':
				if (cache_dir / '.git').exists():
					subprocess.run(['git', '-C', str(cache_dir), 'pull'], check=True)
				subprocess.run(['nix-env', '-f', str(cache_dir / 'default.nix'), '-i'], check=True)
			elif method == 'home-manager':
				subprocess.run(['home-manager', 'switch'], check=True)
			cleanup(False, f'Successfully updated HyprSettings via {method}')

		# --- REMOVE PATHS ---
		elif 'Remove' in choice:
			cmd = ['nix', 'profile', 'remove', 'hyprsettings'] if method == 'flakes' else ['nix-env', '-e', 'hyprsettings']
			subprocess.run(cmd, check=True)
			cleanup(False, 'HyprSettings removed successfully.')

		# --- INSTALL PATHS ---
		elif 'Flakes: Install' in choice:
			subprocess.run(['nix', 'profile', 'add', f'git+{repo_url}'], check=True)
			cleanup(False, 'Installed via Nix Flakes.')

		elif 'Traditional: Install' in choice:
			cache_dir.mkdir(parents=True, exist_ok=True)
			if not (cache_dir / '.git').exists():
				subprocess.run(['git', 'clone', repo_url, str(cache_dir)], check=True)
			subprocess.run(['nix-env', '-f', str(cache_dir / 'default.nix'), '-i'], check=True)
			cleanup(False, 'Installed via nix-env.')

		elif 'Home Manager' in choice or 'Snippet' in choice:
			log(f'[bold][cyan]Add to home.packages:[/cyan][/bold]\n  (pkgs.callPackage (fetchTarball "{repo_url}/archive/master.tar.gz") {{}})')
			cleanup(False, 'Snippet displayed.')

	except subprocess.CalledProcessError as e:
		cleanup(True, f'Nix command failed: {e.stderr if e.stderr else e}')
	except Exception as e:
		cleanup(True, f'An unexpected error occurred: {str(e)}')


def install_dependencies():
	if check_gtk_dependencies():
		return 0
	distro_map = {
		'arch': ('Arch', ['sudo', 'pacman', '-Sy', '--noconfirm', '--needed', 'python-gobject', 'webkit2gtk']),
		'fedora': ('Fedora', ['sudo', 'dnf', 'install', '-y', 'python3-gobject', 'webkit2gtk4.1', 'gtk3']),
		'void': ('Void', ['sudo', 'xbps-install', '-Sy', 'gobject-introspection', 'libwebkit2gtk41']),
	}

	config = next((val for key, val in distro_map.items() if key == GLOBAL.OS_RELEASE), None)

	if not config:
		return 0  # NixOS or unsupported cases

	display_name, cmd = config
	clear_view(f'Installing {display_name} dependencies')

	try:
		# We check if cmd is a list; if so, shell=False (safer).
		run(cmd, capture_output=False, check=True, shell=isinstance(cmd, str))

		log('[bold]Dependency Install:[/bold] Success')
		GLOBAL.IS_DEPENDENCY_INSTALLED = True
		reset_view()
		return 0

	except subprocess.CalledProcessError as e:
		log(f'Failed to install {display_name} dependencies: {e}', 'CRITICAL')
		cleanup(True)
		return 1


def check_gtk_dependencies() -> bool:
	required_libs = [
		'gtk-4',
		'webkit2gtk-4.1',
		'gobject-2.0',
	]

	required_typelibs = [
		'Gtk-4.0',
		'WebKit2-4.1',
		'GObject-2.0',
	]

	missing_dependencies = []
	for lib in required_libs:
		found = ctypes.util.find_library(lib)

		if found is None:
			missing_dependencies.append(f'library:{lib}')
	gi_directories = []

	search_patterns = [
		'/usr/lib*/girepository-1.0',
		'/usr/local/lib*/girepository-1.0',
	]

	for pattern in search_patterns:
		for path in Path('/').glob(pattern.lstrip('/')):
			if path.is_dir():
				gi_directories.append(path)
	for typelib in required_typelibs:
		found = False

		for directory in gi_directories:
			typelib_path = directory / f'{typelib}.typelib'

			if typelib_path.exists():
				found = True
				break

		if not found:
			missing_dependencies.append(f'typelib:{typelib}')
	if missing_dependencies:
		GLOBAL.IS_DEPENDENCY_INSTALLED = False
		GLOBAL.MISSING_DEPENDENCIES = missing_dependencies
		return False

	GLOBAL.IS_DEPENDENCY_INSTALLED = True
	GLOBAL.NO_GTK = False
	GLOBAL.NO_WEBVIEW = False
	GLOBAL.MISSING_DEPENDENCIES = []
	return True


def show_unsupported_linux_prompt(print_guide=True):
	print_unsupported_os_guide()
	choices = [
		'I have installed the GTK dependencies',
		'[red]Continue without GTK Dependencies[/red] \n [dim] Running hyprsettings will automatically open a browser window for you.[/dim][/red]',
	]
	decision = choose_from(
		'----- [cyan]Have you installed the GTK Dependencies?[/cyan] -----\n[dim] They are needed to launch the dedicated hyprsettings window',
		choices,
		default='99',
	)
	if decision == choices[0]:
		GLOBAL.NO_GTK = False
		GLOBAL.NO_WEBVIEW = False
		GLOBAL.IS_DEPENDENCY_INSTALLED = True
		reset_view()
	elif decision == choices[1]:
		GLOBAL.NO_GTK = True
		GLOBAL.NO_WEBVIEW = True


def print_unsupported_os_guide():
	clear_view('[red]Unsupported distro detected. Manual dependency installation is required.[/red]')

	nl = '\n • '
	missing_msg = (
		f'\n\n[red][bold]Detected missing dependencies:[/bold][/red]{nl}{nl.join(GLOBAL.MISSING_DEPENDENCIES)}'
		if GLOBAL.MISSING_DEPENDENCIES
		else ''
	)

	log(
		'[yellow]Hyprsettings requires system-level GTK3 and WebKit libraries.[/yellow]\n\n'
		'To run this app, you must install the [bold]GObject Introspection[/bold] and '
		"[bold]WebKit2GTK[/bold] packages from your distro's repository.\n\n"
		'[bold][blue]Standard Package Names:[/blue][/bold]\n'
		'[dim]'
		'  - Python Bridge:         python3-gobject / python3-gi / pygobject3 /  gobject-introspection  \n'
		'  - WebKit Engine:         libwebkit2gtk-4.1 / libwebkit2gtk41\n'
		'  - GUI Toolkit:           gtk3(named gtk4 in some distros for some reason idk tbh)\n'
		'[/dim]\n\n'
		'[bold]Example Commands:[/bold]\n'
		'  Debian / Ubuntu / Mint:\n'
		'  [dim]sudo apt install python3-gi gir1.2-gtk-3.0 gir1.2-webkit2-4.1[/dim]\n\n'
		'  Fedora / RHEL:\n'
		'  [dim]sudo dnf install python3-gobject webkit2gtk4.1[/dim]\n\n'
		'  Arch Linux:\n'
		'  [dim]sudo pacman -S python-gobject webkit2gtk-4.1[/dim]\n\n'
		'You can continue with the gui-enabled installation after these are installed.'
		f'{missing_msg}\n'
	)


def clone_repository():
	if GLOBAL.IN_LOCAL_CLONE:
		to_update = False
		if GLOBAL.NO_GIT_PULL:
			to_update = False
		elif GLOBAL.MODE == 'UPDATE':
			to_update = True
		else:
			to_update = confirm('Do you want to pull updates from github to your local repository?')

		if to_update:
			spinner = Spinner('Updating local repository...')
			try:
				subprocess.run(['git', 'pull'], check=True)
				spinner.stop()
				GLOBAL.IS_REPO_UPDATED = True
				reset_view()
			except subprocess.CalledProcessError as e:
				log(f'Failed to update repository. Error: {e}', 'WARNING')
				spinner.stop(1)
		return

	# Else: cloning to cached repository
	destination = GLOBAL.CLONE_REPOSITORY.resolve()
	destination.mkdir(parents=True, exist_ok=True)

	if (destination / '.git').exists():
		if GLOBAL.NO_GIT_PULL:
			return
		to_update = GLOBAL.MODE == 'UPDATE' or confirm('Do you want to pull updates from github to the cached hyprsettings repository?')
		if to_update:
			marker = ConsoleMarker()
			try:
				subprocess.run(['git', '-C', str(destination), 'pull'], check=True)
				GLOBAL.IS_REPO_UPDATED = True
				marker.clear()
			except subprocess.CalledProcessError as e:
				log(f'Failed to update repository. Error: {e}', 'WARNING')
				marker.clear()
	else:
		marker = ConsoleMarker()
		log(f'Cloning hyprsettings repository to {destination}')
		try:
			subprocess.run(
				[
					'git',
					'clone',
					'https://github.com/acropolis914/hyprsettings',
					str(destination),
				],
				check=True,
			)
			# chown_recursive(destination)
			GLOBAL.IS_REPO_UPDATED = True
			marker.clear()
		except subprocess.CalledProcessError as e:
			log(f'Failed to clone repository. Error: {e}', 'WARNING')
			marker.clear()


def check_local_repo():
	destination = Path.home() / '.cache' / 'hyprsettings' / 'git-clone'
	if Path('.git').exists() and Path('src').exists() and Path('src/hyprsettings').is_file():
		GLOBAL.IN_LOCAL_CLONE = True
		GLOBAL.CLONE_REPOSITORY = Path(__file__).parent
	else:
		destination.mkdir(parents=True, exist_ok=True)
		GLOBAL.CLONE_REPOSITORY = destination
		GLOBAL.IN_LOCAL_CLONE = False

	with open(Path('~/.cache/hyprsettings/repo_dir').expanduser(), encoding='utf-8', mode='w') as f:
		f.write(str(GLOBAL.CLONE_REPOSITORY))


def check_existing_installation():
	package_manager_paths = [
		'/usr/bin/hyprsettings',
		'/usr/bin/hyprsettings-git',
	]
	package_manager_installed: bool = False
	package_manager_install_path = None
	for package_manager_path in package_manager_paths:
		if Path(package_manager_path).exists():
			package_manager_installed = True
			package_manager_install_path = package_manager_path

	if package_manager_installed:
		GLOBAL.PACKAGE_MANAGER_INSTALLED = Path(package_manager_install_path)

	paths = [Path('/usr/local/bin/hyprsettings'), Path('~/.local/bin/hyprsettings').expanduser()]
	for path in paths:
		if path.exists():
			GLOBAL.EXISTING_INSTALLATION = path
			if str(path) == '/usr/local/bin/hyprsettings':
				set_install_dirs('System')
			elif str(path) == str(Path('~/.local/bin/hyprsettings').expanduser()):
				set_install_dirs('User')
			if Path(path / '.no_webview').exists():
				GLOBAL.NO_WEBVIEW = True


def select_installation_directory():
	marker = ConsoleMarker()
	install_base_dir = choose_from('Where to install?', choices=['System', 'User'])
	marker.clear()
	set_install_dirs(install_base_dir)
	return install_base_dir


def set_install_dirs(install_type):
	GLOBAL.INSTALLATION_PATH = install_type
	if install_type == 'System':
		GLOBAL.BIN_DIRECTORY = Path('/usr/local/bin/')
		GLOBAL.DESKTOP_DIRECTORY = Path('/usr/share/applications/')
		GLOBAL.LIB_DIRECTORY = Path('/usr/local/share/hyprsettings/')
		GLOBAL.ICON_DIRECTORY = Path('/usr/share/icons/hicolor/48x48/apps/')
		reset_view()
		try:
			sudo_marker = ConsoleMarker()
			log('\n\nInstallation is set to system. We need to use sudo for that.', 'WARNING')
			run(['sudo', '-v', '-p', 'Root password:'], check=True)
			sudo_marker.clear()
			run(['mkdir', '-p', str(GLOBAL.LIB_DIRECTORY)], check=True)
		except subprocess.CalledProcessError as e:
			log(f'Error getting root access. {e.stderr}')
			cleanup(True)
	elif install_type == 'User':
		GLOBAL.BIN_DIRECTORY = Path('~/.local/bin').expanduser()
		GLOBAL.DESKTOP_DIRECTORY = Path('~/.local/share/applications/').expanduser()
		GLOBAL.LIB_DIRECTORY = Path('~/.local/share/hyprsettings/').expanduser()
		GLOBAL.LIB_DIRECTORY.mkdir(parents=True, exist_ok=True)
		GLOBAL.ICON_DIRECTORY = Path('~/.local/share/icons/hicolor/48x48/apps/').expanduser()
	else:
		log('Developer is stupid', 'CRITICAL')
	reset_view()


def setup_venv():
	marker = ConsoleMarker()
	# clear_view("Setting up virtual environment")
	spinner = Spinner('Setting up virtual environment')
	try:
		venv_directory = Path(GLOBAL.LIB_DIRECTORY / '.venv')
		packages = [
			'tomlkit',
			'rich',
			'packaging',
			'flask',
			'flask-cors',
			'python-dotenv',
		]

		# log(f'{GLOBAL.NO_GTK, GLOBAL.NO_WEBVIEW}')
		if GLOBAL.NO_GTK is None and GLOBAL.NO_WEBVIEW is not None:
			GLOBAL.NO_GTK = True
			# log(GLOBAL.NO_GTK)
		# log(f'{GLOBAL.NO_GTK, GLOBAL.NO_WEBVIEW}')

		if not GLOBAL.NO_GTK:
			spinner.temporary_message('Dedicated interface dependencies were installed. Adding pywebview to the environment', 1000)
			packages.append('pywebview')
			# packages.append('pywebview[gtk]')
			time.sleep(1)

		pip_base = [
			str(venv_directory / 'bin/pip'),
			'install',
			'--upgrade-strategy',
			'only-if-needed',
		]

		if not venv_directory.exists():
			spinner.update('Fresh directory. Creating virtual environment...')
			run(['mkdir', '-p', str(venv_directory)])
			run(['python', '-m', 'venv', '--system-site-packages', str(venv_directory)])
			venv_python = str(venv_directory / 'bin/python')
			spinner.update('Bootstrapping pip...')
			run([venv_python, '-m', 'ensurepip', '--upgrade', '--default-pip'], capture_output=True)

		# always install deps
		spinner.update('Installing python environment dependencies...')
		run([*pip_base, 'setuptools', 'wheel'], capture_output=True)
		spinner.update('Installing python environment requirements...')
		process = run([*pip_base, *packages], capture_output=True)
		spinner.update('Successfully installed initialized python environment.')
		GLOBAL.IS_VENV_INSTALLED = True
		spinner.stop()
		marker.clear()
		reset_view()
	except subprocess.CalledProcessError as e:
		spinner.stop(1)
		marker.clear()
		cleanup(True, f'Error installing virtual environment: {e.stderr}')


def setup_source():
	spinner = Spinner(f'Copying resource files to {GLOBAL.LIB_DIRECTORY}')
	try:
		# Use cp for recursion copy to handle sudo if needed
		run(['cp', '-r', str(GLOBAL.CLONE_REPOSITORY / 'src'), str(GLOBAL.LIB_DIRECTORY)])
		run(['cp', str(GLOBAL.CLONE_REPOSITORY / 'run.sh'), str(GLOBAL.LIB_DIRECTORY / 'run.sh')])
		# print(str(GLOBAL.CLONE_REPOSITORY / 'hyprsettings_installer.py'), Path(str(GLOBAL.CLONE_REPOSITORY / 'hyprsettings_installer.py')).exists())
		run(['cp', '-f', str(GLOBAL.CLONE_REPOSITORY / 'hyprsettings.py'), str(GLOBAL.LIB_DIRECTORY / 'hyprsettings_installer.py')])
		run(['rm', '-rf', str(GLOBAL.LIB_DIRECTORY / 'src' / 'ui-src')])
		marker_file = '/tmp/.scriptv2_installed'
		with open(marker_file, 'w+') as f:
			f.write(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
		run(['mv', marker_file, str(GLOBAL.LIB_DIRECTORY)])
		if GLOBAL.NO_GTK:
			nogtk_marker_file = '/tmp/.no_webview'
			with open(nogtk_marker_file, 'w+') as f:
				f.write(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
			run(['mv', nogtk_marker_file, str(GLOBAL.LIB_DIRECTORY)])

		spinner.stop()

		icon_spinner = Spinner(f'Copying icons to {GLOBAL.LIB_DIRECTORY}')
		run(['mkdir', '-p', str(GLOBAL.ICON_DIRECTORY)])

		icon_destination = GLOBAL.ICON_DIRECTORY / 'hyprsettings.png'
		run(['cp', str(GLOBAL.CLONE_REPOSITORY / 'assets' / 'icon-48.png'), str(icon_destination)])
		run(['chmod', '644', str(icon_destination)])

		try:
			run(['gtk-update-icon-cache', '-f', str(GLOBAL.ICON_DIRECTORY.parent.parent)])
		except subprocess.CalledProcessError:
			spinner.stop(1)
		icon_spinner.stop()

		GLOBAL.IS_SOURCEFILES_INSTALLED = True
		reset_view()
	except Exception as e:
		spinner.stop(1)
		log(f'Error copying resource files: {e}', level='CRITICAL')
		cleanup(True)


def make_executable_file():
	try:
		bin_path = GLOBAL.BIN_DIRECTORY / 'hyprsettings'
		# We can't use 'open()' with sudo to write to a file easily in python without spawning a shell.
		# If user picked System, we need sudo.
		contents = f"""#!/usr/bin/env bash
cd "{str(GLOBAL.LIB_DIRECTORY)}" && ./run.sh "$@"
"""
		# Write successfully to a temporary file then move it
		temp_path = Path('/tmp/hyprsettings_bin_temp')
		with open(temp_path, 'w') as f:
			f.write(contents)

		run(['mv', str(temp_path), str(bin_path)])
		run(['chmod', '755', str(bin_path)])

		GLOBAL.IS_BINARY_INSTALLED = True
		reset_view()
	except Exception as e:
		log(f'Error making executable file: {e}', level='CRITICAL')
		cleanup(True)


def make_desktop_file():
	try:
		desktop_file_path = GLOBAL.DESKTOP_DIRECTORY / 'hyprsettings_script.desktop'
		contents = f"""[Desktop Entry]
Name=HyprSettings 
Comment=Your loyal hyprland config editor.
Exec={GLOBAL.BIN_DIRECTORY / 'hyprsettings'}
Icon=hyprsettings
Terminal=false
Type=Application
Categories=Utility;
StartupNotify=true
"""
		# Write to temp file then move
		temp_path = Path('/tmp/hyprsettings_desktop_temp')
		with open(temp_path, 'w', encoding='utf-8') as f:
			f.write(contents)

		run(['mv', str(temp_path), str(desktop_file_path)])

		desktop_database_spinner = Spinner('Updating desktop database')
		try:
			run(['update-desktop-database', str(GLOBAL.DESKTOP_DIRECTORY)])
		except subprocess.CalledProcessError as e:
			log(f'Error updating desktop database: {e}', level='CRITICAL')
			desktop_database_spinner.stop(1)
		desktop_database_spinner.stop()
		GLOBAL.IS_DESKTOPFILE_INSTALLED = True
		reset_view()
	except Exception as e:
		log(f'Error making desktop file: {e}', level='CRITICAL')
		cleanup(True)


def setup_default_config():
	hyprsettings_config_path = Path('~/.config/hypr/hyprsettings.toml').expanduser()
	if not hyprsettings_config_path.exists():
		hyprsettings_config_path.parent.mkdir(parents=True, exist_ok=True)
		run(['cp', str(GLOBAL.CLONE_REPOSITORY / 'src' / 'default_config.toml'), str(hyprsettings_config_path)])


def uninstall(no_confirm=False):
	delete_venv: bool = True
	check_os_release()
	check_local_repo()
	check_existing_installation()
	check_hyprland_installation()
	reset_view()
	if not GLOBAL.EXISTING_INSTALLATION:
		log('No existing installation found.')
		cleanup('Nothing to uninstall.')
		return
	if not no_confirm:
		if not confirm('Are you sure you want to uninstall hyprsettings? :<'):
			cleanup(False, 'Great choice.')
	if not confirm('Delete virtual environment? Keeping it will make reinstallation faster.', default=False):
		delete_venv = False
	lib_path = Path(GLOBAL.LIB_DIRECTORY)
	if lib_path.is_dir():
		if not delete_venv:
			log(f'Deleting {lib_path} contents not including the virtual environment', 'WARNING')
		else:
			log(f'Deleting {lib_path}')
		try:
			for file in lib_path.iterdir():
				if not delete_venv and file.name == '.venv':
					continue
				run(['rm', '-rf', str(file)], check=True)
		except Exception as e:
			log(f'Failed to remove {lib_path}: {e}', 'ERROR')
	else:
		log(f'{lib_path} not found.', 'WARNING')

	# remove executable
	bin_path = Path(GLOBAL.BIN_DIRECTORY) / 'hyprsettings'
	if bin_path.is_file():
		log(f'Deleting {bin_path}')
		try:
			run(['rm', '-rf', str(bin_path)], check=True)
		except Exception as e:
			log(f'Failed to remove {bin_path}: {e}', 'ERROR')
	else:
		log(f'{bin_path} not found.', 'WARNING')

	# remove desktop entry
	desktop_path = Path(GLOBAL.DESKTOP_DIRECTORY) / 'hyprsettings_script.desktop'
	if desktop_path.is_file():
		log(f'Deleting {desktop_path}')
		try:
			run(['rm', '-rf', str(desktop_path)], check=True)
		except Exception as e:
			log(f'Failed to remove {desktop_path}: {e}', 'ERROR')
	else:
		log(f'{desktop_path} not found.', 'WARNING')

	log(
		"""
     [green][bold]Uninstall Complete[/bold][/green]

     [dim]You can always come back and try it again by running:[/dim]
     [bold]curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.py | python3 - -a[/bold]
     
     Thank you for trying 💧hyprsettings!
     [underline][blue][link=https://github.com/acropolis914/hyprsettings]Made with ❣️ by AcroPolis914 — Project page[/link][/blue][/underline]
     """,
		no_prefix=True,
	)
	sys.exit(0)
	# cleanup(False, 'Done uninstalling. Sad to see you go.')


def nuke_legacy_installations():
	home = Path.home()
	apps = ['hyprsettings', 'hyprsettings-test']

	found_legacy = False
	targets = []

	for app in apps:
		# 1. Hunt for legacy USER installation
		legacy_user_dir = home / f'.local/share/{app}'
		if (legacy_user_dir / '.script-installed').exists():
			targets.extend(
				[
					legacy_user_dir,
					home / f'.local/bin/{app}',
					home / f'.local/share/applications/{app}.desktop',
					home / f'.local/share/icons/hicolor/48x48/apps/{app}.png',
				]
			)

		# 2. Hunt for legacy SYSTEM installation
		# Note: The old bash script used /usr/share for the dir, but /usr/local/bin for the executable
		legacy_system_dir = Path(f'/usr/share/{app}')
		if (legacy_system_dir / '.script-installed').exists():
			targets.extend(
				[
					legacy_system_dir,
					Path(f'/usr/local/bin/{app}'),
					Path(f'/usr/share/applications/{app}.desktop'),
					Path(f'/usr/share/icons/hicolor/48x48/apps/{app}.png'),
				]
			)

	# 3. Protect AUR system desktop/icon files (just in case they overlap)
	if GLOBAL.PACKAGE_MANAGER_INSTALLED:
		try:
			targets.remove(Path('/usr/share/applications/hyprsettings.desktop'))
			targets.remove(Path('/usr/share/icons/hicolor/48x48/apps/hyprsettings.png'))
		except ValueError:
			pass

	# 4. Execute the purge ONLY on the confirmed legacy targets
	nuke_spinner = Spinner('Nuking old hyprsettings installer installations...')
	for path in targets:
		if path.exists():
			found_legacy = True
			cmd = ['rm', '-rf', str(path)]
			if str(path).startswith('/usr'):
				cmd.insert(0, 'sudo')

			try:
				run(cmd, capture_output=True, check=True)
				nuke_spinner.stop()
			except subprocess.CalledProcessError as e:
				log(f'Failed to remove [yellow]{path}[/yellow]: {e.stderr}', level='ERROR')
	nuke_spinner.stop()

	if found_legacy:
		spinner = Spinner('Refreshing desktop caches...')
		try:
			run(['sudo', 'update-desktop-database', '-q', '/usr/share/applications'], capture_output=True, check=False)
			run(['sudo', 'gtk-update-icon-cache', '-q', '-t', '-f', '/usr/share/icons/hicolor'], capture_output=True, check=False)
			run(['update-desktop-database', '-q', str(home / '.local/share/applications')], capture_output=True, check=False)
			run(['gtk-update-icon-cache', '-q', '-t', '-f', str(home / '.local/share/icons/hicolor')], capture_output=True, check=False)
			GLOBAL.EXISTING_INSTALLATION = None
			spinner.stop()
		except Exception:
			spinner.stop(1)
	else:
		pass
		# log('No legacy bash installations found. You are clean.', level='INFO')


def cleanup(error=False, message='Exited hyprsettings installation wizard'):
	is_signal = False
	if isinstance(error, int):
		# message = ''
		is_signal = True

	if message:
		log(message, level='CRITICAL' if error else 'INFO')

	# if not is_signal:
	# 	input('Press any key to exit...')
	sys.exit(1 if error else 0)


def install_success(ask_launch: bool = False, from_update: bool = False):
	log(
		f"""
     [green][bold]{'Hyprsettings Installed!' if not from_update else 'Hyprsettings Updated!'}[/bold][/green]

     Run '[blue][bold]hyprsettings[bold][/blue]' on the cli or check your launcher.
     [dim]You can specify custom config path via '-c <path>'[/dim]
     [dim]See '[blue]hyprsettings --help[/blue]' [dim]for more settings.[/dim]
     [dim]You can update by running 'hyprsettings -up'[/dim]
     [dim]And uninstall by running 'hyprsettings -rrr'[/dim]

     Please consider starring this project on GitHub:
     ⭐ [link=https://github.com/acropolis914/hyprsettings]hyprsettings[/link]

     Thank you for trying 💧hyprsettings!
     [link=https://github.com/acropolis914/hyprsettings]Made with ❣️ by AcroPolis914 — [blue][underline]Project page[/blue][/underline][/link]
     """,
		no_prefix=True,
	)
	if ask_launch:
		if confirm('Do you want to launch hyprsettings now?', default=True):
			subprocess.Popen([f'{GLOBAL.BIN_DIRECTORY / "hyprsettings"}'])


def clear_view(message):
	os.system('clear')
	if message:
		log(f'[bold][blue]{message}[/blue][/bold]', level='INFO', no_prefix=True)


def reset_view():
	os.system('clear')
	log('Running automated installation scripts is generally [bold]unsafe[/bold]', 'WARNING')
	log('[dim]Make it a habit of you to check the link for the script \nand look for questionable actions it does.[/dim]', 'WARNING')
	# print(Path(__file__))
	print_title()
	repo_updated_message = ' [green](up to date)[green]' if GLOBAL.IS_REPO_UPDATED else ''
	if GLOBAL.OS_RELEASE:
		distro = GLOBAL.OS_RELEASE
		unsupported = 'unsupported' in distro.lower()

		if unsupported:
			display_distro = f'{distro}'
		else:
			display_distro = f'{distro}-like'

		log(f'[bold]Linux Distro:[/bold]\n  [dim]{display_distro}[/dim]')
		if unsupported:
			log(
				'[bold][yellow] Notice for installation on unsupported(yet) distros:[/bold][/yellow]\n'
				'  [dim] If you managed to install Hyprsettings successfully,\n   please open a '
				'GitHub discussion describing your distro,\n   the packages you installed, and '
				'any extra steps required\n   so others can reproduce it and for the packages to be\n   added to this script. Thank you![/dim]',
				no_prefix=True,
			)

	log(f'[bold]Clone Directory:[/bold]\n  [dim]{GLOBAL.CLONE_REPOSITORY}[/dim]{repo_updated_message}')

	if GLOBAL.EXISTING_INSTALLATION:
		log(f'[bold]Existing Installation by Script[/bold]\n  [dim]{GLOBAL.INSTALLATION_PATH} [blue]{GLOBAL.EXISTING_INSTALLATION}[/blue][/dim]')

	if not GLOBAL.EXISTING_INSTALLATION and GLOBAL.INSTALLATION_PATH:
		log(f'[bold]New installation to[/bold]\n  [dim]{GLOBAL.INSTALLATION_PATH}[/dim]')

		# if GLOBAL.IS_HYPRLAND_INSTALLED:
	log(
		f'[bold]Hyprland Installed:[/bold]\n  [dim]{GLOBAL.IS_HYPRLAND_INSTALLED if GLOBAL.IS_HYPRLAND_INSTALLED else "[yellow]Hyprland is not installed. You should shouldn't you?[/orange]"}[/dim]'
	)

	if GLOBAL.IS_DEPENDENCY_INSTALLED:
		log(f'[bold]Dependencies Installed:[/bold]\n  [dim]{GLOBAL.IS_DEPENDENCY_INSTALLED}[/dim]')

	if GLOBAL.IS_VENV_INSTALLED:
		log(f'[bold]Virtual Environment Installed:[/bold]\n  [dim]{GLOBAL.IS_VENV_INSTALLED}[/dim]')

	if GLOBAL.IS_SOURCEFILES_INSTALLED:
		log(f'[bold]Resources Copied:[/bold]\n  [dim]{GLOBAL.IS_SOURCEFILES_INSTALLED}[/dim]')

	if GLOBAL.IS_BINARY_INSTALLED:
		log(f'[bold]Binary Installed:[/bold]\n  [dim]{GLOBAL.IS_BINARY_INSTALLED}[/dim]')

	if GLOBAL.IS_DESKTOPFILE_INSTALLED:
		log(f'[bold]Desktop File Created:[/bold]\n  [dim]{GLOBAL.IS_DESKTOPFILE_INSTALLED}[/dim]')

	if GLOBAL.PACKAGE_MANAGER_INSTALLED:
		log(
			f'[bold][yellow]Package Manager Installation Detected[/yellow][/bold]\n'
			f'[dim]Location: {GLOBAL.PACKAGE_MANAGER_INSTALLED}[/dim]\n'
			f'[red]An existing system installation managed by your OS already exists.[/red]\n'
			f'[red]Why not use that instead?[/red]\n'
			f"[dim]Note: Changes made here will not affect your package manager's files.[/dim]",
			'WARNING',
		)


def update_existing_installation():
	check_os_release()
	check_local_repo()
	check_hyprland_installation()
	check_existing_installation()
	nuke_legacy_installations()

	if GLOBAL.EXISTING_INSTALLATION:
		check_local_repo()
		clone_repository()
		setup_venv()
		setup_source()
		make_executable_file()
		make_desktop_file()
		install_success(False, from_update=True)
	else:
		run_script_install_sequence(False)
		install_success(True)


def auto_install(install_type: Literal['User', 'System'] = 'User'):
	check_hyprland_installation()
	set_install_dirs(install_type)
	check_os_release()
	check_local_repo()
	check_existing_installation()  # if there's an existing installation this will just auto update that. Setting install dir won't have any effect
	nuke_legacy_installations()
	if GLOBAL.EXISTING_INSTALLATION:
		check_local_repo()
		clone_repository()
		setup_venv()
		setup_source()
		make_executable_file()
		make_desktop_file()
		install_success(False, from_update=True)
	else:
		run_script_install_sequence(False)
		install_success(True)


def run_script_install_sequence(show_success: bool = True):
	check_gtk_dependencies()
	check_hyprland_installation()
	nuke_legacy_installations()
	if not GLOBAL.EXISTING_INSTALLATION and not GLOBAL.MODE == 'UPDATE':
		select_installation_directory()
	check_local_repo()
	clone_repository()
	if not GLOBAL.IS_DEPENDENCY_INSTALLED:
		install_dependencies()
	setup_venv()
	setup_source()
	make_executable_file()
	make_desktop_file()
	if show_success:
		install_success(ask_launch=True)


def run_installation_wizard():
	def onboarding_choice():
		choices = []
		if not GLOBAL.EXISTING_INSTALLATION:
			choices.append('Install Hyprsettings interactively')
			choices.append('Quick install hyprsettings to user')
			choices.append('Quick install hyprsettings to system')
		elif GLOBAL.EXISTING_INSTALLATION and not GLOBAL.OS_RELEASE.startswith('nix'):
			choices.append('Update Hyprsettings')
			choices.append('Uninstall Hyprsettings')
		elif GLOBAL.OS_RELEASE.startswith('nix'):
			run_nixos_wizard()
			cleanup(False, 'Hyprsettings successfully installed for nix')

		response = choose_from('What would you like to do?', choices)
		if response.startswith('Update'):
			GLOBAL.MODE = 'UPDATE'
			update_existing_installation()
		elif response.startswith('Uninstall'):
			if confirm('Are you sure you want to uninstall Hyprsettings?'):
				uninstall(no_confirm=True)
			else:
				onboarding_choice()
		elif response.startswith('Quick') and 'system' in response:
			GLOBAL.MODE = 'UPDATE'
			auto_install('System')
		elif response.startswith('Quick') and 'user' in response:
			GLOBAL.MODE = 'UPDATE'
			auto_install('User')
		elif response.startswith('Install'):
			if GLOBAL.OS_RELEASE == 'arch':
				if install_via_aur() == 0:
					cleanup(False, 'Successfully Installed via AUR')
				else:
					spinner = Spinner('AUR Installation Declined. Proceeding with script installation.')
					time.sleep(1)
					spinner.stop()
					run_script_install_sequence()
			elif GLOBAL.OS_RELEASE == 'nixos':
				run_nixos_wizard()
			else:
				run_script_install_sequence()

	os.system('clear')
	check_os_release(GLOBAL.ARGS.emulate_distro)
	check_existing_installation()
	check_hyprland_installation()
	check_local_repo()
	check_gtk_dependencies()

	reset_view()
	if not GLOBAL.EXISTING_INSTALLATION and not GLOBAL.IS_DEPENDENCY_INSTALLED:
		ask_os_release()
	onboarding_choice()


def init_parser():
	parser = argparse.ArgumentParser(description='Install Hyprsettings', epilog=print_title())
	action_group = parser.add_mutually_exclusive_group()
	action_group.add_argument('-u', '--update', action='store_true', help='Update existing installation')
	action_group.add_argument('-r', '--uninstall', action='store_true', help='Uninstall Hyprsettings')
	# action_group.add_argument('-a', '--auto', action='store_true', help='Automatically install Hyprsettings system-wide')
	action_group.add_argument(
		'-a',
		'--auto',
		action='store_true',
		help='Automatically install Hyprsettings to current user unless it is installed to system already then it will update the system installation.',
	)
	action_group.add_argument(
		'-f',
		'--update_fake',
		action='store_true',
		help='If repo already exists, installs that without fetching updates from Github',
	)

	parser.add_argument('-e', '--emulate-distro', required=False, metavar='DISTRO', help='Emulate a specific distro name')
	args = parser.parse_args()
	return args


def main():
	args = init_parser()
	# print(args)
	signal.signal(signal.SIGINT, cleanup)
	GLOBAL.ARGS = args

	if args.update_fake:
		GLOBAL.MODE = 'UPDATE'
		GLOBAL.NO_GIT_PULL = True
		update_existing_installation()
	elif args.update:
		GLOBAL.MODE = 'UPDATE'
		update_existing_installation()
	elif args.auto:
		GLOBAL.MODE = 'UPDATE'
		auto_install()
	elif args.uninstall:
		uninstall()
	else:
		run_installation_wizard()


if __name__ == '__main__':
	main()
