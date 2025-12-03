#!/usr/bin/env python3
from packaging.version import Version
from pathlib import Path
import subprocess
import mimetypes
import builtins
import json
import os
import socket
import threading
import argparse
import time

os.environ["GDK_BACKEND"] = "wayland"
import webview
from rich import traceback
import tomlkit as toml
from parser import ConfigParser, Node, makeUUID, print_hyprland

traceback.install(show_locals=True)

thisfile_path = Path(__file__).parent.resolve()
CURRENT_VERSION = "0.4.0"
cache_path = Path.home() / ".cache" / "hyprsettings" / ".pywebview"

HOST = "127.0.0.1"
PORT = 65432

window_instance = None
window_visible = False
global daemon
global verbose

_original_print = builtins.print


def print(*args, **kwargs):
	_original_print("[ui-backend]", *args, **kwargs)


def log(msg, prefix="LOG", only_verbose=False):
	if verbose and only_verbose:
		print(f"[{prefix}] {msg}")


def on_loaded(window):
	print("DOM is ready")
	window.events.loaded -= on_loaded


def on_closed(window):
	if daemon:
		window_instance.hide()
		window_visible = False
		return False
	print("Window closed. Terminating process.")
	os._exit(0)


# ------------------- Socket toggle functions -------------------
def handle_client(conn):
	global window_instance, window_visible
	try:
		data = conn.recv(1024)
		if data.decode() == "TOGGLE" and window_instance:
			activeworkspace = (
				subprocess.run(
					"hyprctl monitors -j | jq '.[] | select(.focused==true) | .activeWorkspace.name'",
					shell=True,
					capture_output=True,
					text=True,
				)
				.stdout.strip()
				.strip('"')
			)
			# log(f"Active workspace from focused monitor: '{activeworkspace}'")

			specialworkspace = (
				subprocess.run(
					"hyprctl monitors -j | jq '.[] | select(.focused==true) | .specialWorkspace.name'",
					shell=True,
					capture_output=True,
					text=True,
				)
				.stdout.strip()
				.strip('"')
			)
			# log(f"Special workspace from focused monitor: '{specialworkspace}'")

			if specialworkspace:
				log(f"Special workspace {specialworkspace} detected, overriding active workspace")
				activeworkspace = specialworkspace
			# log(f"Workspace to target: '{activeworkspace}'")

			# get hyprsettings window workspace
			hyprsettings_window_workspace_name = subprocess.run(
				"hyprctl -j clients | jq -r '.[] | select(.initialClass==\"ui.py\") | .workspace.name'",
				shell=True,
				capture_output=True,
				text=True,
			).stdout.strip()
			# log(f"HyprSettings window currently on workspace: '{hyprsettings_window_workspace_name}'")

			# main toggle logic
			if window_visible and activeworkspace == hyprsettings_window_workspace_name:
				log(f"Window visible AND on current workspace ({activeworkspace}) → hiding")
				window_instance.hide()
				window_visible = False

			elif window_visible and activeworkspace != hyprsettings_window_workspace_name:
				log(
					f"Window visible BUT on different workspace ({hyprsettings_window_workspace_name}) → moving"
				)
				move = subprocess.run(
					["hyprctl", "dispatch", "movetoworkspace", f"{activeworkspace},initialclass:ui.py"],
					capture_output=True,
					text=True,
				)
				# log(f"Move stdout: '{move.stdout.strip()}'")
				# log(f"Move stderr: '{move.stderr.strip()}'")

			else:
				log(f"Window not visible → restoring and showing")
				window_instance.restore()  # restore if minimized
				window_instance.show()
				window_visible = True

	finally:
		conn.close()


def start_socket_server():
	with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
		s.bind((HOST, PORT))
		s.listen()
		while True:
			conn, addr = s.accept()
			threading.Thread(target=handle_client, args=(conn,), daemon=True).start()


def send_toggle():
	try:
		with socket.create_connection((HOST, PORT), timeout=0.1) as s:
			s.sendall(b"TOGGLE")
			print("Toggled existing window by daemon instead of  spawning a new one.")
			return True
	except (ConnectionRefusedError, socket.timeout):
		return False


