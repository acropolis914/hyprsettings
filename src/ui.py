import webview
from parser import ConfigParser, Node, makeUUID
from pathlib import Path
import mimetypes


def on_loaded(window):
	print("DOM is ready")
	window.events.loaded -= on_loaded


class Api:
	def init(self):
		return self.get_config()

	def get_config(self):
		return config

	def save_config(self, json: str):
		pass

	def new_uuid(self, count: int):
		return makeUUID(count)


if __name__ == "__main__":
	current_file = Path(__file__).parent.resolve()
	config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
	config = ConfigParser(config_path).root.to_json()

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
