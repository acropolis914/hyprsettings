import socket
import subprocess

from .shared import *
from rich.console import Console
import os

_last_log_message = None
_last_log_count = 1
console = Console()


def is_port_open(port, timeout=0.1):
	with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
		s.settimeout(timeout)
		return s.connect_ex((hs_globals.HOST, port)) == 0


def ui_print(*args, **kwargs):
	console.print('[blue][UIBackend][/blue]', *args, **kwargs)


def warn(msg):
	log(f'[red]{msg}[red]')


def log(msg, prefix='', only_verbose=False):
	global _last_log_message, _last_log_count

	prefix_str = f'[green]{prefix}[/green]' if prefix else ''
	full_message = f'{prefix_str} {msg}'

	if not only_verbose or state.verbose:
		if full_message == _last_log_message:
			_last_log_count += 1

			console.file.write('\033[F\033[K')
			ui_print(f'{full_message} [dim](×{_last_log_count})[/dim]')
		else:
			ui_print(f'{full_message}')
			_last_log_message = full_message
			_last_log_count = 1


def get_user_string():
	uname = os.getlogin()
	hostname = socket.gethostname()

	os_name = "unknown"
	try:
		with open("/etc/os-release") as f:
			for line in f:
				if line.startswith("NAME="):
					os_name = line.split("=", 1)[1].strip().strip('"')
					break
	except FileNotFoundError:
		pass

	return f"{uname}@{hostname}@{os_name.replace(' ', '_')}"


def list_fonts(mono=False, nerd=False):
	cmd = "fc-list --format='%{family}\n'"
	if mono:
		cmd = "fc-list :spacing=100 --format='%{family}\n'"
	if nerd:
		cmd += " | grep -i 'Nerd'"
	cmd += ' | sort -u'
	result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
	return [f.strip() for f in result.stdout.splitlines() if f.strip()]
