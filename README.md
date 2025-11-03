# Hyprsettings

Hyprsettings is a configurator for `hyprland.conf` (and its included files), built for people like me who don't like faffing around with configs.  
Made with Python and web technologies.

> [!IMPORTANT]
> This is in alpha state.

You can fork this repo, make changes, and submit pull requests. Please also submit bugs, start discussions, etc. I'd love to hear from you!

## Testing the UI

1. Clone the repo:

```bash
git clone https://github.com/acropolis914/hyprsettings
cd hyprsettings
```

2. Install required system packages:

```bash
sudo pacman -Syu python python-gobject gtk3
```

3. Run the UI:

```bash
python src/ui.py
```

## Arch Linux Installation (Dependencies + Hyprland bind)

For Arch users, you can run the following single block to install dependencies and add a keybind to your Hyprland configuration:

```bash
sudo pacman -Syu python python-gobject gtk3
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

## A Personal Note

Please note that this is my first publicly announced project, so be kind and help me improve it! Start discussions if you want to chat with me about it.  
I’m not a professional programmer, nor have I studied programming academically, but I’ve been slowly chipping away at this. 😄