class Api:
	def init(self):
		return self.get_config()

	def get_config(self, path=None):
		hyprland_config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
		config = ConfigParser(hyprland_config_path).root.to_json()
		return config

	def save_config(self, json: str):
		print_hyprland(Node.from_json(json).to_hyprland(indent_level=0, save=True))
		print("Saved to hyprland files")

	def new_uuid(self, length: int = 8):
		return makeUUID(length)

	def read_window_config(self):
		def version_migration():
			file_info = self.window_config["file_info"]
			if Version(file_info["version"]) < Version(CURRENT_VERSION):
				print(
					f"Config version {file_info['version']} is older than current {CURRENT_VERSION}. Updating version, moving keys."
				)
			file_info["version"] = CURRENT_VERSION
			persistence = self.window_config.get("persistence")
			if persistence is None:
				self.window_config["persistence"] = toml.table()
			try:
				# self.window_config["config"]["last_tab"]
				self.window_config["persistence"]["last_tab"] = self.window_config["config"]["last_tab"]
				self.window_config["config"].pop("last_tab")
				self.window_config = self.window_config
			except toml.exceptions.TOMLKitError as e:
				print(e)
			try:
				# self.window_config["config"]["last_tab"]
				self.window_config["persistence"]["first_run"] = self.window_config["config"]["first_run"]
				self.window_config["config"].pop("first_run")
				self.window_config = self.window_config
			except toml.exceptions.TOMLKitError as e:
				print(e)

		def add_missing_keys():
			defaults = {"animations": True, "daemon": True}
			config_lines = self.window_config["config"]
			for key, val in defaults.items():
				if key not in config_lines:
					config_lines[key] = val

		window_config_path = Path.home() / ".config" / "hypr" / "hyprsettings.toml"
		template = Path(thisfile_path / "default_config.toml")
		temporary_font = None
		try:
			temporary_font = self.list_fonts(mono=False, nerd=True)[1]
		except IndexError:
			print("No nerd font found. Using monospace.")
			temporary_font = None

		if not window_config_path.is_file() or window_config_path.stat().st_size == 0:
			print(f"Config file not found in {window_config_path}")
			with open(
				template,
				"r",
			) as default_config:
				default_config_text = default_config.read()

			self.window_config = toml.parse(default_config_text)
			self.window_config["config"]["font"] = temporary_font if temporary_font else "Monospace"
			add_missing_keys()
			version_migration()
			if self.window_config.get("daemon"):
				daemon = True
			with window_config_path.open("w") as config_file:
				config_file.write(default_config_text)
			return self.window_config
		else:
			with window_config_path.open("r", encoding="utf-8") as config_file:
				config = None
				try:
					config = toml.parse(config_file.read())
				except toml.exceptions.TOMLKitError as e:
					print(e)
					return {"configuration-error": str(e)}
				self.window_config = config
				version_migration()
				add_missing_keys()
				if self.window_config.get("daemon"):
					daemon = True
				return self.window_config




	def get_builtin_themes(self):
		file_path = thisfile_path / "ui" / "themes_builtin"
		themes = []
		for file in os.listdir(file_path):
			theme_file = Path(file_path / file)
			if not theme_file.is_file():
				continue
			if not str(theme_file).endswith(".toml"):
				continue
			with open(theme_file, "r", encoding="utf-8") as theme:
				file_content = theme.read()

				theme_content = toml.parse(file_content)
				# print(f'Theme content: {theme_content}')
				for theme_definition in theme_content.get("theme", []):
					themes.append(theme_definition)
		return themes

	def save_window_config(self, json_fromjs, part="config"):
		print(f"Called save window {part}")
		config_from_json = json.loads(json_fromjs)
		for key in config_from_json:
			self.window_config[part][key] = config_from_json[key]
		window_config_path = Path.home() / ".config" / "hypr" / "hyprsettings.toml"
		with open(window_config_path, "w", encoding="utf-8") as config_file:
			config_tosave = toml.dumps(self.window_config)
			config_file.write(config_tosave)

	def list_fonts(self, mono=False, nerd=False):
		cmd = "fc-list --format='%{family}\n'"
		if mono:
			cmd = "fc-list :spacing=100 --format='%{family}\n'"
		if nerd:
			cmd += " | grep -i 'Nerd'"
		cmd += " | sort -u"
		result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
		return [f.strip() for f in result.stdout.splitlines() if f.strip()]


# ------------------- Main entry -------------------
if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="A loyal hyprland parser and gui editor for hyprland.conf")
	parser.add_argument("-d", "--daemon", action="store_true", help="Run in background started for quick startup")
	parser.add_argument("-v", "--verbose", action="store_true", help="Get more descriptive logs")
	args = parser.parse_args()

	if send_toggle():
		exit(0)
	try:
		threading.Thread(target=start_socket_server, daemon=args.daemon).start()
		daemon = args.daemon
		verbose = args.verbose
		if args.daemon:
			print("Started HyprSettings in daemon mode from cli. Initially hiding window")

		api = Api()
		mimetypes.add_type("application/javascript", ".js")
		print(Path(thisfile_path / "ui" / "index.html"))
		webview.settings['OPEN_DEVTOOLS_IN_DEBUG'] = False
		window_instance = webview.create_window(
			"HyprSettings",
			"ui/index.html",
			js_api=api,
			transparent=True,
			width=800,
			height=600,
			easy_drag=True,
			min_size=(400, 300),
			hidden=args.daemon,
		)
		window_visible = not args.daemon
		window_instance.events.loaded += on_loaded
		window_instance.events.closed += on_closed

		# if args.daemon:
		# window_instance.hide()

		webview.start(
			gui="gtk",
			debug=True,
			private_mode=True,
			storage_path=str(cache_path),
			icon="icon-48.png",
		)
	except Exception as e:
		print("I am ded")
		print(e)
		os._exit(1)