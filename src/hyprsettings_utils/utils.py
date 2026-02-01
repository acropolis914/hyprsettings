import socket
from .shared import *
from rich.console import Console


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

	prefix_str = f'{prefix}' if prefix else ''
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
