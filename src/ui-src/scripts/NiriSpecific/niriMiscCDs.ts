import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

export const NiriMiscCDs: ConfigDescription[] = [
	// --- Startup Execution ---
	{ name: 'spawn-at-startup', path: '', type: 'CONFIG_OPTION_STRING_LONG', data: '', description: 'Run a program directly at startup.' },
	{
		name: 'spawn-sh-at-startup',
		path: '',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '',
		description: 'Run a command through sh at startup.',
	},

	// --- Global Toggles ---
	{ name: 'prefer-no-csd', path: '', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Ask clients to omit Client-Side Decorations.' },
	{
		name: 'screenshot-path',
		path: '',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '~/Pictures/Screenshots/Screenshot from %Y-%m-%d %H-%M-%S.png',
		description: 'Format string for saving screenshots.',
	},

	// --- Environment Variables ---
	{ name: 'environment', path: '', type: 'GROUP', data: '', description: 'Set session environment variables.' },
	{ name: 'off', path: 'environment', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable the environment block.' },

	// --- Cursor Settings ---
	{ name: 'cursor', path: '', type: 'GROUP', data: '', description: 'Appearance and behavior of the mouse cursor.' },
	{ name: 'off', path: 'cursor', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable custom cursor configuration.' },
	{
		name: 'xcursor-theme',
		path: 'cursor',
		type: 'CONFIG_OPTION_STRING_SHORT',
		data: 'breeze_cursors',
		description: 'The XCursor theme to use.',
	},
	{ name: 'xcursor-size', path: 'cursor', type: 'CONFIG_OPTION_INT', data: '24, 8, 128', description: 'Cursor size in pixels.' },
	{ name: 'hide-when-typing', path: 'cursor', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Hide the cursor when typing.' },
	{
		name: 'hide-after-inactive-ms',
		path: 'cursor',
		type: 'CONFIG_OPTION_INT',
		data: '1000, 0, 10000',
		description: 'Hide cursor after a period of inactivity.',
	},

	// --- Overview ---
	{ name: 'overview', path: '', type: 'GROUP', data: '', description: 'Settings for the workspace overview.' },
	{ name: 'off', path: 'overview', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable the overview block.' },
	{ name: 'zoom', path: 'overview', type: 'CONFIG_OPTION_FLOAT', data: '0.5, 0.1, 1.0', description: 'Overview zoom level.' },
	{
		name: 'backdrop-color',
		path: 'overview',
		type: 'CONFIG_OPTION_COLOR',
		data: '262626',
		description: 'Background color for the overview.',
	},

	// --- Overview: Workspace Shadow ---
	{ name: 'workspace-shadow', path: 'overview', type: 'GROUP', data: '', description: 'Visual shadow for workspaces in overview.' },
	{
		name: 'off',
		path: 'overview:workspace-shadow',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Disable overview workspace shadows.',
	},
	{
		name: 'softness',
		path: 'overview:workspace-shadow',
		type: 'CONFIG_OPTION_INT',
		data: '40, 0, 100',
		description: 'Shadow blur strength.',
	},
	{ name: 'spread', path: 'overview:workspace-shadow', type: 'CONFIG_OPTION_INT', data: '10, 0, 50', description: 'Shadow expansion.' },
	{
		name: 'offset',
		path: 'overview:workspace-shadow',
		type: 'CONFIG_OPTION_VECTOR',
		data: '{0, 10}, {-100, -100}, {100, 100}',
		description: 'Shadow X and Y offset.',
	},
	{
		name: 'color',
		path: 'overview:workspace-shadow',
		type: 'CONFIG_OPTION_COLOR',
		data: '00000050',
		description: 'Shadow color and alpha.',
	},

	// --- XWayland Satellite ---
	{ name: 'xwayland-satellite', path: '', type: 'GROUP', data: '', description: 'Configuration for xwayland-satellite.' },
	{ name: 'off', path: 'xwayland-satellite', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable xwayland-satellite.' },
	{
		name: 'path',
		path: 'xwayland-satellite',
		type: 'CONFIG_OPTION_STRING_SHORT',
		data: 'xwayland-satellite',
		description: 'Path to the xwayland-satellite binary.',
	},

	// --- Clipboard ---
	{ name: 'clipboard', path: '', type: 'GROUP', data: '', description: 'Clipboard behavior settings.' },
	{ name: 'off', path: 'clipboard', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable the clipboard block.' },
	{ name: 'disable-primary', path: 'clipboard', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable middle-click paste.' },

	// --- Hotkey Overlay ---
	{ name: 'hotkey-overlay', path: '', type: 'GROUP', data: '', description: 'The help dialog settings.' },
	{ name: 'off', path: 'hotkey-overlay', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable the hotkey overlay.' },
	{ name: 'skip-at-startup', path: 'hotkey-overlay', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Do not show on startup.' },
	{
		name: 'hide-not-bound',
		path: 'hotkey-overlay',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Hide default hotkeys that have been unbound.',
	},

	// --- Config Notification ---
	{ name: 'config-notification', path: '', type: 'GROUP', data: '', description: 'Config reload notifications.' },
	{ name: 'off', path: 'config-notification', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable config notifications.' },
	{
		name: 'disable-failed',
		path: 'config-notification',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Do not show notifications when config reloading fails.',
	},

	// --- Window Blur ---
	{ name: 'blur', path: '', type: 'GROUP', data: '', description: 'Experimental window background blur settings.' },
	{ name: 'off', path: 'blur', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable background blur.' },
	{ name: 'passes', path: 'blur', type: 'CONFIG_OPTION_INT', data: '3, 1, 10', description: 'Number of blur iterations.' },
	{ name: 'offset', path: 'blur', type: 'CONFIG_OPTION_FLOAT', data: '3.0, 1.0, 10.0', description: 'Blur radius offset.' },
	{ name: 'noise', path: 'blur', type: 'CONFIG_OPTION_FLOAT', data: '0.02, 0.0, 1.0', description: 'Dithering noise level.' },
	{ name: 'saturation', path: 'blur', type: 'CONFIG_OPTION_FLOAT', data: '1.5, 0.0, 5.0', description: 'Color saturation boost.' },
]
