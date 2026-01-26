#!/usr/bin/env python3
"""
HyprSettings UI migration helper (safe, non-destructive)

- Source UI (detected): <repo_root>/src/ui  (preferred) or <repo_root>/ui
- Destination Vite project: <repo_root>/src/ui-src
- Copies files and folders (no deletions).
- Interactive: asks before copying, asks overwrite policy, optionally writes starter vite.config.js & package.json.
- Blocks at the end with a manual-deletion reminder; waits for ENTER acknowledgement.

Run from repo root:
    python3 src/migrate_ui.py
"""
from pathlib import Path
import shutil
import sys
import os
from typing import List, Tuple

from rich.console import Console
from rich.table import Table
from rich.prompt import Confirm
from rich.progress import (
    Progress,
    BarColumn,
    TextColumn,
    TimeElapsedColumn,
    TransferSpeedColumn,
)
from rich.panel import Panel
from rich.markdown import Markdown

console = Console()


# ---------- Path resolution ----------
def resolve_paths() -> Tuple[Path, Path]:
    """
    Returns (repo_root, original_ui_path, dest_ui_src_path)
    script is expected at <repo_root>/src/migrate_ui.py
    """
    script_path = Path(__file__).resolve()
    src_dir = script_path.parent
    repo_root = src_dir.parent

    candidate_src_ui = repo_root / "src" / "ui"
    candidate_top_ui = repo_root / "ui"

    if candidate_src_ui.exists():
        original_ui = candidate_src_ui
    elif candidate_top_ui.exists():
        original_ui = candidate_top_ui
    else:
        original_ui = candidate_src_ui  # prefer src/ui in messaging

    dest_ui_src = repo_root / "src" / "ui-src"

    return repo_root, original_ui, dest_ui_src


# ---------- File helpers ----------
def list_top_level(ui_dir: Path) -> List[Path]:
    if not ui_dir.exists():
        return []
    return [p for p in ui_dir.iterdir()]


def count_files(path: Path) -> int:
    if path.is_file():
        return 1
    total = 0
    for _root, _dirs, files in os.walk(path):
        total += len(files)
    return total


def copy_file(src: Path, dst: Path, overwrite: bool = False) -> str:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and not overwrite:
        return "skipped"
    shutil.copy2(src, dst)
    return "copied"


def copy_tree(
    src: Path, dst: Path, overwrite: bool, progress: Progress = None, task_id=None
) -> List[Tuple[Path, Path, str]]:
    actions = []
    if src.is_file():
        status = copy_file(src, dst, overwrite=overwrite)
        actions.append((src, dst, status))
        if progress and task_id is not None:
            progress.update(task_id, advance=1)
        return actions

    for root, _dirs, files in os.walk(src):
        rel_root = Path(root).relative_to(src)
        for f in files:
            srcf = Path(root) / f
            dstf = dst / rel_root / f
            status = copy_file(srcf, dstf, overwrite=overwrite)
            actions.append((srcf, dstf, status))
            if progress and task_id is not None:
                progress.update(task_id, advance=1)
    return actions


# ---------- Templates for starter files ----------
VITE_CONFIG_TEMPLATE = """import {{ defineConfig }} from 'vite';
import {{ resolve }} from 'path';

export default defineConfig({{
  root: '.',
  publicDir: 'public',
  build: {{
    // output to ../ui (relative to src/ui-src)
    outDir: resolve(__dirname, '..', 'ui'),
    // set false while you verify; switch to true later to allow Vite to clean target
    emptyOutDir: false,
    rollupOptions: {{
      input: resolve(__dirname, 'index.html'),
    }},
    assetsDir: 'assets',
  }},
  server: {{
    port: 3000,
    open: false,
  }},
  resolve: {{
    alias: {{
      '@': resolve(__dirname, 'src'),
      '@scripts': resolve(__dirname, 'scripts'),
    }},
  }},
}});
"""

PACKAGE_JSON_TEMPLATE = """{
  "name": "hyprsettings-ui",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "sass": "^1.70.0"
  },
  "dependencies": {
    "lit": "^3.0.0"
  }
}
"""

GITIGNORE_SNIPPET = """# UI build and node modules for ui-src
/src/ui-src/node_modules
/src/ui-src/dist
/src/ui-src/.vite
# (optional) ignore built output if you don't want to commit it:
# /src/ui
"""


