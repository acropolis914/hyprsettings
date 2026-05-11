import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

export const NiriKeybindCDs: ConfigDescription[] = [
	{
		name: 'spawn',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: 'allow-when-locked=false',
		description: 'Executes a program directly. Requires manual argument splitting. Use allow-when-locked=true for media keys.',
	},
	{
		name: 'spawn-sh',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '',
		description: 'Executes a command through sh. Supports pipes, environment variables, and ~ expansion.',
	},
	{
		name: 'quit',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_BOOL',
		data: 'skip-confirmation=false',
		description: 'Exits the niri session. Shows a confirmation dialog by default.',
	},
	{
		name: 'do-screen-transition',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_INT',
		data: 'delay-ms=250',
		description: 'Freezes the screen then crossfades. Useful for smooth theme or style transitions.',
	},
	{
		name: 'screenshot',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_GROUP',
		data: 'show-pointer=false',
		description: 'Opens the built-in interactive screenshot UI.',
	},
	{
		name: 'screenshot-screen',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_BOOL',
		data: 'write-to-disk=true, show-pointer=false',
		description: 'Captures the entire focused output.',
	},
	{
		name: 'screenshot-window',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_BOOL',
		data: 'write-to-disk=true, show-pointer=false',
		description: 'Captures the currently focused window.',
	},
	{
		name: 'toggle-window-rule-opacity',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_BOOL',
		data: '',
		description: "Toggles between 1.0 opacity and the window's defined semi-transparent rule.",
	},
	{
		name: 'toggle-keyboard-shortcuts-inhibit',
		path: 'binds:keybind',
		type: 'CONFIG_OPTION_BOOL',
		data: 'allow-inhibiting=false',
		description: 'Escape hatch to regain keyboard control from VMs or remote desktop clients.',
	},
]
