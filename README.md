# HyprSettings

HyprSettings: a configurator for `hyprland.conf` that very loyally reconstructs your configs exactly(almost*) as you wrote them, including comments. It presents everything in an organized UI that is also keyboard navigable. Themable, too!

Made with Python, web technologies via PyWebviewGTK, vanilla JS, and some JS libraries.

<img width="1915" height="1046" alt="image" src="https://github.com/user-attachments/assets/ec4d850b-244f-40bc-a92a-5dc7909618d3" />

Hyprsettings in Everforest builtin theme by @ritualcasts


> New Feature: Globbing Support 🎉  
> Globbing of `source` files has arrived! All allowed Hyprland formats, including `~/` expansion and glob patterns like `/*`, now work.  
> Any files you include with lines like `source = path/to/other.conf` (including `~/...` and globbed paths) are automatically discovered and shown or merged in the UI. Multi file Hyprland setups are now first class in HyprSettings.

> Looking for Contributors 🙌  
> I'd love help with: autocomplete color selectors, gradient selectors, a floating sidebar for Hyprland documentation, and other minor improvements. Open a discussion or issue if you're interested!

> [!IMPORTANT]
> This is in alpha state.

You can fork this repo, make changes, and submit pull requests. Please also submit bugs, start discussions, etc. I'd love to hear from you!

## Features

- Faithful `hyprland.conf` configurator that reconstructs your config exactly as written
- Preserves comments and their positions
- Organized UI with logical tabs for easier navigation
- Keyboard navigable controls throughout the UI
- Multi file configs supported with `source` discovery, `~/` expansion, and globbing
- Theming support

## Table of Contents

- [HyprSettings](#hyprsettings)
  - [Features](#features)
  - [Installation](#installation)
    - [Quick Clone and Venv Setup](#quick-clone-and-venv-setup)
    - [NixOS Installation](#nixos-installation)
    - [Arch Linux (AUR Package)](#arch-linux-aur-package)
    - [Legacy Manual Arch Installation (Deprecated)](#legacy-manual-arch-installation-deprecated)
  - [Testing the UI](#testing-the-ui)
  - [Configuration and Theming](#configuration-and-theming)
  - [Organizing Comments into Tabs](#organizing-comments-into-tabs)
  - [Contributing](#contributing)
  - [A Personal Note](#a-personal-note)
    - [Notice on the use of AI](#notice-on-the-use-of-ai)

## Installation

### Quick Clone and Venv Setup

Run the following in a shell to clone, create a virtual environment, install Python dependencies, and start the UI.

```bash
git clone https://github.com/acropolis914/hyprsettings
cd hyprsettings
python -m venv .venv
. .venv/bin/activate
python -m pip install -U pip setuptools wheel
python -m pip install tomlkit rich pywebview
python src/ui.py
```

### NixOS Installation
(courtesy of @wiktormalyska)

For NixOS users, this repository includes full Nix packaging support with both flakes and traditional Nix.

See [NIX_INSTALLATION.md](NIX_INSTALLATION.md) for detailed installation instructions including:
- Installation with Nix flakes
- Traditional Nix installation
- Home Manager integration
- NixOS module usage

Quick start with flakes:
```bash
nix run github.com/acropolis914/hyprsettings
```

### Arch Linux (AUR Package)

**HyprSettings is now available on Arch / AUR!**  
Install it with your helper of choice (example uses `yay`):

```bash
yay -S hyprsettings-git
```

Yay 🎉

After installation you can:
- Launch it from your application launcher (rofi, wofi, walker, fuzzel, etc.) by searching for “HyprSettings”.
- Run from terminal: `hyprsettings`
- (Optional) Add a Hyprland keybind:
  ```
  bind = SUPER, I, Exec, hyprsettings
  ```

### Legacy Manual Arch Installation (Deprecated)

~~For Arch users, you can run the following single block to install dependencies and add a keybind to your Hyprland configuration:~~

```bash
~~sudo pacman -Syu python python-gobject gtk3 python-pywebview python-tomlkit python-rich
git clone https://github.com/acropolis914/hyprsettings ~/hyprsettings
echo 'bind = SUPER, I, Exec, python ~/hyprsettings/src/ui.py' >> ~/.config/hypr/hyprland.conf~~
```

> The above manual method is deprecated. Use the AUR package instead unless you are hacking locally.

## Testing the UI

If you are developing locally instead of using the AUR package:

1. Clone the repo:

```bash
git clone https://github.com/acropolis914/hyprsettings
cd hyprsettings
```

2. Install required system packages (make a venv if you want):

```bash
sudo pacman -Syu python python-gobject gtk3 python-pywebview python-tomlkit python-rich
```

3. Run the UI:

```bash
python src/ui.py
```

> Make sure to replace `SUPER, I` with the key combination you want to use if you still bind manually.

## Configuration and Theming

Hyprsettings will create a configuration file at:

```
~/.config/hypr/hyprsettings.toml
```

Theming works perfectly out of the box. The defaults should be fine, but if you like tweaking, you can explore and modify the file. Be careful, though I do not have extensive safeguards and fallbacks right now.

## Organizing Comments into Tabs

> [!NOTE]
> Config keys are auto-sorted regardless of where they appear in your configuration files. The convention below only applies to comments and determines which tab they appear under in the UI.  
> With globbing and multi source parsing, all allowed `source =` formats are supported (absolute paths, `~/` expansion, and glob patterns like `/*`). All included files are scanned.

To make comments appear under the correct tab in Hyprsettings, use a three line comment block before the section it applies to in your configuration files. The format is flexible but must follow these rules:

```
####...       (four or more `#` characters)
### NAME ###  (middle line contains `### ` anywhere)
####...       (four or more `#` characters)
```

- The middle line is checked using `includes("### ")`, so as long as it contains three consecutive `#` symbols, it will be recognized.  
- Section names are not case sensitive.  
- The top and bottom lines must have at least four `#` characters; extra `#` are allowed.  
- Place the comment block immediately before the section it describes for proper mapping in the UI.

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

## Contributing

I'm actively looking for contributors. Help wanted with:
- Autocomplete color selectors
- Gradient selectors or pickers
- Floating sidebar for Hyprland documentation
- Minor UI or UX improvements and polish
- Accessibility and small quality of life tweaks
- Packaging for more distros
- Basic automated tests (parsing and UI sanity)

How to get started:
1. Pick or open an issue or discussion.
2. Hack in a branch.
3. Keep PRs focused and small if possible.
4. Describe changes clearly (screenshots for UI tweaks help).

No experience requirements. Beginners welcome.

## A Personal Note

Please note that this is my first publicly announced project, so be kind and help me improve it! Start discussions if you want to chat with me about it.  
I'm not a professional programmer, nor have I studied programming academically, but I've been slowly chipping away at this. 😄

### Notice on the use of AI

There is a use of AI in this project. I am not very familiar with modern conventions so I sometimes ask AI about what is available and what methods can be used. I am not okay with "vibecoding" as I believe that will not get me further.

AI has also been used to diagnose issues in code, particularly with CSS or SCSS. Believe it or not, it's 2025, I started learning it in 2018 and I still forget how to center a div lol.

Use of AI in my opinion is fine if you use it as a helper or tool, but do not make it generate your code. I will not accept pull requests if I suspect it is plainly AI.
