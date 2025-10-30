import webview
from parser import ConfigParser, Node, makeUUID, print_hyprland
from pathlib import Path
import mimetypes
from rich import traceback

traceback.install(show_locals=True)


def on_loaded(window):
	print("DOM is ready")
	window.events.loaded -= on_loaded


class Api:
	def init(self):
		return self.get_config()

	def get_config(self):
		# current_file = Path(__file__).parent.resolve()
		config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
		config = ConfigParser(config_path).root.to_json()
		return config

	def save_config(self, json: str):
		print_hyprland(Node.from_json(json).to_hyprland(indent_level=0, save=True))
		print("Saved to hyprland files")
		pass

	def new_uuid(self, count: int):
		return makeUUID(count)


if __name__ == "__main__":
	api = Api()
	mimetypes.add_type("application/javascript", ".js")
	window = webview.create_window(
		"Hyprland Config Editor",
		"ui/index.html",
		js_api=api,
		transparent=True,
	)
	window.events.loaded += on_loaded

	webview.start(
		gui="gtk", debug=True, private_mode=False, storage_path=".pywebview"
	)
