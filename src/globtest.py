import os
from pathlib import Path

# Keep track of sourced files
sources = []


def glob_path(path):
	path_str = path.rstrip("*")
	if not os.path.exists(path_str):
		print(f"Path does not exist: {path_str}")
		return
	for content in os.listdir(path_str):
		if Path(path_str,content).is_file():
			sources.append(Path(path_str, content).resolve())
		elif Path(path_str,content).is_dir():
			glob_path(str(Path(path_str,content)))
		print(f"Added via glob: {Path(path_str, content).resolve()}")


def process_source(line: str, config_path: Path):
	if not line.startswith("source"):
		return

	_, file_path = map(str.strip, line.split("=", 1))

	if file_path.startswith("~"):
		file_path = str(Path(file_path).expanduser())
		if file_path.endswith(".conf"):
			sources.append(Path(file_path).resolve())
			print(f"Added ~ conf: {file_path}")
		elif file_path.endswith("*"):
			glob_path(file_path)

	elif file_path.startswith("/"):
		if file_path.endswith(".conf"):
			sources.append(Path(file_path).resolve())
			print(f"Added abs conf: {file_path}")
		elif file_path.endswith("*"):
			glob_path(file_path)
	else:
		resolved = (config_path.parent / file_path).resolve()
		sources.append(resolved)
		print(f"Added relative: {resolved}")


# ====== TEST ======
config_path = Path("/tmp/hyprland.conf")

test_lines = [
    f"source = ~/temporary_hyprland/colors.conf",               # tilde expansion, single file
    f"source = ~/temporary_hyprland/themes/*",                # tilde + glob in subfolder        # deeper level glob
    f"source = {Path.home()}/temporary_hyprland/modules/module1.conf",  # absolute single file
    "source = local.conf",                                     # relative path test
]


for line in test_lines:
	print(f"\n--- Processing line: {line} ---")
	process_source(line, config_path)

print("\nFinal sources list:")
for src in sources:
	print(src)
