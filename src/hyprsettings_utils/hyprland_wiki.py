import json
import subprocess

from flask import Flask, jsonify
from pathlib import Path

try:
	from .shared import hs_globals
except:
	pass
import os
from rich.console import Console
import rich.traceback

rich.traceback.install(show_locals=True)
console = Console()

thisfile_path = Path(__file__).parent.resolve()


def register_markdown_routes(app: Flask):
	@app.route('/api/wiki_tree_hypr', methods=['GET'])
	def wiki_tree_hypr():
		if hs_globals.CONFIG_MODE == "HYPRLAND":
			return jsonify(read_hyprland_wiki_folder())
		return jsonify({})

	@app.route('/api/wiki_tree_niri', methods=['GET'])
	def wiki_tree_niri():
		if hs_globals.CONFIG_MODE == "NIRI":
			return jsonify(read_niri_wiki_folder())
		return jsonify({})


def read_niri_wiki_folder() -> dict:
	import re
	wiki_folder: Path = Path(__file__).parent.parent / "niri-wiki-content"
	with open(wiki_folder / "_Sidebar.md", "r") as file_content_:
		tree = {}
		currentParent: dict = None
		content = file_content_.readlines()
		read_files = []
		unread_files = []
		parentWeights = 0
		childWeights = 0
		for line in content:
			if line.strip().startswith("#"):
				childWeights = 0
				header = line.strip().replace("## ", "").strip()
				tree[header] = {}
				currentParent = tree[header]
			if line.strip().startswith("*"):
				title = re.search(r"\[(.*?)\]", line).group(1).strip()
				link = re.search(r"\((.*?)\)", line).group(1).strip()
				read_files.append(link.replace("./", "") + ".md")
				resolved_link = Path(str(wiki_folder) + "/" + link.replace("./", "") + ".md")
				try:
					with open(resolved_link, "r") as md:
						content = md.read()
				except FileNotFoundError:
					content = f"File {resolved_link.name} not found."
				frontmatter = f"""---
weight: {childWeights}
title: {title.replace("_", " ").replace("-", " ")}
---"""
				currentParent[link.replace("./", "")] = frontmatter + content
				childWeights += 1
		# print({"title": title, "link": link, "content": content})
		with open(wiki_folder / "Home.md", "r") as home:
			tree["_index.md"] = home.read()

		with open(wiki_folder / ".version", "r") as home:
			tree[".version"] = home.read()
		return tree


# for file in os.listdir(wiki_folder):
# 	if file.endswith(".md") and Path(file).name not in read_files:
# 		unread_files.append(file)
# console.print({"unread": unread_files, "read": read_files})


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
	# 	subprocess.Popen(["json-janice", "/tmp/hyprland_wiki_tree.json"])
	# console.print_json(data=tree)
	# print(type(tree))
	return tree


# read_wiki_navigation()
# read_wiki_folder()


if __name__ == '__main__':
	json_content = read_niri_wiki_folder()
	with open("/tmp/niri_wiki_content.json", "w") as file_content:
		json.dump(json_content, file_content, indent=4)
	subprocess.Popen(["json-janice", "/tmp/niri_wiki_content.json"])
