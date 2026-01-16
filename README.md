<img width="1568" height="792" alt="image" src="https://github.com/user-attachments/assets/25ffb079-0dfc-4445-b7c1-20609f4b26de" />

<h1 align="center" red>
<pre>
╻ ╻╻ ╻┏━┓┏━┓┏━┓┏━╸╺┳╸╺┳╸╻┏┓╻┏━╸┏━┓
✨   ┣━┫┗┳┛┣━┛┣┳┛┗━┓┣╸  ┃  ┃ ┃┃┗┫┃╺┓┗━┓   ✨
╹ ╹ ╹ ╹  ╹┗╸┗━┛┗━╸ ╹  ╹ ╹╹ ╹┗━┛┗━┛
💧 HyprSettings : your loyal `hyprland.conf` editor!
</pre>
</h1>

Install now!
```
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.sh | sh -s -- --auto
```

## ✨ Features

- Faithful `hyprland.conf` configurator that reconstructs your config exactly* as written
- Preserves comments* and their positions
- Organized UI with logical tabs for easier navigation
- Keyboard navigable controls throughout the UI
- Multi file configs supported with `source` discovery, `~/` expansion, '$variable' support , and globbing
- Color Picker, gradient editor, bezier editor
- Dynamic resizing
- Theming support

<img width="1444" height="442" alt="image" src="https://github.com/user-attachments/assets/135d9cc6-9f9e-4ffc-bcd3-b3895f4da25a" />

  
HyprSettings: a configurator for `hyprland.conf` that very loyally reconstructs your configs exactly(almost*) as you
wrote them, including comments. It presents everything in an organized UI that is also keyboard navigable. Themable,
too!
Made with Python, web technologies via PyWebviewGTK, vanilla JS, and some JS libraries.
<br>
`*The cleanup however has a side effect that trims trailing spaces. This is by design.`
<img width="1434" height="394" alt="image" src="https://github.com/user-attachments/assets/8b9c7c35-4d55-4b98-bf7f-71cb256b4ee5" />

## Table of Contents

