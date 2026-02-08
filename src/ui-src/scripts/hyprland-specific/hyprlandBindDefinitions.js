export const bindFlags = [
	{
		value: '',
		text: 'None',
		description: 'If this is selected, none of the flags added will be added. Added here as default.',
	},
	{
		value: 'l',
		text: 'Locked',
		description: 'Will also work when an input inhibitor (e.g. a lockscreen) is active.',
	},
	{
		value: 'r',
		text: 'Release',
		description: 'Will trigger on release of a key.',
	},
	{
		value: 'c',
		text: 'Click',
		description: 'Will trigger on release of a key or button as long as the mouse cursor stays inside binds:drag_threshold.',
	},
	{
		value: 'g',
		text: 'Drag',
		description: 'Will trigger on release of a key or button as long as the mouse cursor moves outside binds:drag_threshold.',
	},
	{
		value: 'o',
		text: 'Long press',
		description: 'Will trigger on long press of a key.',
	},
	{
		value: 'e',
		text: 'Repeat',
		description: 'Will repeat when held.',
	},
	{
		value: 'n',
		text: 'Non-consuming',
		description: 'Key/mouse events will be passed to the active window in addition to triggering the dispatcher.',
	},
	{
		value: 'm',
		text: 'Mouse',
		description: 'See the dedicated Mouse Binds section.',
	},
	{
		value: 't',
		text: 'Transparent',
		description: 'Cannot be shadowed by other binds.',
	},
	{
		value: 'i',
		text: 'Ignore mods',
		description: 'Will ignore modifiers.',
	},
	{
		value: 's',
		text: 'Separate',
		description: 'Will arbitrarily combine keys between each mod/key, see Keysym combos.',
	},
	{
		value: 'd',
		text: 'Has description',
		description: 'Will allow you to write a description for your bind.',
	},
	{
		value: 'p',
		text: 'Bypass',
		description: 'Bypasses the app’s requests to inhibit keybinds.',
	},
]

export const modkeys = [
	{
		value: 'SHIFT',
		text: 'SHIFT',
		description: 'Shift key',
	},
	{
		value: 'CAPS',
		text: 'CAPS',
		description: 'Caps Lock key',
	},
	{
		value: 'CTRL',
		text: 'CTRL',
		description: 'Control key (CTRL/CONTROL)',
	},
	{
		value: 'ALT',
		text: 'ALT',
		description: 'Alt or Option key',
	},
	{
		value: 'MOD2',
		text: 'MOD2',
		description: 'Secondary modifier (system-dependent)',
	},
	{
		value: 'MOD3',
		text: 'MOD3',
		description: 'Tertiary modifier (system-dependent)',
	},
	{
		value: 'SUPER',
		text: 'SUPER',
		description: 'Windows / Logo / MOD4 key',
	},
	{
		value: 'MOD5',
		text: 'MOD5',
		description: 'Additional modifier (system-dependent)',
	},
]

