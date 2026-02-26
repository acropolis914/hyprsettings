#!/bin/sh
""":"
# Polyglot shim for Python installer
# ----------------------------------
# This allows the installer to be run via:
#   curl ... | sh -s -- --auto
# while keeping Python interactive stdin available.

# create a temp file for the Python script
tmpfile=$(mktemp /tmp/hyprsettings.XXXXXX.py) || exit 1

# ensure temp file is removed when script exits
trap 'rm -f "$tmpfile"' EXIT

# write stdin (the Python script) into the temp file
cat > "$tmpfile"

# execute Python on the temp file with all arguments
exec python3 "$tmpfile" "$@"
":"""

import argparse
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
	IS_VENV_INSTALLED = False
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
		print(bbcode(text))


def run(cmd: List[str] | str, check=True, capture_output=True, text=True, shell=False):
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
	log(f'[dim][bold]Executing command:[/bold] {" ".join(cmd)}[/dim]')
	marker.clear()

	return subprocess.run(cmd, check=check, capture_output=capture_output, text=text, shell=shell)


class Spinner:
	def __init__(self, message='Loading...', success_message: str = 'Success', fail_message: str = 'Failed'):
		self.message = message
		self._stop_event = threading.Event()
		self._thread = threading.Thread(target=self._spin)
		self._status = 0  # default success
		self.start()

	def _spin(self):
		chars = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
		i = 0
		while not self._stop_event.is_set():
			sys.stdout.write(f'\r {self.message} {chars[i % len(chars)]}')
			sys.stdout.flush()
			i += 1
			time.sleep(0.02)

		# choose symbol based on status
		icon = '✔' if self._status == 0 else '✖'
		sys.stdout.write('\r')  # go to start of line
		sys.stdout.write('\033[K')  # clear the line
		# sys.stdout.write(f'\r{icon} {self.message}  \n')
		sys.stdout.flush()

	def start(self):
		self._thread.start()
		return self

	def stop(self, status=0):
		self._status = status
		self._stop_event.set()
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
	art = """\
	
 [bold][blue]  ╻ ╻╻ ╻┏━┓┏━┓┏━┓┏━╸╺┳╸╺┳╸╻┏┓╻┏━╸┏━┓
   ┣━┫┗┳┛┣━┛┣┳┛┗━┓┣╸  ┃  ┃ ┃┃┗┫┃╺┓┗━┓
   ╹ ╹ ╹ ╹  ╹┗╸┗━┛┗━╸ ╹  ╹ ╹╹ ╹┗━┛┗━┛[/bold][/blue]
   Your loyal hyprland config parser
[blue][link=https://github.com/acropolis914/hyprsettings] github.com/acropolis914/hyprsettings[/link][/blue]\n"""
	log(art, no_prefix=True)
	#  version [green][bold]{hs_globals.CURRENT_VERSION}[/bold][/green]


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
		new_response = confirm(message=message, default=default)
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
		s = subprocess.run(
			['command', '-v', 'hyprland'],
			shell=True,
			check=True,
			capture_output=True,
		)
		hyprland_path = s.stdout.decode(
			'utf-8',
		).strip()

		spinner.stop()
		marker.clear()
		log('[bold]Hyprland:[/bold] installed')
		GLOBAL.IS_HYPRLAND_INSTALLED = Path(hyprland_path)
		return 0
	except Exception as e:
		spinner.stop(1)
		marker.clear()
		log(f'Hyprland installation not found. Consider installing hyprland(lol). Error: {e}', 'WARNING')
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
	if release not in ['arch', 'fedora', 'nix', 'nixos']:
		GLOBAL.OS_RELEASE = f'{release} (unsupported)'
	else:
		GLOBAL.OS_RELEASE = release


