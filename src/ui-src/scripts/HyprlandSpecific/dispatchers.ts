export const dispatchers = [
  {
    dispatcher: "exec",
    description: "executes a shell command",
    params: "command (supports rules, see [below]({{< relref \"#executing-with-rules\" >}}))",
    text: "exec"
  },
  {
    dispatcher: "execr",
    description: "executes a raw shell command (does not support rules)",
    params: "command",
    text: "execr"
  },
  {
    dispatcher: "pass",
    description: "passes the key (with mods) to a specified window. Can be used as a workaround to global keybinds not working on Wayland.",
    params: "window",
    text: "pass"
  },
  {
    dispatcher: "sendshortcut",
    description: "sends specified keys (with mods) to an optionally specified window. Can be used like pass",
    params: "mod, key[, window]",
    text: "sendshortcut"
  },
  {
    dispatcher: "sendkeystate",
    description: "Send a key with specific state (down/repeat/up) to a specified window (window must keep focus for events to continue).",
    params: "mod, key, state, window",
    text: "sendkeystate"
  },
  {
    dispatcher: "killactive",
    description: "closes (not kills) the active window",
    params: "none",
    text: "killactive"
  },
  {
    dispatcher: "forcekillactive",
    description: "kills the active window",
    params: "none",
    text: "forcekillactive"
  },
  {
    dispatcher: "closewindow",
    description: "closes a specified window",
    params: "window",
    text: "closewindow"
  },
  {
    dispatcher: "killwindow",
    description: "kills a specified window",
    params: "window",
    text: "killwindow"
  },
  {
    dispatcher: "signal",
    description: "sends a signal to the active window",
    params: "signal",
    text: "signal"
  },
  {
    dispatcher: "signalwindow",
    description: "sends a signal to a specified window",
    params: "`window,signal`, e.g.`class:Alacritty,9`",
    text: "signalwindow"
  },
  {
    dispatcher: "workspace",
    description: "changes the workspace",
    params: "workspace",
    text: "workspace"
  },
  {
    dispatcher: "movetoworkspace",
    description: "moves the focused window to a workspace",
    params: "workspace OR `workspace,window` for a specific window",
    text: "movetoworkspace"
  },
  {
    dispatcher: "movetoworkspacesilent",
    description: "same as above, but doesn't switch to the workspace",
    params: "workspace OR `workspace,window` for a specific window",
    text: "movetoworkspacesilent"
  },
  {
    dispatcher: "togglefloating",
    description: "toggles the current window's floating state",
    params: "left empty / `active` for current, or `window` for a specific window",
    text: "togglefloating"
  },
  {
    dispatcher: "setfloating",
    description: "sets the current window's floating state to true",
    params: "left empty / `active` for current, or `window` for a specific window",
    text: "setfloating"
  },
  {
    dispatcher: "settiled",
    description: "sets the current window's floating state to false",
    params: "left empty / `active` for current, or `window` for a specific window",
    text: "settiled"
  },
  {
    dispatcher: "fullscreen",
    description: "sets the focused window's fullscreen mode",
    params: "`mode action`, where mode can be 0 - fullscreen (takes your entire screen) or 1 - maximize (keeps gaps and bar(s)), while action is optional and can be `toggle` (default), `set` or `unset`.",
    text: "fullscreen"
  },
  {
    dispatcher: "fullscreenstate",
    description: "sets the focused window's fullscreen mode and the one sent to the client",
    params: "`internal client action`, where internal (the hyprland window) and client (the application) can be `-1` - current, `0` - none, `1` - maximize, `2` - fullscreen, `3` - maximize and fullscreen. action is optional and can be `toggle` (default) or `set`.",
    text: "fullscreenstate"
  },
  {
    dispatcher: "dpms",
    description: "sets all monitors' DPMS status. Do not use with a keybind directly.",
    params: "`on`, `off`, or `toggle`. For specific monitor add monitor name after a space",
    text: "dpms"
  },
  {
    dispatcher: "forceidle",
    description: "sets elapsed time for all idle timers, ignoring idle inhibitors. Timers return to normal behavior upon the next activity. Do not use with a keybind directly.",
    params: "floatvalue (number of seconds)",
    text: "forceidle"
  },
  {
    dispatcher: "pin",
    description: "pins a window (i.e. show it on all workspaces) _note: floating only_",
    params: "left empty / `active` for current, or `window` for a specific window",
    text: "pin"
  },
  {
    dispatcher: "movefocus",
    description: "moves the focus in a direction",
    params: "direction",
    text: "movefocus"
  },
  {
    dispatcher: "movewindow",
    description: "moves the active window in a direction or to a monitor. For floating windows, moves the window to the screen edge in that direction",
    params: "direction or `mon:` and a monitor, optionally followed by a space and `silent` to prevent the focus from moving with the window",
    text: "movewindow"
  },
  {
    dispatcher: "swapwindow",
    description: "swaps the active window with another window in the given direction or with a specific window",
    params: "direction or `window`",
    text: "swapwindow"
  },
  {
    dispatcher: "centerwindow",
    description: "center the active window _note: floating only_",
    params: "none (for monitor center) or 1 (to respect monitor reserved area)",
    text: "centerwindow"
  },
  {
    dispatcher: "resizeactive",
    description: "resizes the active window",
    params: "resizeparams",
    text: "resizeactive"
  },
  {
    dispatcher: "moveactive",
    description: "moves the active window",
    params: "resizeparams",
    text: "moveactive"
  },
  {
    dispatcher: "resizewindowpixel",
    description: "resizes a selected window",
    params: "`resizeparams,window`, e.g. `100 100,^(kitty)$`",
    text: "resizewindowpixel"
  },
  {
    dispatcher: "movewindowpixel",
    description: "moves a selected window",
    params: "`resizeparams,window`",
    text: "movewindowpixel"
  },
  {
    dispatcher: "cyclenext",
    description: "focuses the next window (on a workspace, if `visible` is not provided)",
    params: "none (for next) or `prev` (for previous) additionally `tiled` for only tiled, `floating` for only floating. `prev tiled` is ok. `visible` for all monitors cycling. `visible prev floating` is ok. if `hist` arg provided - focus order will depends on focus history. All other modifiers is also working for it, `visible next floating hist` is ok.",
    text: "cyclenext"
  },
  {
    dispatcher: "swapnext",
    description: "swaps the focused window with the next window on a workspace",
    params: "none (for next) or `prev` (for previous)",
    text: "swapnext"
  },
  {
    dispatcher: "tagwindow",
    description: "apply tag to current or the first window matching",
    params: "`tag [window]`, e.g. `+code ^(foot)$`, `music`",
    text: "tagwindow"
  },
  {
    dispatcher: "focuswindow",
    description: "focuses the first window matching",
    params: "window",
    text: "focuswindow"
  },
  {
    dispatcher: "focusmonitor",
    description: "focuses a monitor",
    params: "monitor",
    text: "focusmonitor"
  },
  {
    dispatcher: "movecursortocorner",
    description: "moves the cursor to the corner of the active window",
    params: "direction, 0 - 3, bottom left - 0, bottom right - 1, top right - 2, top left - 3",
    text: "movecursortocorner"
  },
  {
    dispatcher: "movecursor",
    description: "moves the cursor to a specified position",
    params: "`x y`",
    text: "movecursor"
  },
  {
    dispatcher: "renameworkspace",
    description: "rename a workspace",
    params: "`id name`, e.g. `2 work`",
    text: "renameworkspace"
  },
  {
    dispatcher: "exit",
    description: "exits the compositor with no questions asked. It's recommended to use `hyprshutdown` instead of this.",
    params: "none",
    text: "exit"
  },
  {
    dispatcher: "forcerendererreload",
    description: "forces the renderer to reload all resources and outputs",
    params: "none",
    text: "forcerendererreload"
  },
  {
    dispatcher: "movecurrentworkspacetomonitor",
    description: "Moves the active workspace to a monitor",
    params: "monitor",
    text: "movecurrentworkspacetomonitor"
  },
  {
    dispatcher: "focusworkspaceoncurrentmonitor",
    description: "Focuses the requested workspace on the current monitor, swapping the current workspace to a different monitor if necessary. If you want XMonad/Qtile-style workspace switching, replace `workspace` in your config with this.",
    params: "workspace",
    text: "focusworkspaceoncurrentmonitor"
  },
  {
    dispatcher: "moveworkspacetomonitor",
    description: "Moves a workspace to a monitor",
    params: "workspace and a monitor separated by a space",
    text: "moveworkspacetomonitor"
  },
  {
    dispatcher: "swapactiveworkspaces",
    description: "Swaps the active workspaces between two monitors",
    params: "two monitors separated by a space",
    text: "swapactiveworkspaces"
  },
  {
    dispatcher: "bringactivetotop",
    description: "_Deprecated_ in favor of alterzorder. Brings the current window to the top of the stack",
    params: "none",
    text: "bringactivetotop"
  },
  {
    dispatcher: "alterzorder",
    description: "Modify the window stack order of the active or specified window. Note: this cannot be used to move a floating window behind a tiled one.",
    params: "zheight[,window]",
    text: "alterzorder"
  },
  {
    dispatcher: "togglespecialworkspace",
    description: "toggles a special workspace on/off",
    params: "none (for the first) or name for named (name has to be a special workspace's name)",
    text: "togglespecialworkspace"
  },
  {
    dispatcher: "focusurgentorlast",
    description: "Focuses the urgent window or the last window",
    params: "none",
    text: "focusurgentorlast"
  },
  {
    dispatcher: "togglegroup",
    description: "toggles the current active window into a group",
    params: "none",
    text: "togglegroup"
  },
  {
    dispatcher: "changegroupactive",
    description: "switches to the next window in a group.",
    params: "b - back, f - forward, or index start at 1",
    text: "changegroupactive"
  },
  {
    dispatcher: "focuscurrentorlast",
    description: "Switch focus from current to previously focused window",
    params: "none",
    text: "focuscurrentorlast"
  },
  {
    dispatcher: "lockgroups",
    description: "Locks the groups (all groups will not accept new windows)",
    params: "`lock` for locking, `unlock` for unlocking, `toggle` for toggle",
    text: "lockgroups"
  },
  {
    dispatcher: "lockactivegroup",
    description: "Lock the focused group (the current group will not accept new windows or be moved to other groups)",
    params: "`lock` for locking, `unlock` for unlocking, `toggle` for toggle",
    text: "lockactivegroup"
  },
  {
    dispatcher: "moveintogroup",
    description: "Moves the active window into a group in a specified direction. No-op if there is no group in the specified direction.",
    params: "direction",
    text: "moveintogroup"
  },
  {
    dispatcher: "moveoutofgroup",
    description: "Moves the active window out of a group. No-op if not in a group",
    params: "left empty / `active` for current, or `window` for a specific window",
    text: "moveoutofgroup"
  },
  {
    dispatcher: "movewindoworgroup",
    description: "Behaves as `moveintogroup` if there is a group in the given direction. Behaves as `moveoutofgroup` if there is no group in the given direction relative to the active group. Otherwise behaves like `movewindow`.",
    params: "direction",
    text: "movewindoworgroup"
  },
  {
    dispatcher: "movegroupwindow",
    description: "Swaps the active window with the next or previous in a group",
    params: "`b` for back, anything else for forward",
    text: "movegroupwindow"
  },
  {
    dispatcher: "denywindowfromgroup",
    description: "Prohibit the active window from becoming or being inserted into group",
    params: "`on`, `off` or, `toggle`",
    text: "denywindowfromgroup"
  },
  {
    dispatcher: "setignoregrouplock",
    description: "Temporarily enable or disable binds:ignore_group_lock",
    params: "`on`, `off`, or `toggle`",
    text: "setignoregrouplock"
  },
  {
    dispatcher: "global",
    description: "Executes a Global Shortcut using the GlobalShortcuts portal. See [here](../Binds/#global-keybinds)",
    params: "name",
    text: "global"
  },
  {
    dispatcher: "submap",
    description: "Change the current mapping group. See [Submaps](../Binds/#submaps)",
    params: "`reset` or name",
    text: "submap"
  },
  {
    dispatcher: "event",
    description: "Emits a custom event to socket2 in the form of `custom>>yourdata`",
    params: "the data to send",
    text: "event"
  },
  {
    dispatcher: "setprop",
    description: "Sets a window property",
    params: "`window property value`",
    text: "setprop"
  },
  {
    dispatcher: "toggleswallow",
    description: "If a window is swallowed by the focused window, unswallows it. Execute again to swallow it back",
    params: "none",
    text: "toggleswallow"
  }
];
// Autogenerated from wiki v2026.03.23_1319_7a711bb using getdispatchers.py