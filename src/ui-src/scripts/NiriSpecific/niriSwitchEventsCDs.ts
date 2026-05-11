import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

export const NiriSwitchEventCDs: ConfigDescription[] = [
	{
		name: 'switch-events',
		path: 'root',
		type: 'GROUP',
		data: '',
		description: 'Bindings for hardware switch events like laptop lid or tablet mode.',
	},
	{
		name: 'off',
		path: 'switch-events',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Disable all switch event handling.',
	},

	// --- Lid Events ---
	{
		name: 'lid-close',
		path: 'switch-events',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '',
		description: 'Action to perform when the laptop lid is closed. Always executed even when locked.',
	},
	{
		name: 'lid-open',
		path: 'switch-events',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '',
		description: 'Action to perform when the laptop lid is opened.',
	},

	// --- Tablet Mode Events ---
	{
		name: 'tablet-mode-on',
		path: 'switch-events',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '',
		description: 'Action to perform when entering tablet mode (e.g., enabling an on-screen keyboard).',
	},
	{
		name: 'tablet-mode-off',
		path: 'switch-events',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '',
		description: 'Action to perform when exiting tablet mode.',
	},
]
