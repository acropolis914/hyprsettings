import type { ConfigDescription } from '../types/configDescriptionTypes.ts'

const animationTypes = [
	{ name: 'workspace-switch', desc: 'Animation when switching workspaces up and down, including after the vertical touchpad gesture.' },
	{ name: 'window-open', desc: 'Window opening animation.' },
	{ name: 'window-close', desc: 'Window closing animation.' },
	{ name: 'horizontal-view-movement', desc: 'All horizontal camera view movement animations.' },
	{ name: 'window-movement', desc: 'Movement of individual windows within a workspace.' },
	{ name: 'window-resize', desc: 'Window resize animation.' },
	{
		name: 'config-notification-open-close',
		desc: 'The open/close animation of the config parse error and new default config notifications.',
	},
	{ name: 'exit-confirmation-open-close', desc: 'The open/close animation of the exit confirmation dialog.' },
	{ name: 'screenshot-ui-open', desc: 'The open (fade-in) animation of the screenshot UI.' },
	{ name: 'overview-open-close', desc: 'The open/close zoom animation of the Overview.' },
	{ name: 'recent-windows-close', desc: 'The close fade-out animation of the recent windows switcher.' },
]

export const NiriAnimationsConfigDescriptions: ConfigDescription[] = [
	{
		name: 'animations',
		path: '',
		type: 'GROUP',
		data: '',
		description:
			'Niri has several animations which you can configure in the same way. Additionally, you can disable or slow down all animations at once.',
	},
	{
		name: 'off',
		path: 'animations',
		type: 'CONFIG_OPTION_BOOL',
		data: 'false',
		description: 'Turn off all animations.',
	},
	{
		name: 'slowdown',
		path: 'animations',
		type: 'CONFIG_OPTION_FLOAT',
		data: '3.0, 0.0, 100.0',
		description: 'Slow down all animations by this factor. Values below 1 speed them up instead.',
	},
	...animationTypes.flatMap((anim) => [
		{
			name: anim.name,
			path: 'animations',
			type: 'GROUP' as const,
			data: '',
			description: anim.desc,
		},
		{
			name: 'spring',
			path: `animations:${anim.name}`,
			type: 'CONFIG_OPTION_STRING_SHORT' as const,
			data: 'damping-ratio=0.80 stiffness=523 epsilon=0.0001',
			description: 'Spring animation parameters (damping-ratio stiffness epsilon).',
		},
		{
			name: 'duration-ms',
			path: `animations:${anim.name}`,
			type: 'CONFIG_OPTION_INT' as const,
			data: '150, 0, 10000',
			description: 'Duration of the animation in milliseconds.',
		},
		{
			name: 'curve',
			path: `animations:${anim.name}`,
			type: 'CONFIG_OPTION_CHOICE' as const,
			data: '0, "ease-out-quad,ease-out-cubic,ease-out-expo,linear,cubic-bezier"',
			description: 'The easing curve to use.',
		},
		{
			name: 'custom-shader',
			path: `animations:${anim.name}`,
			type: 'CONFIG_OPTION_STRING_LONG' as const,
			data: '',
			description: 'Custom shader for drawing the window.',
		},
	]),
	{
		name: 'spring',
		path: 'animations:animation-scope',
		type: 'CONFIG_OPTION_STRING_SHORT' as const,
		data: 'damping-ratio=0.80 stiffness=523 epsilon=0.0001',
		description: 'Spring animation parameters (damping-ratio stiffness epsilon).',
	},
	{
		name: 'duration-ms',
		path: 'animations:animation-scope',
		type: 'CONFIG_OPTION_INT' as const,
		data: '150, 0, 10000',
		description: 'Duration of the animation in milliseconds.',
	},
	{
		name: 'curve',
		path: 'animations:animation-scope',
		type: 'CONFIG_OPTION_CHOICE' as const,
		data: '0, "ease-out-quad,ease-out-cubic,ease-out-expo,linear,cubic-bezier"',
		description: 'The easing curve to use.',
	},
	{
		name: 'custom-shader',
		path: 'animations:animation-scope',
		type: 'CONFIG_OPTION_STRING_LONG' as const,
		data: '',
		description: 'Custom shader for drawing the window.',
	},
]

if (import.meta.main) {
	console.log(NiriAnimationsConfigDescriptions)
}
