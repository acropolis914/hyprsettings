import threading
from argparse import Namespace
from pathlib import Path

from flask import Flask
from webview import Window

# traceback.install(show_locals=True)


class State:
	__slots__ = (
		'_extra',
		'window_instance',
		'window_visible',
		'window_thread',
		'flask_thread',
		'daemon',
		'verbose',
		'args',
		'hyprland_config_path',
		'webview_port',
		'flask_port',
		'app',
	)

	def __init__(self):
		self._extra: dict[str, object] = {}
		self.window_instance: Window | None = None
		self.window_visible: bool = True
		self.window_thread: threading.Thread | None = None
		self.flask_thread: threading.Thread | None = None
		self.daemon: bool = False
		self.verbose: bool = False
		self.hyprland_config_path: Path | str = Path.home() / '.config' / 'hypr' / 'hyprland.conf'
		self.args: Namespace | None = None
		self.webview_port: int = 65432
		self.flask_port: int = 6969
		self.app: Flask | None = None

	# Add a new explicit state variable (rarely)
	def add(self, key: str, value: object) -> None:
		if hasattr(self, key) or key in self._extra:
			raise KeyError(f"State variable '{key}' already exists")
		self._extra[key] = value

	# Access undefined variables from _extra
	def __getattr__(self, key):
		try:
			return self._extra[key]
		except KeyError:
			raise AttributeError(f"State variable '{key}' not defined")

	# Set value for core globals or _extra
	def __setattr__(self, key, value):
		if key in ('_extra',) or key in self.__slots__ or key in self.__class__.__dict__:
			object.__setattr__(self, key, value)
		elif key in self._extra:
			self._extra[key] = value
		else:
			raise AttributeError(f"State variable '{key}' must be added explicitly using add() first")


state = State()


class Globals:
	CACHE_PATH = Path.home() / '.cache' / 'hyprsettings' / '.pywebview'
	HOST = '127.0.0.1'
	CURRENT_VERSION = '0.8.1'


hs_globals = Globals()
