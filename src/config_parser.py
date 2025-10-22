import os
from pathlib import Path
import rich.pretty as Pretty
from rich.console import Console
import rich
from typing import Literal, get_args
from typing_extensions import assert_type
import json
import rich.traceback

rich.traceback.install(show_locals=True)

config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
console = Console()

NodeType = Literal["KEY", "GROUP", "COMMENT", "BLANK", "FILE", "GROUPEND"]


class Node:
    def __init__(self, name, type_: NodeType, value=None, comment=None, position=None):
        allowed_types = get_args(NodeType)
        assert type_ in allowed_types, (
            f"Invalid node type {type_}. Must be one of {allowed_types}"
        )
        self.name = name
        self.type = type_
        self.value = value
        self.comment = comment
        self.children: list = []
        self.position = position

    def addChildren(self, child):
        self.children.append(child)

    def to_dict(self):
        dict = {"type": self.type, "name": self.name}
        # new
        if self.comment:
            dict["comment"] = self.comment
        if self.position:
            dict["position"] = self.position
        if self.value is not None:
            dict["value"] = self.value
        if self.children:
            dict["children"] = [child.to_dict() for child in self.children]
        return dict

    def to_json(self):
        return json.dumps(self.to_dict(), indent=4)

    def to_hyprland(self, indent_level: int = 0) -> dict | str:
        indent = "  "

        if self.type == "KEY":
            comment = f" #{self.comment}" if self.comment else ""
            return f"{indent * indent_level}{self.name} = {self.value}{comment}"
        if self.type == "BLANK":
            return ""
        if self.type == "COMMENT":
            if self.comment.startswith("#"):
                return f"{indent * indent_level}#{self.comment}"
            else:
                return f"{indent * indent_level}# {self.comment}"
        if self.children:
            if self.type == "GROUP" and self.name == "root":
                stack = {}
                for file in self.children:
                    file_name = str(file.name)
                    content = file.to_hyprland()
                    stack[file_name] = content
                return stack
            if self.type == "FILE":
                content = []
                for child in self.children:
                    file_content = child.to_hyprland()
                    content.append(file_content)
                return "\n".join(content)
            if self.type == "GROUP" and self.name != "root":
                group_content = []
                comment = f" # {self.comment}" if self.comment else ""

                group_content.append(
                    f"{indent * indent_level}{self.name}" + " {" + comment
                )
                indent_level += 1
                groupeend_comment = None
                for child in self.children:
                    if child.type == "GROUPEND":
                        groupeend_comment = f"# {child.comment}" if child.comment else ""
                        continue
                    content = child.to_hyprland(indent_level)
                    group_content.append(content)
                indent_level -= 1
                group_content.append(
                    f"{indent * indent_level}" + "}" + f" {groupeend_comment}"
                )

                return "\n".join(group_content)
        else:
            print(f"{self.name} cannot be formatted to a hyprland file")
        return ""

    def __repr__(self):
        if self.type == "KEY":
            return f"Node: {self.name} with type {self.type}"
        if self.type == "GROUP":
            return f"Node: {self.name} with type {self.type}. Children {len(self.children)}"


class ConfigParser:
    def __init__(self, path: Path):
        self.root = Node("root", "GROUP")
        self.stack = [self.root]
        self.parse_config(path)

    def parse_config(self, config_path):
        with open(config_path, "r", encoding="UTF-8") as config_file:
            new_file_node = Node(Path(config_path).name, "FILE", str(config_path))
            self.stack[-1].addChildren(new_file_node)
            self.stack.append(new_file_node)
            sources = []
            for line_content in config_file:
                check: str = self.sanitize(line_content)
                line, comment = self.get_parts(line_content, "#")
                # print(line_content)
                if not check and not comment:
                    blank_line = Node("blank", "BLANK")
                    self.stack[-1].addChildren(blank_line)
                    continue

                if line_content.strip().startswith("#"):
                    comment_node = Node(
                        "comment", "COMMENT", value=None, comment=comment
                    )
                    self.stack[-1].addChildren(comment_node)
                elif check.endswith("{"):
                    name = line.rstrip("{").strip()
                    child_node = Node(name, "GROUP", value=None, comment=comment)
                    self.stack[-1].addChildren(child_node)
                    self.stack.append(child_node)
                elif check.endswith("}"):
                    groupend_node = Node(
                        "group_end", "GROUPEND", value=None, comment=comment
                    )
                    # print(comment)
                    self.stack[-1].addChildren(groupend_node)
                    self.stack.pop()
                else:
                    name, value = self.get_parts(line, "=")
                    position = (
                        ":".join(node.name for node in self.stack[2:])
                        if self.stack[2:]
                        else ""
                    )
                    # print(position)
                    if value is None:
                        print(f"{value} has no value.")
                    node = Node(
                        name, "KEY", value=value, comment=comment, position=position
                    )
                    self.stack[-1].addChildren(node)

                if check.startswith("source"):
                    source, file = self.get_parts(line, "=")
                    sources.append((config_path.parent / file).resolve())
            self.stack.pop()
            if sources:
                for source in sources:
                    pass
                    # print(source)
                    self.parse_config(source)

    def sanitize(self, string: str) -> str:
        no_comments = string.split("#", 1)[0]
        return "".join(no_comments.split())

    def get_parts(self, string, delimiter) -> tuple:
        if delimiter in string:
            part1, part2 = map(str.strip, string.split(delimiter, 1))
            # print(part1, part2)
            return part1, part2
        else:
            # print(
            #     f'String "{string}" has no right side on the given delimiter ',
            #     delimiter,
            # )
            part2 = None
            part1 = string.strip()
            return part1, part2


os.system("clear")
config = ConfigParser(config_path).root.to_json()
rich.print_json(config)


hyrpland_files = ConfigParser(config_path).root.to_hyprland()
for key, content in hyrpland_files.items():
    # rich.print(f"===Content of {key}, bitch===")
    # rich.print(content)
    with open(f"test_{key}", "w", encoding="UTF-8") as file:
        file.write(content)


# console.print(Pretty.Pretty(config, no_wrap=True))

# tee /dev/tty | wl-copy
