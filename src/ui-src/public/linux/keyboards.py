import json
from pathlib import Path

file_path = "/usr/share/X11/xkb/rules/base.lst"
result = {}
current_section = None

with open(file_path, "r", encoding="utf-8") as f:
	for line in f:
		line = line.strip()
		if not line or line.startswith("#"):
			continue
		if line.startswith("!"):
			current_section = line[1:].strip().lower()
			result[current_section] = []
		elif current_section:
			if current_section == "variant":
				# Format: name  country: description
				try:
					name, rest = line.split(None, 1)
					country, description = rest.split(":", 1)
					result[current_section].append(
						{
							"name": name.strip(),
							"country": country.strip(),
							"description": description.strip(),
						}
					)
				except ValueError:
					# fallback if splitting fails
					result[current_section].append({"line": line})
			else:
				# General case: split into 2 parts
				parts = line.split(None, 1)
				if len(parts) == 2:
					result[current_section].append({"key": parts[0].strip(), "value": parts[1].strip()})
				else:
					result[current_section].append({"key": parts[0].strip(), "value": ""})

json_output = json.dumps(result, indent=2)
with open("keyboards.json", "w") as file:
	file.write(json_output)
