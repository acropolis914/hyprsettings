//tabids for comment stacks so configRenderer() knows where to put them
//[HeaderCommentBlockName(case insensitive),tabID
export let tabids = [
	['general layout', 'looknfeel'], //dank
	['layouts', 'looknfeel'], //dank
	['general', 'general'], //general layout should go first
	['monitor', 'monitor'],
	['keybindings', 'keybinds'],
	['miscellaneous', 'miscellaneous'],
	['misc', 'miscellaneous'], //dank
	['programs', 'globals'],
	['windows and workspaces', 'win-rules'],
	['window rules', 'win-rules'], //dank
	['layer rules', 'layer-rules'],
	['autostart', 'autostart'],
	['startup apps', 'autostart'],
	['variables', 'envars'],
	['permissions', 'permissions'],
	['look and feel', 'looknfeel'],
	['decoration', 'looknfeel'], //dank
	['animations', 'animations'],
	['input', 'input'],
	['debug', 'debug'],
]
export const keyNameStarts = [
	// autostart
	['exec', 'autostart'],

	// envars
	['env', 'envars'],

	// general
	['source', 'general'],

	// globals
	['$', 'globals'],

	// keybinds
	['bind', 'keybinds'],
	['submap', 'keybinds'],

	// layer rules
	['layerrule', 'layer-rules'],

	// layerrules (duplicate key, different category)
	['layerrule', 'layerrules'],

	// monitor
	['monitor', 'monitor'],

	// permissions (misspelling preserved)
	['permission', 'permissions'],

	// win rules
	['windowrule', 'win-rules'],

	// workspaces
	['workspace', 'workspaces', ['workspace_wraparound']],
]

export const configGroups = [
	// animations
	['animations', 'animations'],

	// input
	['binds', 'input'],
	['cursor', 'input'],
	['device', 'input'],
	['input', 'input'],

	// look and feel
	['decoration', 'looknfeel'],
	['general', 'looknfeel'],
	['dwindle', 'looknfeel'],
	['master', 'looknfeel'],

	// permissions
	['ecosystem', 'permissions'],

	// miscellaneous
	['debug', 'miscellaneous'],
	['misc', 'miscellaneous'],
	['opengl', 'miscellaneous'],
	['plugin', 'miscellaneous'],

	// layer rules
	['layerrule', 'layer-rules'],

	// window rules
	['group', 'win-rules'],
	['windowrule', 'win-rules'],
	['xwayland', 'win-rules'],
]

export let tabs = [
	{ name: 'General', id: 'general', default: true, icon: '' }, // nf-md-settings
	{ name: 'Keybinds', id: 'keybinds', icon: '󰌌' }, // nf-md-key
	{ name: 'separator', label: 'Appearance' },
	{ name: 'Look & Feel', id: 'looknfeel', icon: '' }, // nf-md-brush
	{ name: 'Animations', id: 'animations', icon: '' }, // nf-md-movie
	{ name: 'separator', label: 'Layouts' },
	{ name: 'Workspaces', id: 'workspaces', icon: '' }, // nf-md-view_quilt
	{ name: 'Window Rules', id: 'win-rules', icon: '' }, // nf-md-window
	{ name: 'Layer Rules', id: 'layer-rules', icon: '' }, // nf-md-layers
	{ name: 'separator', label: 'System & Devices' },
	{ name: 'Monitor', id: 'monitor', icon: '󰨇' }, // nf-md-monitor
	{ name: 'Input', id: 'input', icon: '' }, // nf-md-keyboard
	{ name: 'Env Variables', id: 'envars', icon: '' }, // nf-md-code
	{ name: 'separator', label: 'System Behavior' },
	{ name: 'Globals', id: 'globals', icon: '' }, // nf-md-globe
	{ name: 'Permissions', id: 'permissions', icon: '󰒃' }, // nf-md-lock
	{ name: 'AutoStart', id: 'autostart', icon: '' }, // nf-md-play_circle_outline
	{ name: 'Miscellaneous', id: 'miscellaneous', icon: '' }, // nf-md-more_horiz
	{ name: 'separator', label: 'Utility & Debugging' },
	{ name: 'Settings', id: 'settings', icon: '' }, // nf-md-tune
	{ name: 'Debug / Testing', id: 'debug', icon: '' }, // nf-md-bug_report
	{ name: 'Wiki', id: 'wiki', icon: '󰂺' },
]
