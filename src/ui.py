import webview
from parser import ConfigParser, Node, makeUUID, print_hyprland
from pathlib import Path
import mimetypes
from rich import traceback
import tomlkit as toml
from default_config import default_config
import json

traceback.install(show_locals=True)


def on_loaded(window):
	print("DOM is ready")
	window.events.loaded -= on_loaded


class Api:
	def init(self):
		return self.get_config()

	def get_config(self, path=None):
		# current_file = Path(__file__).parent.resolve()
		hyprland_config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
		config = ConfigParser(hyprland_config_path).root.to_json()
		return config

	def save_config(self, json: str):
		print_hyprland(Node.from_json(json).to_hyprland(indent_level=0, save=True))
		print("Saved to hyprland files")
		pass

	def new_uuid(self, count: int):
		return makeUUID(count)

	def read_window_config(self):
		window_config_path = Path.home() / ".config" / "hypr" / "hyprsettings.toml"
		if not window_config_path.is_file():
			print(f"Config file not found in {window_config_path}")
			with window_config_path.open("w") as config_file:
				config_file.write(default_config)
			self.window_config = toml.parse(default_config)
			return self.window_config
		else:
			with window_config_path.open("r", encoding="utf-8") as config_file:
				config = toml.parse(config_file.read())
				self.window_config = config
				return self.window_config

	def save_window_config(self, json_fromjs):
		window_config_path = Path.home() / ".config" / "hypr" / "hyprsettings.toml"
		config_from_json = json.loads(json_fromjs)["config"]
		for key, value in config_from_json:
			self.window_config["config"][key] = value

		with open(window_config_path, "w", encoding="utf-8") as config_file:
			config_tosave = toml.dumps(self.window_config)
			config_file.write(config_tosave)


if __name__ == "__main__":
	api = Api()
	mimetypes.add_type("application/javascript", ".js")
	window = webview.create_window(
		"Hyprland Config Editor",
		"ui/index.html",
		js_api=api,
		transparent=True,
	)

	# print(webview.settings)
	window.events.loaded += on_loaded

	webview.start(
		gui="gtk", debug=True, private_mode=False, storage_path=".pywebview"
	)