def ask_os_release():
	release = GLOBAL.OS_RELEASE
	if 'unsupported' in release:
		choice = choose_from(
			'Unsupported Distro detected. Is it based on one of the following distros?:',
			['Arch', 'Fedora', 'NixOs', 'None of the above'],
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

	# 1️⃣ Try exact ID first
	family = match(distro_id)
	if family:
		return family

	# 2️⃣ Then check ID_LIKE entries
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


def run_nixos_wizard():
	"""
	Interactive wizard to install or update HyprSettings on NixOS using choose_from().
	Uses `log(message, level)` for output (supports basic BBCode).
	"""
	repo_url = 'https://github.com/acropolis914/hyprsettings'
	cache_dir = GLOBAL.CLONE_REPOSITORY

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
	log(nix_message)

	choices = []
	method = None
	try:
		result = subprocess.run(['nix', 'profile', 'list'], text=True, capture_output=True)
		if 'github:acropolis914/hyprsettings' in result.stdout:
			method = 'flakes'
	except Exception:
		pass

	if not method:
		try:
			result = subprocess.run(['nix-env', '-q'], text=True, capture_output=True)
			if 'hyprsettings' in result.stdout.lower():
				method = 'traditional'
		except Exception:
			pass

	# Step 2: Determine options
	if method:
		message = f'[bold]󱜸 Existing HyprSettings installation detected via {method}[/bold]'
		log(message, level='info')
		choices = [f'Upgrade current installation ({method})']
	else:
		message = '[bold]󱜸 Select installation method[/bold]'
		log(message, level='info')
		choices = [
			'Flakes: try without installing',
			'Flakes: install to profile',
			'Traditional Nix: build',
			'Traditional Nix: install',
			'Home Manager',
		]

	# Step 3: Get user choice
	choice = choose_from(message, choices, default='1')

	# Step 4: Run corresponding subprocess commands
	try:
		if method and choice.startswith('Upgrade'):
			log(f'[cyan]Running upgrade for {method} installation...[/cyan]', level='INFO')
			if method == 'flakes':
				subprocess.run(['nix', 'profile', 'upgrade', 'github:acropolis914/hyprsettings'], check=True)
			elif method == 'traditional':
				cache_dir.mkdir(parents=True, exist_ok=True)
				if not (cache_dir / 'default.nix').exists():
					log(f'[yellow]Cloning HyprSettings repo into {cache_dir}[/yellow]', level='INFO')
					subprocess.run(['git', 'clone', repo_url, str(cache_dir)], check=True)
				subprocess.run(['nix-build'], cwd=str(cache_dir), check=True)
				subprocess.run(['nix-env', '-f', str(cache_dir / 'default.nix'), '-i'], check=True)
			elif method == 'home-manager':
				log('[yellow]Re-applying Home Manager config...[/yellow]', level='INFO')
				subprocess.run(['home-manager', 'switch'], check=True)
			cleanup(False, f'HyprSettings updated successfully ({method})')
			return

		# No previous installation → normal install
		log(f'[cyan]Installing HyprSettings using choice: {choice}[/cyan]', level='INFO')
		if choice.startswith('Flakes: try'):
			subprocess.run(['nix', 'run', 'github:acropolis914/hyprsettings'], check=True)

		elif choice.startswith('Flakes: install'):
			subprocess.run(['nix', 'profile', 'add', 'github:acropolis914/hyprsettings'], check=True)

		elif choice.startswith('Traditional Nix: build'):
			cache_dir.mkdir(parents=True, exist_ok=True)
			if not (cache_dir / 'default.nix').exists():
				log(f'[yellow]Cloning HyprSettings repo into {cache_dir}[/yellow]', level='INFO')
				subprocess.run(['git', 'clone', repo_url, str(cache_dir)], check=True)
			subprocess.run(['nix-build'], cwd=str(cache_dir), check=True)

		elif choice.startswith('Traditional Nix: install'):
			cache_dir.mkdir(parents=True, exist_ok=True)
			if not (cache_dir / 'default.nix').exists():
				log(f'[yellow]Cloning HyprSettings repo into {cache_dir}[/yellow]', level='INFO')
				subprocess.run(['git', 'clone', repo_url, str(cache_dir)], check=True)
			subprocess.run(['nix-env', '-f', str(cache_dir / 'default.nix'), '-i'], check=True)

		elif choice.startswith('Home Manager'):
			home_manager_snippet = f"""home.packages = [
  (pkgs.callPackage {str(cache_dir / 'default.nix')} {{}})
];"""
			log('[bold]Add the following snippet to your home.nix and run `home-manager switch`:[/bold]', level='INFO')
			print(home_manager_snippet)

		return
	except subprocess.CalledProcessError as e:
		cleanup(True, e.stderr)


def install_dependencies():
	release = GLOBAL.OS_RELEASE
	match release:
		case 'arch':
			clear_view('Installing Arch dependencies')
			try:
				run(
					['sudo', 'pacman', '-Sy', '--noconfirm', '--needed', 'python', 'python-gobject', 'gtk3', 'webkit2gtk'],
					capture_output=False,
					check=True,
				)
				log('[bold]Dependency Install:[/bold] Success')
				GLOBAL.IS_DEPENDENCY_INSTALLED = True
				reset_view()
				return 0

			except subprocess.CalledProcessError as e:
				log(
					f'Failed to install hyprsettings dependencies. Error: {e}',
					'CRITICAL',
				)
				cleanup(True)
				return 1

		case 'fedora':
			# log('Installing Fedora dependencies')
			clear_view(
				'Installing Fedora dependencies',
			)
			try:
				run(
					'sudo dnf install gcc gobject-introspection-devel cairo-gobject-devel pkg-config python3-devel gtk4',
					capture_output=False,
					shell=True,
				)
				log('[bold]Dependency Install:[/bold] Success')
				GLOBAL.IS_DEPENDENCY_INSTALLED = True
				reset_view()
				return 0
			except subprocess.CalledProcessError as e:
				log(
					f'Failed to install dependencies via dnf. Error: {e}',
					'CRITICAL',
				)
				cleanup(True)
				return 1

		case 'nixos':
			return 0
		case default:
			return 0


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
		GLOBAL.IS_DEPENDENCY_INSTALLED = True
		reset_view()
	elif decision == choices[1]:
		GLOBAL.NO_GTK = True


def print_unsupported_os_guide():
	clear_view('[red]Unsupported distro detected. Manual dependency installation is required.[/red]')
	log(
		'[yellow]Hyprsettings may fail to launch a window on this system if these are not installed.[/yellow]\n\n'
		'You must manually install the system dependencies required for [bold]PyGObject + GTK4[/bold].\n'
		'These are the build dependencies referenced in Step 2 of the official setup guide.\n\n'
		'[bold][blue]Required components (and typical package names):[/blue][/bold]\n'
		'[dim]'
		'  - Python headers:        python3-dev / python3-devel\n'
		'  - C Compiler:            gcc / build-essential\n'
		'  - Build config tool:     pkg-config / pkgconf\n'
		'  - Cairo graphics:        libcairo2-dev / cairo-devel\n'
		'  - GObject Introspection: gobject-introspection / libgirepository-2.0-dev\n'
		'  - GTK4 C Library:        gtk4 / libgtk-4-dev\n'
		'  - GTK4 GI Data (Python): gir1.2-gtk-4.0 / typelib-1_0-Gtk-4_0\n'
		'[/dim]\n\n'
		'[bold]Example installation commands:[/bold]\n'
		'  Debian / Ubuntu / Mint (APT):\n'
		'  [dim]sudo apt install libgirepository-2.0-dev gcc libcairo2-dev pkg-config python3-dev libgtk-4-dev gir1.2-gtk-4.0[/dim]\n\n'
		'  openSUSE(zypper):\n'
		'  [dim]sudo zypper install cairo-devel pkg-config python3-devel gcc gobject-introspection-devel gtk4 typelib-1_0-Gtk-4_0[/dim]\n\n'
		'Refer to the official guide for distro-specific instructions:\n'
		'  [link=https://pygobject.readthedocs.io/en/latest/getting_started.html]PyGObject Getting Started[/link]',
		'WARNING',
	)


def clone_repository():
	if GLOBAL.IN_LOCAL_CLONE:
		# log(f'[bold]Clone Directory:[/bold] {Path(__file__).parent} (here)')
		to_update = False
		if GLOBAL.MODE == 'UPDATE':
			to_update = True
		else:
			to_update = confirm('Do you want to pull updates from github?')
		if to_update:
			spinner = Spinner('Updating local repository...')
			try:
				subprocess.run('git pull', shell=True)  # TODO UNCOMMENT THIS
				spinner.stop()
				GLOBAL.IS_REPO_UPDATED = True
				reset_view()
				# log('[bold]Repository:[/bold] up to date')
			except Exception as e:
				log(f'Failed to update repository. Error: {e}', 'WARNING')
				spinner.stop(1)
		return
	else:
		destination = GLOBAL.CLONE_REPOSITORY
		destination.mkdir(parents=True, exist_ok=True)
		log(f'[bold]Clone Directory:[/bold] {str(destination)}')
		marker = ConsoleMarker()

		if destination.is_dir() and Path(destination / '.git').exists():
			to_update = confirm('Do you want to pull updates from github?')
			if to_update:
				spinner = Spinner(f'Updating hyprsettings repository in {destination}')
				try:
					run(
						['git', '-C', str(destination), 'pull'],
					)
					GLOBAL.IS_REPO_UPDATED = True
					spinner.stop()
				except subprocess.CalledProcessError as e:
					log(f'Failed to clone repository. Error: {e.stderr}', 'WARNING')
					spinner.stop(1)
		else:
			spinner = Spinner(f'Cloning hyprsettings repository to {destination}')
			try:
				run(
					[
						'git',
						'clone',
						'https://github.com/acropolis914/hyprsettings',
						str(destination),
					],
				)
				spinner.stop()
				GLOBAL.IS_REPO_UPDATED = True
			except subprocess.CalledProcessError as e:
				log(f'Failed to clone repository. Error: {e.stderr}', 'WARNING')
				spinner.stop(1)
		marker.clear()


def check_local_repo():
	destination = Path.home() / '.cache' / 'hyprsettings' / 'git-clone'
	destination.mkdir(parents=True, exist_ok=True)
	if Path('.git').exists() and Path('src').exists() and Path('src/hyprsettings').is_file():
		GLOBAL.IN_LOCAL_CLONE = True
		GLOBAL.CLONE_REPOSITORY = Path(__file__).parent
	else:
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

		if GLOBAL.NO_GTK is None and GLOBAL.NO_WEBVIEW:
			GLOBAL.NO_GTK = True

		if GLOBAL.NO_GTK is not None and not GLOBAL.NO_GTK:
			log('Adding pywebview')
			packages.append('pywebview')
			packages.append('pywebview[gtk]')

		pip_base = [
			str(venv_directory / 'bin/pip'),
			'install',
			'--upgrade-strategy',
			'only-if-needed',
		]

		if not venv_directory.exists():
			run(['mkdir', '-p', str(venv_directory)])
			run(['python', '-m', 'venv', str(venv_directory)])

		# always install deps
		run([*pip_base, 'setuptools', 'wheel'], capture_output=True)
		run([*pip_base, *packages], capture_output=False)
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


def uninstall():
	check_existing_installation()
	if not GLOBAL.EXISTING_INSTALLATION:
		log('No existing installation found.')
		cleanup('Nothing to uninstall.')
		return

	# remove library directory
	lib_path = Path(GLOBAL.LIB_DIRECTORY)
	if lib_path.is_dir():
		log(f'Deleting {lib_path}')
		try:
			run(['rm', '-rf', str(lib_path)], check=True)
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

	cleanup(False, 'Done uninstalling.')


def nuke_legacy_installations():
	log('\n[bold][yellow]Sweeping for legacy bash installations...[/yellow][/bold]', level='INFO')
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
	for path in targets:
		if path.exists():
			found_legacy = True
			cmd = ['rm', '-rf', str(path)]
			if str(path).startswith('/usr'):
				cmd.insert(0, 'sudo')

			try:
				run(cmd, capture_output=True, check=True)
				log(f'Purged legacy path: [dim]{path}[/dim]', level='INFO')
			except subprocess.CalledProcessError as e:
				log(f'Failed to remove [yellow]{path}[/yellow]: {e.stderr}', level='ERROR')

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
		log('No legacy bash installations found. You are clean.', level='INFO')


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


def clear_view(message):
	os.system('clear')
	if message:
		log(f'[bold][blue]{message}[/blue][/bold]', level='INFO', no_prefix=True)


def reset_view():
	os.system('clear')
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

	if GLOBAL.PACKAGE_MANAGER_INSTALLED:
		log(f'[bold]Package Manager Installed:[/bold]\n  [dim]{GLOBAL.PACKAGE_MANAGER_INSTALLED}[/dim]')

	if GLOBAL.EXISTING_INSTALLATION:
		log(f'[bold]Existing Installation by Script[/bold]\n  [dim]{GLOBAL.INSTALLATION_PATH} [blue]{GLOBAL.EXISTING_INSTALLATION}[/blue][/dim]')

	if not GLOBAL.EXISTING_INSTALLATION and GLOBAL.INSTALLATION_PATH:
		log(f'[bold]New installation to[/bold]\n  [dim]{GLOBAL.INSTALLATION_PATH}[/dim]')

	if GLOBAL.IS_HYPRLAND_INSTALLED:
		log(f'[bold]Hyprland Installed:[/bold]\n  [dim]{GLOBAL.IS_HYPRLAND_INSTALLED}[/dim]')

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


def update_existing_installation():
	check_os_release()
	check_existing_installation()
	nuke_legacy_installations()
	if GLOBAL.EXISTING_INSTALLATION:
		check_local_repo()
		clone_repository()
		setup_venv()
		setup_source()
		make_executable_file()
		make_desktop_file()
	else:
		run_script_install_sequence()


def auto_install():
	GLOBAL.MODE = 'AUTO_INSTALL'
	check_os_release()
	check_existing_installation()
	nuke_legacy_installations()
	if GLOBAL.EXISTING_INSTALLATION:
		check_local_repo()
		clone_repository()
		setup_venv()
		setup_source()
		make_executable_file()
		make_desktop_file()
	else:
		run_script_install_sequence()


def run_script_install_sequence():
	nuke_legacy_installations()
	clone_repository()
	if not GLOBAL.EXISTING_INSTALLATION:
		select_installation_directory()
	check_hyprland_installation()
	install_dependencies()
	setup_venv()
	setup_source()
	make_executable_file()
	make_desktop_file()


def init_parser():
	parser = argparse.ArgumentParser(description='Install Hyprsettings', epilog=print_title())
	action_group = parser.add_mutually_exclusive_group()
	action_group.add_argument('-u', '--update', action='store_true', help='Update existing installation')
	action_group.add_argument('-r', '--uninstall', action='store_true', help='Uninstall Hyprsettings')
	parser.add_argument('-a', '--auto', action='store_true', help='Automatically install Hyprsettings system-wide')
	parser.add_argument('-e', '--emulate-distro', required=False, metavar='DISTRO', help='Emulate a specific distro name')
	args = parser.parse_args()
	return args


def main():
	args = init_parser()
	if args.update:
		GLOBAL.MODE = 'UPDATE'
		update_existing_installation()
		cleanup(False, 'Hyprsettings Updated')
	elif args.uninstall:
		uninstall()
	os.system('clear')
	signal.signal(signal.SIGINT, cleanup)
	check_os_release(args.emulate_distro)
	check_existing_installation()
	check_local_repo()
	reset_view()
	if not GLOBAL.EXISTING_INSTALLATION:
		ask_os_release()

	choices = []
	if not GLOBAL.EXISTING_INSTALLATION:
		choices.append('Install Hyprsettings')
	elif GLOBAL.EXISTING_INSTALLATION:
		choices.append('Update Hyprsettings')
		choices.append('Uninstall Hyprsettings')

	def onboarding_choice():
		response = choose_from('What would you like to do?', choices)
		if response.startswith('Update'):
			GLOBAL.MODE = 'UPDATE'
			update_existing_installation()
		elif response.startswith('Uninstall'):
			if confirm('Are you sure you want to uninstall Hyprsettings?'):
				uninstall()
			else:
				onboarding_choice()
		elif response.startswith('Install'):
			if GLOBAL.OS_RELEASE == 'arch':
				if install_via_aur() == 0:
					cleanup(False, 'Successfully Installed via AUR')
				else:
					spinner = Spinner('AUR Installation Declined. Proceeding with script installation.')
					time.sleep(2)
					spinner.stop()
					run_script_install_sequence()
			elif GLOBAL.OS_RELEASE == 'nixos':
				run_nixos_wizard()
			else:
				run_script_install_sequence()

	onboarding_choice()
	cleanup()


if __name__ == '__main__':
	main()
