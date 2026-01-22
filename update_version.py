#!/usr/bin/env python3
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Callable

from packaging.version import Version, InvalidVersion
from rich.console import Console

console = Console()

# Each target: (relative_path, regex_pattern, replacement_fn)
# Each target: (relative_path, regex_pattern, replacement_fn)
TARGETS: list[tuple[str, str, Callable[[re.Match, str], str]]] = [
    ("PKGBUILD", r"^(pkgver=)(.*)$", lambda m, ver: f"{m.group(1)}{ver}"),
    ("default.nix", r'^(  version = ")([^"]*)(";)', lambda m, ver: f"{m.group(1)}{ver}{m.group(3)}"),
    ("src/hyprsettings", r'^(CURRENT_VERSION\s*=\s*")([^"]*)(")', lambda m, ver: f"{m.group(1)}{ver}{m.group(3)}"),
    ("pyproject.toml", r'^(version\s*=\s*")([^"]*)(")', lambda m, ver: f'{m.group(1)}{ver}{m.group(3)}'),
    ("src/ui/settings.js", r"^(let VERSION\s*=\s*')([^']*)(')", lambda m, ver: f"{m.group(1)}{ver}{m.group(3)}"),
    ("uv.lock", r"^(version\s*=\s*)(.*)$", lambda m, ver: f"{m.group(1)}{ver}"),
]

PKGBUILD_MIRROR = Path("../hyprsettings-git/PKGBUILD")


def short_path(path: Path, root: Path) -> str:
	try:
		return str(path.relative_to(root))
	except ValueError:
		return f".../{path.name}"


def ask_yes_no(prompt: str, default: bool = True) -> bool:
	suffix = "Y/n" if default else "y/N"
	resp = console.input(f"{prompt} [{suffix}] ").strip().lower()
	if not resp:
		return default
	return resp in ("y", "yes")


def read_current_pkgver(root: Path) -> str | None:
	pkgbuild = root / "PKGBUILD"
	if not pkgbuild.exists():
		return None
	text = pkgbuild.read_text()
	m = re.search(r"^pkgver=(.*)$", text, flags=re.MULTILINE)
	if m:
		return m.group(1).strip()
	return None


def compute_new_version(current: str | None) -> str:
	if current:
		console.print(f"Current pkgver: [bold]{current}[/bold]")
	console.print("Select update type:  [1] patch   [2] minor   [custom version]")
	choice = console.input("Choice: ").strip()
	if choice == "1" and current:
		try:
			v = Version(current)
			new = Version(f"{v.major}.{v.minor}.{v.micro + 1}")
			return str(new)
		except InvalidVersion:
			console.print("[red]Cannot parse current version; enter custom version.[/red]")
	elif choice == "2" and current:
		try:
			v = Version(current)
			new = Version(f"{v.major}.{v.minor + 1}.0")
			return str(new)
		except InvalidVersion:
			console.print("[red]Cannot parse current version; enter custom version.[/red]")

	# Custom version path
	new_ver = console.input("Enter new version (e.g. 0.7.4): ").strip()
	try:
		Version(new_ver)  # validate
	except InvalidVersion:
		console.print("[red]Invalid version format. Exiting.[/red]")
		sys.exit(1)
	return new_ver


def preview_and_apply(
	path: Path, pattern: str, repl_fn: Callable[[re.Match, str], str], new_ver: str, root: Path
) -> bool:
	if not path.exists():
		console.print(f"[red][/red] {short_path(path, root)} not found")
		return False

	text = path.read_text()
	matches = list(re.finditer(pattern, text, flags=re.MULTILINE))
	if not matches:
		console.print(f"[red][/red] No matches in {short_path(path, root)}")
		return False

	console.print(f"\n[bold cyan]{short_path(path, root)}[/bold cyan]")
	for m in matches:
		old_line = m.group(0)
		new_line = repl_fn(m, new_ver)
		lineno = text.count("\n", 0, m.start()) + 1
		console.print(f"  line {lineno}:")
		console.print(f"    [red]- {old_line}[/red]")
		console.print(f"    [green]+ {new_line}[/green]")

	if not ask_yes_no(f"Apply changes to {short_path(path, root)}?", default=True):
		console.print(f"[red][/red] {short_path(path, root)} skipped")
		return False

	def _sub_fn(match: re.Match) -> str:
		return repl_fn(match, new_ver)

	new_text, count = re.subn(pattern, _sub_fn, text, flags=re.MULTILINE)
	path.write_text(new_text)
	console.print(f"[green][/green] Applied {count} change(s) to {short_path(path, root)}")
	return True


def copy_pkgbuild(src_root: Path):
	src = src_root / "PKGBUILD"
	dst = PKGBUILD_MIRROR
	if not src.exists():
		console.print("[red][/red] PKGBUILD not found; not copying")
		return
	dst.parent.mkdir(parents=True, exist_ok=True)
	shutil.copy2(src, dst)
	console.print(f"[green][/green] Copied PKGBUILD to {dst}")


def run_pkgbuild_repo_tasks(src_root: Path):
	repo_dir = (src_root / "../hyprsettings-git").resolve()
	if not repo_dir.exists():
		console.print(f"[red][/red] {repo_dir} does not exist; skipping repo tasks")
		return

	console.print(f"\n[bold cyan]Repo tasks in {repo_dir}[/bold cyan]")
	if not ask_yes_no("Continue with .SRCINFO/git commit?", default=True):
		console.print("[red][/red] Repo tasks skipped")
		return

	cmds = [
		["bash", "-lc", "makepkg --printsrcinfo > .SRCINFO"],
	]
	for cmd in cmds:
		console.print(f"[blue][/blue] {' '.join(cmd)}")
		subprocess.run(cmd, cwd=repo_dir, check=True)

	console.print("[blue][/blue] git add PKGBUILD .SRCINFO")
	subprocess.run(["git", "add", "PKGBUILD", ".SRCINFO"], cwd=repo_dir, check=True)

	msg = console.input("Git commit message (leave empty to skip): ").strip()
	if msg:
		console.print(f"[blue][/blue] git commit -m {msg!r}")
		subprocess.run(["git", "commit", "-m", msg], cwd=repo_dir, check=True)
	else:
		console.print("[red][/red] Commit skipped (no message provided)")


def main():
	root = Path(__file__).resolve().parent
	current = read_current_pkgver(root)
	new_ver = compute_new_version(current)

	console.print(f"New version will be: [bold]{new_ver}[/bold]")

	any_changes = False
	for rel, pattern, repl_fn in TARGETS:
		any_changes |= preview_and_apply(root / rel, pattern, repl_fn, new_ver, root)

	if any_changes:
		copy_pkgbuild(root)
		run_pkgbuild_repo_tasks(root)
	else:
		console.print("[red][/red] No changes applied; nothing further to do.")

	console.print("[green][/green] Done.")


if __name__ == "__main__":
	main()