export const dispatchers = [
	{
		value: 'exec',
		text: 'Exec',
		description: 'Executes a shell command (supports rules).',
	},
	{
		value: 'execr',
		text: 'Execr',
		description: 'Executes a raw shell command (does not support rules).',
	},
	{
		value: 'pass',
		text: 'Pass',
		description: 'Passes the key (with mods) to a specified window.',
	},
	{
		value: 'sendshortcut',
		text: 'Sendshortcut',
		description: 'Sends specified keys (with mods) to an optionally specified window.',
	},
	{
		value: 'sendkeystate',
		text: 'Sendkeystate',
		description: 'Send a key with specific state (down/repeat/up) to a specified window.',
	},
	{
		value: 'killactive',
		text: 'Killactive',
		description: 'Closes (not kills) the active window.',
	},
	{
		value: 'forcekillactive',
		text: 'Forcekillactive',
		description: 'Kills the active window.',
	},
	{
		value: 'closewindow',
		text: 'Closewindow',
		description: 'Closes a specified window.',
	},
	{
		value: 'killwindow',
		text: 'Killwindow',
		description: 'Kills a specified window.',
	},
	{
		value: 'signal',
		text: 'Signal',
		description: 'Sends a signal to the active window.',
	},
	{
		value: 'signalwindow',
		text: 'Signalwindow',
		description: 'Sends a signal to a specified window.',
	},
	{
		value: 'workspace',
		text: 'Workspace',
		description: 'Changes the workspace.',
	},
	{
		value: 'movetoworkspace',
		text: 'Movetoworkspace',
		description: 'Moves the focused window to a workspace.',
	},
	{
		value: 'movetoworkspacesilent',
		text: 'Movetoworkspacesilent',
		description: 'Moves window to a workspace without switching view.',
	},
	{
		value: 'togglefloating',
		text: 'Togglefloating',
		description: 'Toggles the current window’s floating state.',
	},
	{
		value: 'setfloating',
		text: 'Setfloating',
		description: 'Sets the current window’s floating state to true.',
	},
	{
		value: 'settiled',
		text: 'Settiled',
		description: 'Sets the current window’s floating state to false.',
	},
	{
		value: 'fullscreen',
		text: 'Fullscreen',
		description: 'Sets the focused window’s fullscreen mode.',
	},
	{
		value: 'fullscreenstate',
		text: 'Fullscreenstate',
		description: 'Sets the focused window’s fullscreen state and the one sent to the client.',
	},
	{
		value: 'dpms',
		text: 'Dpms',
		description: 'Sets all monitors’ DPMS status (on/off/toggle).',
	},
	{
		value: 'forceidle',
		text: 'Forceidle',
		description: 'Sets elapsed time for all idle timers, ignoring idle inhibitors.',
	},
	{
		value: 'pin',
		text: 'Pin',
		description: 'Pins a window (shows it on all workspaces).',
	},
	{
		value: 'movefocus',
		text: 'Movefocus',
		description: 'Moves the focus in a direction.',
	},
	{
		value: 'movewindow',
		text: 'Movewindow',
		description: 'Moves the active window in a direction or to a monitor.',
	},
	{
		value: 'swapwindow',
		text: 'Swapwindow',
		description: 'Swaps the active window with another window in the given direction or with a specific window.',
	},
	{
		value: 'centerwindow',
		text: 'Centerwindow',
		description: 'Centers the active window (floating only).',
	},
	{
		value: 'resizeactive',
		text: 'Resizeactive',
		description: 'Resizes the active window.',
	},
	{
		value: 'moveactive',
		text: 'Moveactive',
		description: 'Moves the active window by resize params.',
	},
	{
		value: 'resizewindowpixel',
		text: 'Resizewindowpixel',
		description: 'Resizes a selected window with pixel/resolution params.',
	},
	{
		value: 'movewindowpixel',
		text: 'Movewindowpixel',
		description: 'Moves a selected window by pixel offset.',
	},
	{
		value: 'cyclenext',
		text: 'Cyclenext',
		description: 'Focuses the next window (on a workspace) optionally filtered.',
	},
	{
		value: 'swapnext',
		text: 'Swapnext',
		description: 'Swaps the focused window with the next window on a workspace.',
	},
	{
		value: 'tagwindow',
		text: 'Tagwindow',
		description: 'Apply tag to current or first window matching.',
	},
	{
		value: 'focuswindow',
		text: 'Focuswindow',
		description: 'Focuses the first window matching.',
	},
	{
		value: 'focusmonitor',
		text: 'Focusmonitor',
		description: 'Focuses a monitor.',
	},
	{
		value: 'splitratio',
		text: 'Splitratio',
		description: 'Changes the split ratio of the layout.',
	},
	{
		value: 'movecursortocorner',
		text: 'Movecursortocorner',
		description: 'Moves the cursor to a corner of the active window.',
	},
	{
		value: 'movecursor',
		text: 'Movecursor',
		description: 'Moves the cursor to a specified position.',
	},
	{
		value: 'renameworkspace',
		text: 'Renameworkspace',
		description: 'Rename a workspace.',
	},
	{
		value: 'exit',
		text: 'Exit',
		description: 'Exits the compositor with no questions asked.',
	},
	{
		value: 'forcerendererreload',
		text: 'Forcerendererreload',
		description: 'Forces the renderer to reload all resources and outputs.',
	},
	{
		value: 'movecurrentworkspacetomonitor',
		text: 'Movecurrentworkspacetomonitor',
		description: 'Moves the active workspace to a monitor.',
	},
	{
		value: 'focusworkspaceoncurrentmonitor',
		text: 'Focusworkspaceoncurrentmonitor',
		description: 'Focuses the requested workspace on the current monitor.',
	},
	{
		value: 'moveworkspacetomonitor',
		text: 'Moveworkspacetomonitor',
		description: 'Moves a workspace to a monitor.',
	},
	{
		value: 'swapactiveworkspaces',
		text: 'Swapactiveworkspaces',
		description: 'Swaps the active workspaces between two monitors.',
	},
	{
		value: 'bringactivetotop',
		text: 'Bringactivetotop',
		description: 'Brings the current window to the top of the stack (deprecated).',
	},
	{
		value: 'alterzorder',
		text: 'Alterzorder',
		description: 'Modify the window stack order of the active or specified window (zheight[,window]).',
	},
	{
		value: 'togglespecialworkspace',
		text: 'Togglespecialworkspace',
		description: 'Toggles a special workspace on/off.',
	},
	{
		value: 'focusurgentorlast',
		text: 'Focusurgentorlast',
		description: 'Focuses the urgent window or the last window.',
	},
	{
		value: 'togglegroup',
		text: 'Togglegroup',
		description: 'Toggles the current active window into a group.',
	},
	{
		value: 'changegroupactive',
		text: 'Changegroupactive',
		description: 'Switches to the next window in a group.',
	},
	{
		value: 'focuscurrentorlast',
		text: 'Focuscurrentorlast',
		description: 'Switch focus from current to previously focused window.',
	},
	{
		value: 'lockgroups',
		text: 'Lockgroups',
		description: 'Locks the groups (prevents new windows entering groups).',
	},
	{
		value: 'lockactivegroup',
		text: 'Lockactivegroup',
		description: 'Lock the focused group.',
	},
	{
		value: 'moveintogroup',
		text: 'Moveintogroup',
		description: 'Moves the active window into a group in a specified direction.',
	},
	{
		value: 'moveoutofgroup',
		text: 'Moveoutofgroup',
		description: 'Moves the active window out of a group.',
	},
	{
		value: 'movewindoworgroup',
		text: 'Movewindoworgroup',
		description: 'Behaves as moveintogroup or moveoutofgroup relative to groups.',
	},
	{
		value: 'denywindowfromgroup',
		text: 'Denywindowfromgroup',
		description: 'Prohibits the active window from being added to/entering a group.',
	},
	{
		value: 'setignoregrouplock',
		text: 'Setignoregrouplock',
		description: 'Temporarily enable/disable binds:ignore_group_lock.',
	},
]

