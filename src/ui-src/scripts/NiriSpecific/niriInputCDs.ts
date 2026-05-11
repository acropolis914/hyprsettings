import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

export const NiriInputCDs: ConfigDescription[] = [
	// --- General Input Settings ---
	{ name: 'off', path: 'input', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable all input handling in niri.' },
	{
		name: 'disable-power-key-handling',
		path: 'input',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Prevents niri from handling the power button.',
	},
	{
		name: 'warp-mouse-to-focus',
		path: 'input',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Warps the mouse to newly focused windows.',
	},
	{
		name: 'focus-follows-mouse',
		path: 'input',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Focuses windows automatically when moving the mouse over them.',
	},
	{
		name: 'workspace-auto-back-and-forth',
		path: 'input',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Switching to the current workspace index twice switches back to previous.',
	},
	{
		name: 'mod-key',
		path: 'input',
		type: 'CONFIG_OPTION_CHOICE',
		data: '0, "Super,Alt,Ctrl,Shift,Mod3,Mod5"',
		description: 'The main modifier key for niri binds.',
	},

	// --- Keyboard ---
	{ name: 'keyboard', path: 'input', type: 'GROUP', data: '', description: 'Global keyboard settings.' },
	{ name: 'off', path: 'input:keyboard', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable all keyboard input.' },
	{ name: 'numlock', path: 'input:keyboard', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Turn on Num Lock at startup.' },
	{
		name: 'repeat-delay',
		path: 'input:keyboard',
		type: 'CONFIG_OPTION_INT',
		data: '600, 100, 2000',
		description: 'Delay in ms before repeat starts.',
	},
	{
		name: 'repeat-rate',
		path: 'input:keyboard',
		type: 'CONFIG_OPTION_INT',
		data: '25, 1, 100',
		description: 'Characters per second for repeat.',
	},

	// --- Keyboard: XKB ---
	{ name: 'xkb', path: 'input:keyboard', type: 'GROUP', data: '', description: 'XKB layout configuration.' },
	{
		name: 'off',
		path: 'input:keyboard:xkb',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Disable XKB configuration (fallback to system defaults).',
	},
	{
		name: 'layout',
		path: 'input:keyboard:xkb',
		type: 'CONFIG_OPTION_STRING_SHORT',
		data: 'us',
		description: 'XKB layout (e.g., "us,ru").',
	},
	{ name: 'variant', path: 'input:keyboard:xkb', type: 'CONFIG_OPTION_STRING_SHORT', data: '', description: 'XKB variant.' },

	// --- Touchpad ---
	{ name: 'touchpad', path: 'input', type: 'GROUP', data: '', description: 'Touchpad device settings.' },
	{ name: 'off', path: 'input:touchpad', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable touchpad input.' },
	{ name: 'tap', path: 'input:touchpad', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Enable tap-to-click.' },
	{ name: 'natural-scroll', path: 'input:touchpad', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Invert scrolling direction.' },
	{
		name: 'accel-speed',
		path: 'input:touchpad',
		type: 'CONFIG_OPTION_FLOAT',
		data: '0.0, -1.0, 1.0',
		description: 'Pointer acceleration speed.',
	},

	// --- Mouse ---
	{ name: 'mouse', path: 'input', type: 'GROUP', data: '', description: 'Mouse device settings.' },
	{ name: 'off', path: 'input:mouse', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable mouse input.' },
	{ name: 'natural-scroll', path: 'input:mouse', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Invert scrolling direction.' },
	{
		name: 'accel-speed',
		path: 'input:mouse',
		type: 'CONFIG_OPTION_FLOAT',
		data: '0.0, -1.0, 1.0',
		description: 'Pointer acceleration speed.',
	},

	// --- Trackpoint ---
	{ name: 'trackpoint', path: 'input', type: 'GROUP', data: '', description: 'Trackpoint device settings.' },
	{ name: 'off', path: 'input:trackpoint', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable trackpoint input.' },
	{
		name: 'accel-speed',
		path: 'input:trackpoint',
		type: 'CONFIG_OPTION_FLOAT',
		data: '0.0, -1.0, 1.0',
		description: 'Pointer acceleration speed.',
	},

	// --- Trackball ---
	{ name: 'trackball', path: 'input', type: 'GROUP', data: '', description: 'Trackball device settings.' },
	{ name: 'off', path: 'input:trackball', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable trackball input.' },

	// --- Tablet ---
	{ name: 'tablet', path: 'input', type: 'GROUP', data: '', description: 'Graphics tablet settings.' },
	{ name: 'off', path: 'input:tablet', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable tablet input.' },
	{
		name: 'map-to-output',
		path: 'input:tablet',
		type: 'CONFIG_OPTION_STRING_SHORT',
		data: 'eDP-1',
		description: 'Map tablet to a specific output.',
	},

	// --- Touch ---
	{ name: 'touch', path: 'input', type: 'GROUP', data: '', description: 'Touchscreen settings.' },
	{ name: 'off', path: 'input:touch', type: 'CONFIG_OPTION_FLAG', data: '', description: 'Disable touchscreen input.' },
	{
		name: 'map-to-output',
		path: 'input:touch',
		type: 'CONFIG_OPTION_STRING_SHORT',
		data: 'eDP-1',
		description: 'Map touch to a specific output.',
	},
]
