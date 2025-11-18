//tabids for comment stacks so configRenderer() knows where to put them
//[HeaderCommentBlockName(case insensitive),tabID
export let tabids = [
	["general", "general"],
	["monitor", "monitor"],
	["keybindings", "keybinds"],
	["miscellaneous", "miscellaneous"],
	["programs", "globals"],
	["windows and workspaces", "win-rules"],
	["layer rules", "layer-rules"],
	["autostart", "autostart"],
	["variables", "envars"],
	["permissions", "permissions"],
	["look and feel", "looknfeel"],
	["animations", "animations"],
	["input", "input"],
	["debug", "debug"]
];
export const keyNameStarts = [
	["$", "globals"],
	["windowrule", "win-rules"],
	["bind", "keybinds"],
	["layerrule", "layer-rules"],
	["workspace", "workspaces", ["workspace_wraparound"]],
	["env", "envars"],
	["permission", "persmissions"],
	["exec", "autostart"],
	["layerrule", "layerrules"],
	["source", "general"],
];

export let configGroups = [
	["debug", "miscellaneous"],
	["general", "looknfeel"],
	["decoration", "looknfeel"],
	["animations", "animations"],
	["xwayland", "win-rules"],
	["input", "input"],
	["device", "input"],
	["cursor", "input"],
	["binds", "input"],
	["ecosystem", "permissions"],
	["group", "win-rules"]
]

export let tabs = [
	{ name: "General", id: "general", default: true, icon: "" }, // nf-md-settings
	{ name: "Keybinds", id: "keybinds", icon: "" }, // nf-md-key
	{ name: "separator", label: "Appearance" },
	{ name: "Look & Feel", id: "looknfeel", icon: "" }, // nf-md-brush
	{ name: "Animations", id: "animations", icon: "" }, // nf-md-movie
	{ name: "separator", label: "Layouts" },
	{ name: "Workspaces", id: "workspaces", icon: "" }, // nf-md-view_quilt
	{ name: "Window Rules", id: "win-rules", icon: "" }, // nf-md-window
	{ name: "Layer Rules", id: "layer-rules", icon: "" }, // nf-md-layers
	{ name: "separator", label: "System & Devices" },
	{ name: "Monitor", id: "monitor", icon: "󰨇" }, // nf-md-monitor
	{ name: "Input", id: "input", icon: "" }, // nf-md-keyboard
	{ name: "Environment Variables", id: "envars", icon: "" }, // nf-md-code
	{ name: "separator", label: "System Behavior" },
	{ name: "Globals", id: "globals", icon: "" }, // nf-md-globe
	{ name: "Permissions", id: "permissions", icon: "󰒃" }, // nf-md-lock
	{ name: "AutoStart", id: "autostart", icon: "" }, // nf-md-play_circle_outline
	{ name: "Miscellaneous", id: "miscellaneous", icon: "" }, // nf-md-more_horiz
	{ name: "separator", label: "Utility & Debugging" },
	{ name: "Settings", id: "settings", icon: "" }, // nf-md-tune
	{ name: "Debug / Testing", id: "debug", icon: "" }, // nf-md-bug_report
];