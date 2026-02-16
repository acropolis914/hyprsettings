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
		description: 'Fade on changing active window and its opacity.',
		styles: [],
	},
	fadeShadow: {
		description: 'Fade on changing active window for shadows.',
		styles: [],
	},
	fadeDim: {
		description: 'The easing of the dimming of inactive windows.',
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
	specialWorkspace: {
		description: 'Animations for the special workspace (scratchpad).',
		styles: ['slide', 'slidevert', 'fade', 'slidefade', 'slidefadevert'],
	},
	zoomFactor: {
		description: 'Animates the screen zoom level.',
		styles: [],
	},
}
