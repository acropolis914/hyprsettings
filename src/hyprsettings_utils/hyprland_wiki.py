# import json
# import subprocess

from flask import Flask, jsonify
from pathlib import Path
from .shared import hs_globals
import os
from rich.console import Console

console = Console()

thisfile_path = Path(__file__).parent.resolve()


def register_markdown_routes(app: Flask):
	@app.route('/api/wiki_tree', methods=['GET'])
	def wiki_tree():
		if hs_globals.CONFIG_MODE == "HYPRLAND":
			return jsonify(read_hyprland_wiki_folder())
		return None


def read_hyprland_wiki_folder():
	HYPRLAND_WIKI_CONTENT_FOLDER: Path = Path(__file__).parent.parent / 'hyprland-wiki-content'
	wiki_folder = Path(HYPRLAND_WIKI_CONTENT_FOLDER)

	def folder_tree(root=wiki_folder) -> dict:
		# dir_tree = []
		dirs = {}
		# dir_tree.append('root')
		for content in os.listdir(root):
			path = os.path.join(root, content)
			# print(path)
			if path is None:
				continue
			elif os.path.isdir(path):
				# dir_tree.append(path)
				dir_content = folder_tree(path)
				dirs[content] = dir_content
			# dir_tree.pop()
			elif os.path.isfile(path):
				# dirs[content] = 'file'
				with open(path, "r") as file_content:
					dirs[content] = file_content.read()
			# print(Markdown(dirs[content]))
			else:
				dirs[content] = None
		return dirs

	tree = folder_tree(wiki_folder)
	# json_tree = json.dumps(tree, indent=4)
	# with open("/tmp/hyprland_wiki_tree.json", "w") as f:
	# 	json.dump(tree, f, indent=4)
	# 	subprocess.Popen(["code", "/tmp/hyprland_wiki_tree.json"])
	# console.print_json(data=tree)
	# print(type(tree))
	return tree

# read_wiki_navigation()
# read_wiki_folder()
