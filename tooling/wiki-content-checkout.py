#!/usr/bin/env python3
import subprocess
from pathlib import Path
from datetime import datetime
from rich.console import Console
import shutil

console = Console()

# -------------------------
# Config
# -------------------------
REPO_URL = 'https://github.com/hyprwm/hyprland-wiki.git'
SCRIPT_DIR = Path(__file__).parent.resolve()
LOCAL_REPO = SCRIPT_DIR / '.hyprland-wiki'
TARGET_DIR = SCRIPT_DIR.parent / 'src' / 'hyprland-wiki-content'

console.print('[bold cyan]Updating wiki content...[/bold cyan]')

# -------------------------
# 1️⃣ Clone or update local repo
# -------------------------
if not (LOCAL_REPO / '.git').exists():
	console.print(f'[green]Cloning full repo into {LOCAL_REPO}...[/green]')
	subprocess.run(['git', 'clone', '--branch', 'main', '--tags', REPO_URL, str(LOCAL_REPO)], check=True)
else:
	console.print(f'[yellow]Updating local repo in {LOCAL_REPO}...[/yellow]')
	subprocess.run(['git', '-C', str(LOCAL_REPO), 'fetch', '--tags', 'origin', 'main'], check=True)
	subprocess.run(['git', '-C', str(LOCAL_REPO), 'reset', '--hard', 'origin/main'], check=True)

# -------------------------
# 2️⃣ Clear target folder
# -------------------------
console.print(f'[blue]Clearing target folder {TARGET_DIR}...[/blue]')
TARGET_DIR.mkdir(parents=True, exist_ok=True)
for item in TARGET_DIR.iterdir():
	if item.is_dir():
		shutil.rmtree(item)
	else:
		item.unlink()

# -------------------------
# 3️⃣ Copy content folder
# -------------------------
CONTENT_SRC = LOCAL_REPO / 'content'
if CONTENT_SRC.exists() and CONTENT_SRC.is_dir():
	console.print('[green]Copying content folder...[/green]')
	shutil.copytree(CONTENT_SRC, TARGET_DIR, dirs_exist_ok=True)
else:
	console.print('[red]Warning: content folder not found in local repo[/red]')

# -------------------------
# 4️⃣ Copy LICENSE
# -------------------------
LICENSE_SRC = LOCAL_REPO / 'LICENSE'
if LICENSE_SRC.exists():
	console.print('[green]Copying LICENSE...[/green]')
	shutil.copy2(LICENSE_SRC, TARGET_DIR)
else:
	console.print('[red]Warning: LICENSE file not found in local repo[/red]')

# -------------------------
# 5️⃣ Create version file using latest commit date + SHA
# -------------------------
console.print('[cyan]Creating version file...[/cyan]')

# Get latest commit date in ISO format
commit_date_bytes = subprocess.check_output(['git', '-C', str(LOCAL_REPO), 'log', '-1', '--format=%cI'])
commit_date_str = commit_date_bytes.decode().strip()
commit_dt = datetime.fromisoformat(commit_date_str)

# Get latest commit SHA (7 chars)
commit_sha_bytes = subprocess.check_output(['git', '-C', str(LOCAL_REPO), 'rev-parse', '--short=7', 'HEAD'])
commit_sha = commit_sha_bytes.decode().strip()

version = f'v{commit_dt:%Y.%m.%d_%H%M}_{commit_sha}'

# Current local fetch time
last_fetched = datetime.now().strftime('%Y.%m.%d_%H%M')

# Write .version file
version_file = TARGET_DIR / '.version'
version_file.write_text(f'{version}\nlast_fetched: {last_fetched}\n')

console.print(f'[bold green]Updated .version:[/bold green] {version}, last fetched {last_fetched}')

# -------------------------
# Done
# -------------------------
console.print('[bold cyan]Done! Content folder and LICENSE are up to date.[/bold cyan]')
console.print(f'[cyan]Local repo kept in {LOCAL_REPO} for fast updates on reruns.[/cyan]')
