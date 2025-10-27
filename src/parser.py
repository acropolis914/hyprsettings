import os
from pathlib import Path
from typing import Literal, get_args
import json
import uuid
from glob import glob

import rich.pretty as Pretty
from rich.console import Console
import rich
import rich.traceback


rich.traceback.install(show_locals=True)

config_path = Path.home() / ".config" / "hypr" / "hyprland.conf"
console = Console()

NodeType = Literal["KEY", "GROUP", "COMMENT", "BLANK", "FILE", "GROUPEND"]


def makeUUID(count: int):
    return str(uuid.uuid4()).replace("-", "")[:count]


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
        self.uuid = makeUUID(8)

    def addChildren(self, child):
        self.children.append(child)

    def to_dict(self) -> dict:
        dict = {"type": self.type, "name": self.name, "uuid": self.uuid}
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

    def to_json(self) -> str:
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
                        groupeend_comment = (
                            f"# {child.comment}" if child.comment else ""
                        )
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

    @staticmethod
    def from_dict(data: dict) -> "Node":
        node = Node(
            name=data["name"],
            type_=data["type"],
            value=data.get("value"),
            comment=data.get("comment"),
            position=data.get("position"),
        )
        if "uuid" in data:
            node.uuid = data["uuid"]
        for child in data.get("children", []):
            node.addChildren(Node.from_dict(child))
        return node

    @staticmethod
    def from_json(json_string: str) -> "Node":
        data = json.loads(json_string)
        data = Node.from_dict(data)
        return data

    def __repr__(self):
        if self.type == "KEY":
            return f"Node: {self.name} with type {self.type}"
        if self.type == "GROUP":
            return f"Node: {self.name} with type {self.type}. Children {len(self.children)}"


def print_hyprland(config_list, print: bool = False, save: bool = False):
    for key, content in config_list.items():
        if print:
            rich.print(f"===Content of {key}, bitch===")
            rich.print(content)
        if save:
            with open(f"test_{key}", "w", encoding="UTF-8") as file:
                file.write(content)


class ConfigParser:
    def __init__(self, path: Path):
        self.root = Node("root", "GROUP")
        self.stack = [self.root]
        self.parse_config(path)

    @classmethod
    def load(cls, path: Path) -> Node:
        parser = cls(path)
        return parser.root

    def parse_config(self, config_path):
        with open(config_path, "r", encoding="UTF-8") as config_file:
            new_file_node = Node(Path(config_path).name, "FILE", str(config_path))
            self.stack[-1].addChildren(new_file_node)
            self.stack.append(new_file_node)
            sources = []
            for line_content in config_file:
                check: str = self.sanitize(line_content)
                line, comment = self.get_parts(line_content, "#")
                colon_index = line_content.find(":")
                equal_index = line_content.find("=")
                position = ":".join(node.name for node in self.stack)
                # print(line_content)
                if not check and not comment:
                    blank_line = Node(
                        "blank", "BLANK", value=None, comment=None, position=position
                    )
                    self.stack[-1].addChildren(blank_line)
                    continue
                if (
                    colon_index != -1
                    and equal_index != -1
                    and colon_index < equal_index
                ):
                    # TODO:IMPLEMENT COLON GROUPS
                    # print(f"Line {line_content} has ':' before '='")
                    pass
                if line_content.strip().startswith("#"):
                    comment_node = Node(
                        "comment",
                        "COMMENT",
                        value=None,
                        comment=comment,
                        position=position,
                    )
                    self.stack[-1].addChildren(comment_node)
                elif check.endswith("{"):
                    name = line.rstrip("{").strip()
                    child_node = Node(
                        name, "GROUP", value=None, comment=comment, position=position
                    )
                    self.stack[-1].addChildren(child_node)
                    self.stack.append(child_node)
                elif check.endswith("}"):
                    groupend_node = Node(
                        "group_end",
                        "GROUPEND",
                        value=None,
                        comment=comment,
                        position=position,
                    )
                    # print(comment)
                    self.stack[-1].addChildren(groupend_node)
                    self.stack.pop()
                # elif name.startswith("$"):
                #     name,value = self.get_parts(line,"=")
                #     name.rstrip("$")
                else:
                    name, value = self.get_parts(line, "=")
                    # print(position)
                    if value is None:
                        print(f"{value} has no value.")
                    node = Node(
                        name, "KEY", value=value, comment=comment, position=position
                    )
                    self.stack[-1].addChildren(node)

                if check.startswith("source"):
                    source, file_path = self.get_parts(line, "=")
                    # if Path(file_path).is_file():
                    sources.append((config_path.parent / file_path).resolve())

            self.stack.pop()
            if sources:
                for source in sources:
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


# os.system("clear")
# config_node1 = ConfigParser.load(config_path).to_json()
# rich.print_json(config_node1)
# with open("config_node1.txt", "w", encoding="UTF-8") as node1:
#     node1.write(config_node1)

# config_node2 = Node.from_json(config_node1).to_json()
# with open("config_node2.txt", "w", encoding="UTF-8") as node2:
#     node2.write(config_node2)
# rich.print(config_node2)
# hyrpland_files = ConfigParser(config_path).root.to_hyprland()
# print_hyprland(hyrpland_files, print=True, save=True)
