from pathlib import Path
import subprocess
import os
os.environ["GDK_BACKEND"] = "wayland"
import webview
from rich import traceback
import mimetypes
from parser import ConfigParser, Node, makeUUID, print_hyprland
import tomlkit as toml
import json


traceback.install(show_locals=True)
thisfile_path = Path(__file__).parent.resolve()


def on_loaded(window):
	print("DOM is ready")
	window.events.loaded -= on_loaded


def on_closed(window):
	print("Window closed. Terminating process.")
	os._exit(0)


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

	def new_uuid(self, length: int):
		return makeUUID(count)

	def read_window_config(self):
		window_config_path = Path.home() / ".config" / "hypr" / "hyprsettings.toml"
		template = Path(thisfile_path / "default_config.toml")
		temporary_font = self.list_fonts(mono=False, nerd=True)[1]

		if not window_config_path.is_file():
			print(f"Config file not found in {window_config_path}")
			with open(
				template,
				"r",
			) as default_config:
				default_config_text = default_config.read()
			self.window_config = toml.parse(default_config_text)
			self.window_config["config"]["font"] = temporary_font if temporary_font else "Monospace"
			print(self.window_config["config"]["font"])
			with window_config_path.open("w") as config_file:
				print(default_config_text)
				config_file.write(default_config_text)

			return self.window_config
		else:
			with window_config_path.open("r", encoding="utf-8") as config_file:
				config = toml.parse(config_file.read())
				self.window_config = config
				return self.window_config

	def save_window_config(self, json_fromjs):
		print("Called save window config.")
		config_from_json = json.loads(json_fromjs)
		for key in config_from_json:
			self.window_config["config"][key] = config_from_json[key]
		window_config_path = Path.home() / ".config" / "hypr" / "hyprsettings.toml"
		with open(window_config_path, "w", encoding="utf-8") as config_file:
			config_tosave = toml.dumps(self.window_config)
			config_file.write(config_tosave)

	def list_fonts(self, mono=False, nerd=False):
		cmd = "fc-list --format='%{family}\n'"
		if mono:
			cmd = "fc-list :spacing=100 --format='%{family}\n'"
		if nerd:
			cmd += " | grep -i 'Nerd Font'"
		cmd += " | sort -u"
		result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
		return [f.strip() for f in result.stdout.splitlines() if f.strip()]


if __name__ == "__main__":
	api = Api()
	mimetypes.add_type("application/javascript", ".js")
	window = webview.create_window(
		"HyprSettings",
		"ui/index.html",
		js_api=api,
		transparent=True,
		width=800,
		height=600,
		easy_drag=True,
	)
	webview.settings["OPEN_DEVTOOLS_IN_DEBUG"] = False
	window.events.loaded += on_loaded
	window.events.closed += on_closed
	webview.start(gui="gtk", debug=True, private_mode=False, storage_path=".pywebview", icon="icon-48.png")
