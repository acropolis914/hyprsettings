import sys
import os
from pathlib import Path
import rich.pretty as Pretty
from rich.console import Console
from collections import defaultdict
from PySide6.QtWidgets import (
    QApplication,
    QWidget,
    QHBoxLayout,
    QVBoxLayout,
    QPushButton,
    QLabel,
    QStackedWidget,
    QMainWindow,
)

config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
console = Console()


def sanitize(string) -> str:
    no_comments = string.split("#", 1)[0]
    return "".join(no_comments.split())


def remove_comments(string):
    return string.split("#", 1)[0]


def get_right(string, delimiter) -> str:
    return string.split(delimiter, 1)[1].strip()


def print2(*args, sep=" ", end="\n"):
    text = sep.join(str(arg) for arg in args)
    text = text.replace(" ", "·").replace("\t", "→")
    print(text, end=end)


def make_unique_key(key, dict: dict) -> str:
    new_name = key
    counter = 1
    while new_name in dict:
        new_name = f"{key}_{counter}"
        counter += 1
    return new_name


def parse_config(file_path: Path):
    configs = {}
    with open(file_path) as config:
        config_group = {}
        content = config.read()
        lines = content.split("\n")
        sources = []
        nest_names = []
        nest_level = 0

        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            line = remove_comments(line)

            if sanitize(line).endswith("{"):
                subgroup_name = line.strip().strip("{").strip()
                # print(subgroup_name)
                new_subgroup = {}
                if subgroup_name in config_group:
                    subgroup_name = make_unique_key(subgroup_name, config_group)
                config_group[f"{subgroup_name}"] = new_subgroup
                nest_level += 1
                nest_names.append(subgroup_name)
                continue
            if sanitize(line).endswith("}"):
                if nest_level > 1:
                    config_group[nest_names[-2]][nest_names[-1]] = config_group[
                        nest_names[-1]
                    ]
                    config_group.popitem()
                    nest_names.pop()
                nest_level -= 1
                continue
            if nest_level > 0:
                key, value = map(str.strip, line.split("=", 1))
                # if key in config_group[nest_names[-1]]:
                # key = make_unique_key(key, config_group[nest_names[-1]])
                # config_group[nest_names[-1]][key] = value
                config_group[nest_names[-1]].setdefault(key, []).append(value)
                # else:
                #     config_group[nest_names[-1]][key] = value
                continue
            if sanitize(line).startswith("windowrulev2"):
                rule = get_right(line.strip(), "=")
                config_group.setdefault("windowrulev2", []).append(rule)
                continue
            if sanitize(line).startswith("windowrule"):
                rule = get_right(line.strip(), "=")
                config_group.setdefault("windowrulev1", []).append(rule)
                continue
            if sanitize(line).startswith("monitor"):
                rule = get_right(line.strip(), "=")
                config_group.setdefault("monitors", []).append(rule)
                continue
            if line.startswith("source"):
                source_file = get_right(line, "=").strip()
                source_file_path = (file_path.parent / source_file).resolve()
                sources.append(source_file_path)
                config_group.setdefault("sources", []).append(source_file)
                continue
            if line.startswith("$"):
                global_entry = line.split("=", 1)
                global_key = global_entry[0].replace("$", "").strip()
                global_value = global_entry[1].strip()
                config_group.setdefault("globals", []).append(
                    {global_key: global_value}
                )
                continue
            if line.startswith("bind") and not line.endswith("{"):
                # print(line)
                key, value = map(str.strip, line.split("=", 1))
                config_group.setdefault("keybinds", []).append({key: value})
                continue
            else:
                key, value = map(str.strip, line.split("=", 1))
                config_group.setdefault(key, []).append(value)
                print(key, " doesnt have its personal parser yet.git gut")
                # if key in config_group:
                #     key = make_unique_key(key, config_group)
                # config_group[key] = value

        configs[f"{file_path}"] = config_group
        if sources:
            for source in sources:
                print(f"\n😃 Parsing config: {source}\n\n")
                parse_config(source)
    return configs


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("hyprui")

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)

        sidebar_widget = QWidget()
        sidebar_layout = QVBoxLayout(sidebar_widget)
        sidebar_buttons = ["Main Hyprland", "Hyprland Monitors", "Hyprland Keybinds"]
        for i, name in enumerate(sidebar_buttons):
            btn = QPushButton(name)
            btn.setFlat(True)
            btn.clicked.connect(
                lambda checked, idx=i, name=name: self.switch_tab(idx, name)
            )
            sidebar_layout.addWidget(btn)
        sidebar_layout.addStretch()

        self.main_view = QStackedWidget()
        for i, name in enumerate(sidebar_buttons):
            self.main_view.addWidget(QLabel(f"{name}"))
            main_layout.addWidget(self.main_view, stretch=4)

        main_layout.addWidget(sidebar_widget, stretch=1)
        main_layout.addWidget(self.main_view, stretch=4)

    def switch_tab(self, index, name):
        self.main_view.setCurrentIndex(index)
        print(index, name)
        pass


configs = parse_config(config_path)
console.print(Pretty.Pretty(configs, no_wrap=True))


# console.print("[bold green]🚀 Launching Qt UI...[/bold green]")
# app = QApplication(sys.argv)
# style = "style.qss"
# with open(style, "r") as styles:
#     app.setStyleSheet(styles.read())
# window = MainWindow()
# window.resize(800, 600)
# window.show()
# sys.exit(app.exec())
