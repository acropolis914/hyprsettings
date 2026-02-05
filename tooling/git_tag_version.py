import subprocess
import re
from pathlib import Path
from rich.console import Console
from rich.prompt import Prompt
from rich.text import Text

console = Console()

# Base path: directory of this script
BASE_DIR = Path(__file__).parent.resolve()

# 1️⃣ Get Git version
result = subprocess.run(['git', 'describe', '--long', '--tags', '--abbrev=7'], capture_output=True, text=True, check=True)
git_desc = result.stdout.strip()
git_version = re.sub(r'-(\d+)-g([0-9a-f]+)$', r'.r\1.g\2', git_desc)
git_version = git_version.replace('-', '.')
console.print(f'[bold green]Current version:[/bold green] {git_version}\n')


def update_file(file_path: Path, pattern: str, replacement: str, description: str):
	"""Preview, confirm, and replace a line in a file."""
	if not file_path.exists():
		console.print(f'[red]{file_path} does not exist! Skipping {description}.[/red]')
		return

	content = file_path.read_text()
	match = re.search(pattern, content)
	if not match:
		console.print(f'[yellow]No matching line found in {file_path} for {description}. Skipping.[/yellow]')
		return

	old_line = match.group(0)
	new_line = re.sub(pattern, replacement, old_line)

	# Preview before/after
	console.print(f'[cyan]Preview {description} in {file_path}:[/cyan]')
	console.print('  Before: ', Text(old_line, style='red'))
	console.print('  After : ', Text(new_line, style='green'))

	# Confirm
	answer = Prompt.ask('Update this file? ([Y]/n)', default='Y')
	if answer.lower() in ['y', 'yes']:
		# Replace in the full content
		content_new = content.replace(old_line, new_line)
		file_path.write_text(content_new)
		console.print(f'[green]Updated {file_path}[/green]\n')
	else:
		console.print(f'[yellow]Skipped {file_path}[/yellow]\n')


# 2️⃣ Update shared.py
shared_file = BASE_DIR / '../src/hyprsettings_utils/shared.py'
update_file(shared_file.resolve(), r"CURRENT_VERSION\s*=\s*['\"].*?['\"]", f"CURRENT_VERSION = '{git_version}'", 'CURRENT_VERSION line')

# 3️⃣ Update/create .version
version_file = BASE_DIR / '../src/.version'
version_file = version_file.resolve()
if version_file.exists():
	old_content = version_file.read_text()
	console.print('[cyan]Preview .version:[/cyan]')
	console.print('  Before: ', Text(old_content.strip(), style='red'))
	console.print('  After : ', Text(git_version, style='green'))
	answer = Prompt.ask('Update .version? ([Y]/n)', default='Y')
	if answer.lower() in ['y', 'yes']:
		version_file.write_text(git_version)
		console.print(f'[green]Updated {version_file}[/green]\n')
	else:
		console.print(f'[yellow]Skipped {version_file}[/yellow]\n')
else:
	version_file.write_text(git_version)
	console.print(f'[green]Created {version_file}[/green]\n')

# 4️⃣ Update default.nix
nix_file = BASE_DIR / '../default.nix'
update_file(nix_file.resolve(), r'version\s*=\s*["\'].*?["\']', f'version = "{git_version}"', 'version in default.nix')
