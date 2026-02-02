from flask import Flask, jsonify
from pathlib import Path
from .shared import hs_globals
import os


thisfile_path = Path(__file__).parent.resolve()


def register_markdown_routes(app: Flask):
	@app.route('/api/wiki_tree', methods=['GET'])
	def wiki_tree():
		return jsonify(read_wiki_folder())


def read_wiki_navigation():
	with open(Path(hs_globals.HYPRLAND_WIKI_CONTENT_FOLDER / 'navigation.txt').resolve(), 'r', encoding='utf-8') as navigation_file:
		navigation_items = []
		for line in navigation_file:
			line = line.strip()
			navigation_items.append(line)
		print(navigation_items)
		# if line.startswith('▸ '):
		# 	line = line.replace('▸ ', '')
		# 	if line == 'hyprtoolkit':
		# 		line = '   ' + line
		# else:
		# 	line = '   ' + line
		# log(line)


def read_wiki_folder():
	wiki_folder = Path(hs_globals.HYPRLAND_WIKI_CONTENT_FOLDER)

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
				dirs[content] = open(path, 'r', encoding='utf-8').read()
				# print(Markdown(dirs[content]))
			else:
				dirs[content] = None
		return dirs

	tree = folder_tree(wiki_folder)
	# json_tree = json.dumps(tree, indent=4)
	# print_json(json_tree)
	# print(type(tree))
	return tree


# read_wiki_navigation()
# read_wiki_folder()
