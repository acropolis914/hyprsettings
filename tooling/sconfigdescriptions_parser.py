#!/usr/bin/env python3
# this script is used to extract config descriptions from the hyprwm repo
# used to detect types and autocompletes in the ui.
#     SConfigOptionDescription{
#         .value       = "general:border_size",
#         .description = "size of the border around windows",
#         .type        = CONFIG_OPTION_INT,
#         .data        = SConfigOptionDescription::SRangeData{1, 0, 20},
#     },

from pathlib import Path
import rich.traceback
import json
import rich.pretty
import re

rich.traceback.install(show_locals=True)


def get_parts(line: str):
	return line.split("=", 1)[1].strip().strip(",").strip('"')


class Node:
	def __init__(self, path, name, type_, data, description):
		self.name = name
		self.path = path
		self.type = type_
		self.data = data
		self.description = description

	def print_node(self):
		pass

	def to_dict(self):
		dict = {
			"name": self.name,
			"path": self.path,
			"type": self.type,
			"data": self.data,
			"description": self.description,
		}
		return dict

	def to_json(self):
		return json.dumps(self.to_dict(), indent=4)


def get_config_descriptions(file_path) -> list:
	descriptions = []
	with open(file_path, "r", encoding="UTF-8") as file:
		lines = file.readlines()
		#     info = {}
		name = None
		path = None
		type_ = None
		description = ""
		data = None
		is_editing_description = False
		for line in lines:
			line = line.strip()
			if line.startswith("SConfigOptionDescription"):
				pass
			elif line.startswith(".value"):
				parts = get_parts(line).split(":")
				path = ":".join(parts[:-1])
				name = parts[-1]
				# if len(parts) - 1 > 1:
				# 	print(path)
				is_editing_description = False
			elif line.startswith(".description"):
				parts = get_parts(line)
				description = parts
				is_editing_description = True
			elif line.startswith(".type"):
				type_ = line.split("=", 1)[1].strip().strip(",")
				is_editing_description = False
			elif line.startswith(".data"):
				value = line.split("=", 1)[1].strip().strip(",")
				match = re.search(r"\{(.+)\}", value)
				data = match.group(1).strip("") if match else None  # doesnt work good with split_bias
				
				is_editing_description = False
			elif is_editing_description:
				# print(line)
				description += " " + line.strip().strip(",").strip('"')
			elif line.startswith("}"):
				if path and name:
					configNode = Node(path, name, type_, data, description).to_dict()
					descriptions.append(configNode)
					# print(configNode.to_json())
				name = None
				path = None
				type_ = None
				description = ""
				data = None
				description = ""
				is_editing_description = False
			else:
				pass
				# print(f"No shit for line {line}")
	return descriptions


file_path = f"{Path(__file__).resolve().parent}/ConfigDescriptions.txt"
config_list = get_config_descriptions(file_path)
for obj in config_list:
	if obj["description"]:
		obj["description"] = obj["description"].strip('"').replace("\\n", "")

# jsonstring = json.dumps(config_list, indent=4)
# print(jsonstring)
with open("hyprland_config_descriptions.js", "w+", encoding="utf-8") as description_file:
	description_file.write("export const config_descriptions = ")
	json.dump(config_list, description_file, indent=2, ensure_ascii=False)
	description_file.write(";")

	# RUN THIS AND THEN REPLACE MANUALLY ALL \" with nothing
# print(
# 	tomlkit.dumps(
# 		{"config": [{k: (v if v is not None else "") for k, v in d.items()} for d in json.loads(jsonstring)]}
# 	)
# )
# print(tomlkit.dumps({'config': json.loads(jsonstring)}))


# then fix the data on the outpit js
#     "name": "vrr",
#     "path": "misc",
#     "type": "CONFIG_OPTION_INT",
#     "data": ".value = 0, .min = 0, .max = 3",
#     "description": "\tcontrols the VRR (Adaptive Sync) of your monitors. 0 - off, 1 - on, 2 - fullscreen only, 3 - fullscreen with game or video content type [0/1/2/3]"
#   },
