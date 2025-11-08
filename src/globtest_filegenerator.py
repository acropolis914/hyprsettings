import os
from pathlib import Path

# Base test folder
base = Path.home() / "temporary_hyprland"

# Clean up old test folder if exists
if base.exists():
	import shutil

	shutil.rmtree(base)

# Create multi-level folder structure
structure = [
	"colors.conf",
	"fonts.conf",
	"themes/night.conf",
	"themes/day.conf",
	"themes/custom/custom1.conf",
	"themes/custom/custom2.conf",
	"modules/module1.conf",
	"modules/module2.conf",
]

for path in structure:
	full_path = base / path
	full_path.parent.mkdir(parents=True, exist_ok=True)
	full_path.write_text(f"# Dummy content for {path}")

print(f"Test config tree created at {base}")

# ===== Test lines for your source parser =====
test_lines = [
	f"source = {base}/colors.conf",  # absolute file
	f"source = {base}/themes/*",  # glob in a subfolder
	f"source = ~/temporary_hyprland/modules/*",  # ~ expansion + glob
	f"source = {base}/themes/custom/*",  # deeper recursion test
	"source = local.conf",  # relative path test
]

print("\nTest lines for parser:")
for line in test_lines:
	print(line)
