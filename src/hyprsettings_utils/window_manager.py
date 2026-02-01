from rich.console import Console
from .shared import state, hs_globals
import socket
from .utils import log

console = Console()


# UTILITY FUNCTIONS


def send_toggle():
	try:
		with socket.create_connection((hs_globals.HOST, state.webview_port), timeout=0.1) as s:
			s.sendall(b'TOGGLE')
			log(f'Toggled existing window daemon at port {state.webview_port} instead of spawning a new one.')
			return True
	except (ConnectionRefusedError, socket.timeout):
		return False
