# language=TOML
default_config = """
[config]
first_run = true                    # DO NOT CHANGE
dryrun = false
compact = true
show_line_comments = true
show_header_comments = false
ctx_label_hidden = false
current_theme = "Catppuccin Mocha"
font = "CommitMono Nerd Font Propo"

[[theme]]
name = "Catppuccin Mocha"
author = "Catppuccin Org"
variant = "Dark"
description = "Soothing pastel theme for the high-strung."
link = "https://github.com/catppuccin/catppuccin"

# Surfaces
surface-0 = "#1e1e2e"
surface-1 = "#181825"
surface-2 = "#11111b"
surface-border = "#585b70"

# Text hierarchy
text-0 = "#cdd6f4"
text-1 = "#bac2de"
text-2 = "#a6adc8"
text-3 = "#9399b2"
text-4 = "#7f849c"
text-disabled = "#6c7086"
text-contrast = "#11111b"

# Accents
accent = "#89b4fa"
accent-hover = "#74c7ec"
accent-active = "#cba6f7"
accent-success = "#a6e3a1"
accent-warning = "#f9e2af"
accent-danger = "#f38ba8"

# Common colors
red = "#f38ba8"
orange = "#fab387"
yellow = "#f9e2af"
green = "#a6e3a1"
teal = "#94e2d5"
blue = "#89b4fa"
pink = "#f5c2e7"
purple = "#cba6f7"

# Utilities
overlay = "#7f849c"
shadow = "#6c7086"

[[theme]]
name = "Catppuccin Macchiato"
author = "Catppuccin"
variant = "Dark"
description = "Soothing pastel theme for the high-strung."
link = "https://github.com/catppuccin/catppuccin"

# Surfaces
surface-0 = "#24273a"
surface-1 = "#1e2030"
surface-2 = "#181926"
surface-border = "#6e738d"

# Text hierarchy
text-0 = "#cad3f5"
text-1 = "#b8c0e0"
text-2 = "#a5adce"
text-3 = "#919ab3"
text-4 = "#7e85a3"
text-disabled = "#6b7089"
text-contrast = "#181926"

# Accents
accent = "#8aadf4"
accent-hover = "#7dc4e4"
accent-active = "#c6a0f6"
accent-success = "#a6da95"
accent-warning = "#eed49f"
accent-danger = "#ed8796"

# Common colors
red = "#ed8796"
orange = "#f5a97f"
yellow = "#eed49f"
green = "#a6da95"
teal = "#8bd5ca"
blue = "#8aadf4"
pink = "#f5bde6"
purple = "#c6a0f6"

# Utilities
overlay = "#7e85a3"
shadow = "#6b7089"

[[theme]]
name = "Catppuccin Frappe"                                 #removed the accented e cause its harder to type lol
author = "Catppuccin"
variant = "Dark"
description = "Soothing pastel theme for the high-strung."
link = "https://github.com/catppuccin/catppuccin"

# Surfaces
surface-0 = "#303446"
surface-1 = "#292c3c"
surface-2 = "#232634"
surface-border = "#626880"

# Text hierarchy
text-0 = "#c6d0f5"
text-1 = "#b5bfe2"
text-2 = "#a5adce"
text-3 = "#949cbb"
text-4 = "#838ba7"
text-disabled = "#737994"
text-contrast = "#232634"

# Accents
accent = "#8caaee"
accent-hover = "#7dc4e4"
accent-active = "#ca9ee6"
accent-success = "#a6d189"
accent-warning = "#e5c890"
accent-danger = "#e78284"

# Common colors
red = "#e78284"
orange = "#ef9f76"
yellow = "#e5c890"
green = "#a6d189"
teal = "#81c8be"
blue = "#8caaee"
pink = "#f4b8e4"
purple = "#ca9ee6"

# Utilities
overlay = "#838ba7"
shadow = "#737994"

[[theme]]
name = "Catppuccin Latte"
author = "Catppuccin Org"
variant = "Light"
description = "Soothing pastel theme for the high-strung."
link = "https://github.com/catppuccin/catppuccin"

# Surfaces
surface-0 = "#eff1f5"
surface-1 = "#e6e9ef"
surface-2 = "#dce0e8"
surface-border = "#acb0be"

# Text hierarchy
text-0 = "#4c4f69"
text-1 = "#5c5f77"
text-2 = "#6c6f85"
text-3 = "#7c7f93"
text-4 = "#8c8fa1"
text-disabled = "#9ca0b0"
text-contrast = "#eff1f5"

# Accents
accent = "#1e66f5"
accent-hover = "#209fb5"
accent-active = "#8839ef"
accent-success = "#40a02b"
accent-warning = "#df8e1d"
accent-danger = "#d20f39"

# Common colors
red = "#d20f39"
orange = "#fe640b"
yellow = "#df8e1d"
green = "#40a02b"
teal = "#179299"
blue = "#1e66f5"
pink = "#ea76cb"
purple = "#8839ef"

# Utilities
overlay = "#8c8fa1"
shadow = "#e6e9ef"

[[theme]]
name = "Embark"
author = "Embark"
variant = "Dark"
description = "An ambitious theme for terminals, vim, and friends."
link = "https://embark-theme.github.io/"

# Surfaces
surface-0 = "#242231ff"    #Darkened it a bit for a less jarring look
surface-1 = "#1E1C31"
surface-2 = "#100E23"
surface-border = "#585273"

# Text hierarchy
text-0 = "#A6B3CC"
text-1 = "#A6B3CC"
text-2 = "#585273"
text-3 = "#3E3859"
text-4 = "#3E3859"
text-disabled = "#3E3859"
text-contrast = "#100E23"

# Accents
accent = "#57C7FF"
accent-hover = "#1DA0E2"
accent-active = "#C792EA"
accent-success = "#A1EFD3"
accent-warning = "#FFE9AA"
accent-danger = "#F0719B"

# Common colors
red = "#F0719B"
orange = "#FFB378"
yellow = "#FFE6B3"
green = "#A1EFD3"
teal = "#87DFEB"
blue = "#57C7FF"
pink = "#F0719B"
purple = "#C792EA"

# Utilities
overlay = "#2D2B40"
shadow = "#100E23"

"""
