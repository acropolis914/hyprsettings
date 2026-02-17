export const animationsDefinitions = {
	global: {
		description: 'The parent animation. If a sub-animation is unset, it inherits these values.',
		styles: [],
	},

	windows: {
		description: 'Animations for window open/close/move/resize.',
		styles: ['slide', 'popin', 'gnomed'],
	},
	windowsIn: {
		description: 'Window open animation.',
		styles: ['slide', 'popin', 'gnomed'],
	},
	windowsOut: {
		description: 'Window close animation.',
		styles: ['slide', 'popin', 'gnomed'],
	},
	windowsMove: {
		description: 'Animations for moving, dragging, or resizing windows.',
		styles: ['slide', 'popin', 'gnomed'],
	},

	layers: {
		description: 'Animations for layers (e.g., shell components).',
		styles: ['slide', 'popin', 'fade'],
	},
	layersIn: {
		description: 'Layer open animation.',
		styles: ['slide', 'popin', 'fade'],
	},
	layersOut: {
		description: 'Layer close animation.',
		styles: ['slide', 'popin', 'fade'],
	},

	fade: {
		description: 'General fading animations for windows and layers.',
		styles: [],
	},
	fadeIn: {
		description: 'Fade in effect for window opening.',
		styles: [],
	},
	fadeOut: {
		description: 'Fade out effect for window closing.',
		styles: [],
	},
	fadeSwitch: {
		description: 'Fade when changing active window and its opacity.',
		styles: [],
	},
	fadeShadow: {
		description: 'Fade when changing active window for shadows.',
		styles: [],
	},
	fadeDim: {
		description: 'The easing of the dimming of inactive windows.',
		styles: [],
	},

	fadeLayers: {
		description: 'Fade animations for layers.',
		styles: [],
	},
	fadeLayersIn: {
		description: 'Fade in for layer open.',
		styles: [],
	},
	fadeLayersOut: {
		description: 'Fade out for layer close.',
		styles: [],
	},

	fadePopups: {
		description: 'Fade animations for Wayland popups.',
		styles: [],
	},
	fadePopupsIn: {
		description: 'Fade in for Wayland popup open.',
		styles: [],
	},
	fadePopupsOut: {
		description: 'Fade out for Wayland popup close.',
		styles: [],
	},

	fadeDpms: {
		description: 'Fade animation when DPMS is toggled.',
		styles: [],
	},

	border: {
		description: "Animates the border's color switch speed.",
		styles: [],
	},
	borderangle: {
		description: "Animates the border's gradient angle. Note: loop impacts battery.",
		styles: ['once', 'loop'],
	},

	workspaces: {
		description: 'Animations for switching workspaces.',
		styles: ['slide', 'slidevert', 'fade', 'slidefade', 'slidefadevert'],
	},
	workspacesIn: {
		description: 'Workspace enter animation.',
		styles: ['slide', 'slidevert', 'fade', 'slidefade', 'slidefadevert'],
	},
	workspacesOut: {
		description: 'Workspace exit animation.',
		styles: ['slide', 'slidevert', 'fade', 'slidefade', 'slidefadevert'],
	},

	specialWorkspace: {
		description: 'Animations for the special workspace (scratchpad).',
		styles: ['slide', 'slidevert', 'fade', 'slidefade', 'slidefadevert'],
	},
	specialWorkspaceIn: {
		description: 'Special workspace enter animation.',
		styles: ['slide', 'slidevert', 'fade', 'slidefade', 'slidefadevert'],
	},
	specialWorkspaceOut: {
		description: 'Special workspace exit animation.',
		styles: ['slide', 'slidevert', 'fade', 'slidefade', 'slidefadevert'],
	},

	zoomFactor: {
		description: 'Animates the screen zoom level.',
		styles: [],
	},

	monitorAdded: {
		description: 'Zoom animation when a monitor is added.',
		styles: [],
	},
}

export const animationStyleExtras = {
	popin: {
		description: 'Optional starting size percentage before animating to full size.',
		value: { type: 'percentage', min: 0, max: 100 },
	},

	slide: {
		description: 'Optional forced direction.',
		value: { type: 'enum', values: ['top', 'bottom', 'left', 'right'] },
	},

	slidevert: {
		description: 'Optional movement percentage of screen height.',
		value: { type: 'percentage', min: 0, max: 100 },
	},

	slidefade: {
		description: 'Optional movement percentage of screen width.',
		value: { type: 'percentage', min: 0, max: 100 },
	},

	slidefadevert: {
		description: 'Optional movement percentage of screen height.',
		value: { type: 'percentage', min: 0, max: 100 },
	},
}