export const dispatcherParams = {
	exec: [
		{
			value: 'command',
			text: 'Command',
			description: 'Shell command to execute',
		},
	],
	workspace: [
		{
			value: 'number',
			text: 'Workspace Number',
			description: 'Target workspace index',
		},
		{
			value: 'name',
			text: 'Workspace Name',
			description: 'Target workspace by name',
		},
	],
	movetoworkspace: [
		{
			value: 'number',
			text: 'Workspace Number',
			description: 'Move active window to workspace',
		},
	],
	fullscreen: [
		{
			value: 'toggle',
			text: 'Toggle',
			description: 'Toggle fullscreen state',
		},
		{ value: 'on', text: 'On', description: 'Enable fullscreen' },
		{ value: 'off', text: 'Off', description: 'Disable fullscreen' },
	],
	setfloating: [
		{ value: '1', text: 'Enable Floating' },
		{ value: '0', text: 'Disable Floating' },
	],
	resizeactive: [
		{
			value: 'width,height',
			text: 'Resize By (px)',
			description: 'Resize by pixel delta',
		},
	],
	movefocus: [
		{ value: 'l', text: 'Left' },
		{ value: 'r', text: 'Right' },
		{ value: 'u', text: 'Up' },
		{ value: 'd', text: 'Down' },
	],
}

export const noneDispatchers = [
	'killactive',
	'forcekillactive',
	'centerwindow',
	'exit',
	'forcerendererreload',
	'bringactivetotop',
	'focusurgentorlast',
	'togglegroup',
	'focuscurrentorlast',
	'toggleswallow',
]