- [HyprSettings](#hyprsettings)
    - [Features](#features)
    - [Installation](#installation)
        - [Quick Clone and Install](#quick-clone-and-install-recommended-for-local-use)
        - [NixOS Installation](#nixos-installation)
        - [Arch Linux (AUR Package)](#arch-linux-aur-package)
    - [Testing the UI (Development)](#testing-the-ui-development)
    - [Configuration and Theming](#configuration-and-theming)
    - [Autostart and Daemon Mode](#autostart-and-daemon-mode)
    - [Organizing Comments into Tabs](#organizing-comments-into-tabs)
    - [Contributing](#contributing)
    - [A Personal Note](#a-personal-note)
        - [Notice on the use of AI](#notice-on-the-use-of-ai)


## 📥 Installation

### Quick Clone and Install (Recommended for local use)
> For Arch and Nix users, please scroll a bit further. They are available as packages for those systems already.

The included installer script (`hyprsettings.sh`) handles cloning the repo, setting up a contained Python virtual
environment (`.venv`), installing dependencies, and creating the necessary launcher links (`~/.local/bin/hyprsettings`).

**Run the interactive installer directly:**

````bash
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.sh | sh
`````

###### To install without an interactive prompt (useful for automation):

Installs to ~/.local/share/hyprsettings

```bash
curl -sL https://github.com/acropolis914/hyprsettings/raw/master/hyprsettings.sh | sh -s -- --auto
```

> **Notice for Users of older versions (\< 0.6.2):**
>
> The installation mechanism now uses a **containerized virtual environment (`.venv`)** within the application directory
> for dependency management, instead of installing directly to your system's global Python (`pip`). This significantly
> improves stability and reduces conflicts.
>
> If you have a cloned repository, please use `sh hyprsettings.sh` to install and run `sh run.sh` instead of manually
> calling
`python src/ui.py`.

### NixOS Installation

For NixOS users, this repository includes full Nix packaging support with both flakes and traditional Nix.

See [NIX\_INSTALLATION.md](https://www.google.com/search?q=NIX_INSTALLATION.md) for detailed installation instructions.

#### Try without installing

```bash
nix run github:acropolis914/hyprsettings
```

#### Install to user profile

```bash
nix profile add github:acropolis914/hyprsettings
```

### Arch Linux (AUR Package)

**HyprSettings is now available on Arch / AUR\!** Install it with your helper of choice (example uses `yay`):

```bash
yay -S hyprsettings-git
```
After installation you can:

- Launch it from your application launcher (rofi, wofi, walker, fuzzel, etc.) by searching for “HyprSettings”.
- Run from terminal: `hyprsettings`
- (Optional) Add a Hyprland keybind:
  ```
  bind = SUPER, I, Exec, hyprsettings
  ```
- (Optional) Autostart in background. (Wont work if GPU Only setup)
  Add to your hyprland config:
  ```hyprland.conf
    exec-once = hyprsettings -d -H
  ```

## 🎨 Configuration and Theming

Hyprsettings will create a configuration file at:

```
~/.config/hypr/hyprsettings.toml
```

Theming works perfectly out of the box. The defaults should be fine, but if you like tweaking, you can explore and
modify the file. Be careful, though I do not have extensive safeguards and fallbacks right now.

## 👻 Autostart and Daemon mode
> This will not work when you are on an nvidia only setting for your gpu. You have to have Integrated GPU too as GTK3
> doesn't work well with NVIDIA only setups. Can't test with AMD. I dont have AMD.

You can start hyprsettings with the `-d` argument to make it persist in the background. On closing, it will not actually close but instead hide it, and on calling it again, it will show the window again on your current ui, making it launch faster. It being a webview tho, will consume around 320mb. Fine if you have unlimited memory but not recommended for people with 8gb or less ram.

You can also start it with `-H` (capital H)  or `--hidden` together with `-d` or `--daemon` on the hyprland.conf autostart section so it starts hidden and in daemon mode so the next time you need it, it's already started and will immediately show up.

For example in your `hyprland.conf` :
```hyprland.conf
exec-once = hyprsettings -d -H
```
> Please note the capital H.

## 🗂️ Organizing Comments into Tabs

> [\!NOTE]
> Config keys are auto-sorted regardless of where they appear in your configuration files. The convention below only
> applies to comments and determines which tab they appear under in the UI.  
> With globbing and multi source parsing, all allowed `source =` formats are supported (absolute paths, `~/` expansion,
> and glob patterns like `/*`). All included files are scanned.

To make comments appear under the correct tab in Hyprsettings, use a three line comment block before the section it
applies to in your configuration files. The format is flexible but must follow these rules:

```
####...       (four or more `#` characters)
### NAME ###  (middle line contains `### ` anywhere)
####...       (four or more `#` characters)
```

- The middle line is checked using `includes("### ")`, so as long as it contains three consecutive `#` symbols, it will
  be recognized.
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

| Comment block name (case insensitive) | Tab ID        |
|---------------------------------------|---------------|
| general                               | general       |
| monitor                               | monitor       |
| keybindings                           | keybinds      |
| miscellaneous                         | miscellaneous |
| programs                              | globals       |
| windows and workspaces                | win-rules     |
| autostart                             | autostart     |
| variables                             | envars        |
| permissions                           | permissions   |
| look and feel                         | looknfeel     |
| animations                            | animations    |
| input                                 | input         |
| debug                                 | debug         |

> Use this convention consistently to ensure each comment appears in the correct tab while your config keys remain
> auto-sorted.

## Contributing

I'm actively looking for contributors. Help wanted with:

- Autocomplete color selectors
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

## ❄ Testing the UI (Development)

If you are developing locally instead of using the AUR package:

1. Clone the repo (if you haven't already):

<!-- end list -->

```bash
git clone https://github.com/acropolis914/hyprsettings
cd hyprsettings
```

2. Install required dependencies and create a virtual environment:

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -U pip setuptools wheel tomlkit rich pywebview packaging
```

3. Run the UI:

```bash
sh run.sh
```

> **Note:** If you are running tests or working, you should use the `nix develop` shell (if you use Nix) or the
> installer script (`sh hyprsettings.sh`) as your primary launch method.

---

## 💬 A Personal Note

Please note that this is my first publicly announced project, so be kind and help me improve it\! Start discussions if
you want to chat with me about it.  
I'm not a professional programmer, nor have I studied programming academically, but I've been slowly chipping away at
this. 😄

### Notice on the use of AI

There is a use of AI in this project. I am not very familiar with modern conventions so I sometimes ask AI about what is
available and what methods can be used. I am not okay with "vibecoding" as I believe that will not get me further.

AI has also been used to diagnose issues in code, particularly with CSS or SCSS. Believe it or not, it's 2025, I started
learning it in 2018 and I still forget how to center a div lol.

Use of AI in my opinion is fine if you use it as a helper or tool, but do not make it generate your code. I will not
accept pull requests if I suspect it is plainly AI.