# ---------- Main ----------
def main():
    console.rule("[bold cyan]HyprSettings UI Migration Helper[/bold cyan]")

    repo_root, original_ui, dest_ui_src = resolve_paths()

    console.print(f"Repository root: [green]{repo_root}[/green]")
    console.print(f"Detected original UI folder: [yellow]{original_ui}[/yellow]")
    console.print(f"Destination Vite project: [cyan]{dest_ui_src}[/cyan]")

    if not original_ui.exists():
        console.print(
            Panel.fit(
                "[red]ERROR[/red]: Could not find UI at either:\n"
                f"  - {repo_root / 'src' / 'ui'}\n"
                f"  - {repo_root / 'ui'}\n\n"
                "Move or create your UI in one of those locations and re-run.",
                title="Abort",
            )
        )
        sys.exit(2)

    # Build a plan: common items to move
    public_items = ["fonts", "linux", "themes_builtin", "icon-48.png", "reset.css"]
    covered = {
        "index.html",
        "scripts",
        "style.scss",
        "style.css",
        "style.css.map",
    } | set(public_items)

    items = list_top_level(original_ui)
    to_copy = []
    total_files = 0

    # index.html
    if (original_ui / "index.html").exists():
        to_copy.append(("file", original_ui / "index.html", dest_ui_src / "index.html"))
        total_files += count_files(original_ui / "index.html")

    # scripts folder
    if (original_ui / "scripts").exists():
        to_copy.append(("tree", original_ui / "scripts", dest_ui_src / "scripts"))
        total_files += count_files(original_ui / "scripts")

    # styles
    for sname in ("style.scss", "style.css", "style.css.map"):
        if (original_ui / sname).exists():
            to_copy.append(("file", original_ui / sname, dest_ui_src / sname))
            total_files += 1

    # public assets
    for name in public_items:
        srcp = original_ui / name
        if srcp.exists():
            if srcp.is_dir():
                to_copy.append(("tree", srcp, dest_ui_src / "public" / name))
                total_files += count_files(srcp)
            else:
                to_copy.append(("file", srcp, dest_ui_src / "public" / srcp.name))
                total_files += 1

    # other top-level items (copy them to dest root)
    for item in items:
        if item.name in covered:
            continue
        dst = dest_ui_src / item.name
        if item.is_dir():
            to_copy.append(("tree", item, dst))
            total_files += count_files(item)
        else:
            to_copy.append(("file", item, dst))
            total_files += 1

    # Show plan
    plan = Table(title="Migration plan", show_header=True)
    plan.add_column("Type")
    plan.add_column("Source")
    plan.add_column("Destination")
    for t, s, d in to_copy:
        plan.add_row(t, str(s), str(d))
    plan.add_row("build-target (unchanged)", "-", str(repo_root / "src" / "ui"))
    console.print(plan)

    console.print(
        Panel(
            Markdown(
                "This helper will COPY files from the detected UI into the new Vite project at "
                f"[cyan]{dest_ui_src}[/cyan].\n\n"
                "It will NOT delete or move the originals. Any cleanup must be done by you manually.\n\n"
                "If destination files already exist you will be asked whether to overwrite them."
            ),
            title="Important",
        )
    )

    if not Confirm.ask("Proceed with the copy operations?", default=False):
        console.print("Aborted by user. No changes made.")
        sys.exit(0)

    # Overwrite policy if destination exists
    overwrite = False
    if dest_ui_src.exists():
        console.print(f"[yellow]Destination {dest_ui_src} already exists.[/yellow]")
        console.print("Choose behavior for existing destination files:")
        console.print(" - [bold]Yes[/bold] => overwrite existing files")
        console.print(" - [bold]No[/bold]  => skip existing files (safe)")
        console.print(" - [bold]Abort[/bold] => stop now")
        choice = None
        while choice not in ("y", "n", "a"):
            raw = (
                console.input(
                    "[bold cyan]Overwrite files? ([y]es/[n]o/[a]bort): [/bold cyan]"
                )
                .strip()
                .lower()
            )
            if raw in ("y", "yes"):
                choice = "y"
            elif raw in ("n", "no"):
                choice = "n"
            elif raw in ("a", "abort"):
                choice = "a"
        if choice == "a":
            console.print("Aborted by user.")
            sys.exit(0)
        overwrite = choice == "y"

    # Optionally write starter files
    write_starters = Confirm.ask(
        "Write starter vite.config.js and package.json into src/ui-src? (recommended)",
        default=True,
    )

    # Perform copy with progress
    copied = skipped = 0
    errors = []
    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        "[progress.percentage]{task.percentage:>3.0f}%",
        "•",
        TransferSpeedColumn(),
        "•",
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Copying files", total=max(1, total_files))
        for t, s, d in to_copy:
            try:
                if t == "file":
                    status = copy_file(s, d, overwrite=overwrite)
                    if status == "copied":
                        copied += 1
                    else:
                        skipped += 1
                    progress.update(task, advance=1)
                else:
                    actions = copy_tree(
                        s, d, overwrite=overwrite, progress=progress, task_id=task
                    )
                    for _srcf, _dstf, _status in actions:
                        if _status == "copied":
                            copied += 1
                        else:
                            skipped += 1
            except Exception as e:
                errors.append((s, str(e)))
                console.print(f"[red]Error copying {s} -> {d}: {e}[/red]")

    # Ensure dest exists
    try:
        dest_ui_src.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        console.print(f"[red]Failed to ensure destination {dest_ui_src}: {e}[/red]")
        errors.append((dest_ui_src, str(e)))

    # Optionally create starter files (respect overwrite policy)
    if write_starters:
        vite_path = dest_ui_src / "vite.config.js"
        pkg_path = dest_ui_src / "package.json"
        gitignore_path = repo_root / ".gitignore"

        if vite_path.exists() and not overwrite:
            console.print(
                f"[yellow]vite.config.js already exists at {vite_path} (skipped).[/yellow]"
            )
        else:
            vite_path.write_text(VITE_CONFIG_TEMPLATE, encoding="utf-8")
            console.print(f"[green]Wrote {vite_path}[/green]")

        if pkg_path.exists() and not overwrite:
            console.print(
                f"[yellow]package.json already exists at {pkg_path} (skipped).[/yellow]"
            )
        else:
            pkg_path.write_text(PACKAGE_JSON_TEMPLATE, encoding="utf-8")
            console.print(f"[green]Wrote {pkg_path}[/green]")

        # Append .gitignore snippet if not present
        try:
            snippet = "\n# UI-src/ node and dist\n" + GITIGNORE_SNIPPET
            if gitignore_path.exists():
                gittext = gitignore_path.read_text(encoding="utf-8")
                if "src/ui-src/node_modules" not in gittext:
                    with gitignore_path.open("a", encoding="utf-8") as f:
                        f.write(snippet)
                    console.print(
                        f"[green]Appended ui-src entries to {gitignore_path}[/green]"
                    )
                else:
                    console.print(
                        f"[yellow]{gitignore_path} already contains ui-src ignore entries (skipped).[/yellow]"
                    )
            else:
                gitignore_path.write_text(GITIGNORE_SNIPPET, encoding="utf-8")
                console.print(
                    f"[green]Created {gitignore_path} with ui-src entries[/green]"
                )
        except Exception as e:
            console.print(f"[red]Failed to update .gitignore: {e}[/red]")

    console.rule("[bold green]Copy complete[/bold green]")
    console.print(
        f"Files copied: [green]{copied}[/green]. Skipped: [yellow]{skipped}[/yellow]. Errors: [red]{len(errors)}[/red]."
    )
    if errors:
        for srcf, emsg in errors:
            console.print(f"[red]{srcf} -> {emsg}[/red]")

    # Final blocking manual-deletion notice
    notice = Markdown(
        "### Manual cleanup required\n\n"
        "The script has COPIED your UI into the new Vite project at:\n\n"
        f"  [cyan]{dest_ui_src}[/cyan]\n\n"
        "It did NOT delete or move anything from the original UI location at:\n\n"
        f"  [yellow]{original_ui}[/yellow]\n\n"
        "If you want to remove the originals, DO THAT MANUALLY. This script will not perform deletions.\n\n"
        "When you're ready, press ENTER to acknowledge and finish."
    )
    console.print(Panel(notice, title="[red]Manual deletion required[/red]"))
    try:
        console.input()
    except (KeyboardInterrupt, EOFError):
        console.print("\n[red]Interrupted[/red]")

    console.print(
        Panel.fit(
            "[bold green]Done[/bold green]\n\n"
            "Next recommended steps:\n"
            "1) Review the Vite project at src/ui-src.\n"
            "2) Edit src/ui-src/index.html to use absolute root paths (e.g. /scripts/script.js). Put non-ESM libs into src/ui-src/public/jslib.\n"
            "3) In src/ui-src, install dev deps:\n"
            "     cd src/ui-src\n"
            "     bun init -y   # or npm init -y\n"
            "     bun add -d vite sass\n"
            "4) Dev: run bun run dev in src/ui-src and run your Python backend concurrently.\n"
            "5) Build: bun run build (writes to src/ui). Set emptyOutDir:true in vite.config.js after you confirm backups.\n\n"
            "Remember: backups are your friend. Do not delete originals until you confirm the new setup works.",
            title="What I did and what to do next",
        )
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[red]Interrupted by user[/red]")
        sys.exit(1)
