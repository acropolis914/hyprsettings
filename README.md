# HyprSettings

Hyprsettings is a configurator for `hyprland.conf` (and its included files), built for people like me who don't like faffing around with configs.  
Made with Python, web technologies via PyWebviewGTK, vanilla JS, and some JS libraries.

<img width="799" height="598" alt="image" src="https://github.com/user-attachments/assets/07ed324f-0939-4f01-8475-401cf650bfc0" />

> [!IMPORTANT]
> This is in alpha state.

You can fork this repo, make changes, and submit pull requests. Please also submit bugs, start discussions, etc. I'd love to hear from you!



## Table of Contents

- [HyprSettings](#hyprsettings)
	- [Table of Contents](#table-of-contents)
	- [Testing the UI](#testing-the-ui)
	- [Arch Linux Installation (Dependencies + Hyprland bind)](#arch-linux-installation-dependencies--hyprland-bind)
	- [Configuration and Theming](#configuration-and-theming)
	- [Organizing Comments into Tabs](#organizing-comments-into-tabs)
	- [A Personal Note](#a-personal-note)
		- [Notice on the use of AI](#notice-on-the-use-of-ai)



## Testing the UI

1. Clone the repo:

```bash
git clone https://github.com/acropolis914/hyprsettings
cd hyprsettings
```

2. Install required system packages(make a venv if you want):

```bash
sudo pacman -Syu python python-gobject gtk3 python-pywebview python-tomlkit python-rich
```

3. Run the UI:

```bash
python src/ui.py
```



## Arch Linux Installation (Dependencies + Hyprland bind)

For Arch users, you can run the following single block to install dependencies and add a keybind to your Hyprland configuration:

```bash
sudo pacman -Syu python python-gobject gtk3 python-pywebview python-tomlkit python-rich
git clone https://github.com/acropolis914/hyprsettings ~/hyprsettings
echo 'bind = SUPER, I, Exec, python ~/hyprsettings/src/ui.py' >> ~/.config/hypr/hyprland.conf
```

> Make sure to replace `SUPER, I` with the key combination you want to use.



## Configuration and Theming

Hyprsettings will create a configuration file at:

```
~/.config/hypr/hyprsettings.toml
```

The defaults should be fine, but if you like tweaking, you can explore and modify the file. Be careful, though I don’t have extensive safeguards and fallbacks right now.



## Organizing Comments into Tabs

> [!NOTE]
> Config keys are **auto-sorted** regardless of where they appear in your configuration files. The convention below only applies to **comments** and determines which tab they appear under in the UI.

To make comments appear under the correct tab in Hyprsettings, use a **three-line comment block** **before** the section it applies to in your configuration files. The format is flexible but must follow these rules:

```
####...       (four or more `#` characters)
### NAME ###  (middle line contains `### ` anywhere)
####...       (four or more `#` characters)
```

- The middle line is checked using `includes("### ")`, so as long as it contains three consecutive `#` symbols, it will be recognized.  
- Section names are **not case sensitive**.  
- The top and bottom lines must have at least four `#` characters; extra `#` are allowed.  
- Place the comment block **immediately before** the section it describes for proper mapping in the UI.

**Example:**

```
###################
### ANIMATIONS ###
###################
```

This will place the section under the **Animations** tab in the UI.

| Comment block name (case insensitive)       | Tab ID          |
|--|-|
| general                        | general        |
| monitor                        | monitor        |
| keybindings                    | keybinds       |
| miscellaneous                  | miscellaneous  |
| programs                       | globals        |
| windows and workspaces         | win-rules      |
| autostart                      | autostart      |
| variables                      | envars         |
| permissions                    | permissions    |
| look and feel                  | looknfeel      |
| animations                     | animations     |
| input                          | input          |
| debug                          | debug          |

> Use this convention consistently to ensure each comment appears in the correct tab while your config keys remain auto-sorted.



## A Personal Note

Please note that this is my first publicly announced project, so be kind and help me improve it! Start discussions if you want to chat with me about it.  
I’m not a professional programmer, nor have I studied programming academically, but I’ve been slowly chipping away at this. 😄



### Notice on the use of AI

There is a use of AI in this project. I am not very familiar with modern conventions so I sometimes ask AI on what are available and what methods can be used. I however am not okay with "vibecoding" as I believe that won't get me further.

AI has also been used to diagnose issues in code particularly with CSS/SCSS cause believe it or not, it's 2025, I've started learning it in 2018 and I still forget how to center a div lol.

Use of AI in my opinion is fine if you use it as a helper/tool but don't make it generate your code. I won't accept pull requests if I suspect it is plainly AI.
