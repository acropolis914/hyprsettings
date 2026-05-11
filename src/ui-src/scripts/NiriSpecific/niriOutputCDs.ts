import { NiriLayoutCDs } from '@scripts/NiriSpecific/niriLayoutCDs.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

/**
 * Descriptions specific to the output block itself
 */
const outputRootCDs: ConfigDescription[] = [
	{
		name: 'mode',
		path: 'output',
		type: 'CONFIG_OPTION_STRING_SHORT',
		data: '1920x1080@60',
		description: 'Resolution and refresh rate (e.g., "1920x1080@144"). Caution: may damage your display.',
	},
	{
		name: 'modeline',
		path: 'output',
		type: 'CONFIG_OPTION_STRING_LONG',
		data: '',
		description: 'Custom modeline string. Caution: may damage your display.',
	},
	{ name: 'scale', path: 'output', type: 'CONFIG_OPTION_FLOAT', data: '1.0, 1.0, 5.0', description: 'HiDPI scaling factor.' },
	{
		name: 'transform',
		path: 'output',
		type: 'CONFIG_OPTION_CHOICE',
		data: '0, "0,90,180,270,flipped-0,flipped-90,flipped-180,flipped-270"',
		description: 'Rotate or flip the output.',
	},
	{
		name: 'position',
		path: 'output',
		type: 'CONFIG_OPTION_VECTOR',
		data: '{0, 0}, {0, 0}, {32000, 32000}',
		description: 'X and Y position in global coordinates.',
	},
	{
		name: 'variable-refresh-rate',
		path: 'output',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Enable VRR / Adaptive Sync.',
	},
	{
		name: 'focus-at-startup',
		path: 'output',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Set as the default focused output on login.',
	},
	{
		name: 'backdrop-color',
		path: 'output',
		type: 'CONFIG_OPTION_COLOR',
		data: '001100',
		description: 'Color behind the workspace on this output.',
	},

	// Hot Corners
	{ name: 'hot-corners', path: 'output', type: 'GROUP', data: '', description: 'Trigger actions via screen corners.' },
	{
		name: 'off',
		path: 'output:hot-corners',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Turn off the hot-corners configuration group.',
	},
	{
		name: 'top-left',
		path: 'output:hot-corners',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Enable top-left hot corner.',
	},
	{
		name: 'top-right',
		path: 'output:hot-corners',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Enable top-right hot corner.',
	},
	{
		name: 'bottom-left',
		path: 'output:hot-corners',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Enable bottom-left hot corner.',
	},
	{
		name: 'bottom-right',
		path: 'output:hot-corners',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Enable bottom-right hot corner.',
	},
]

/**
 * Dynamically mapped Layout CDs for per-output overrides.
 * Prefixes "output:" to all existing layout paths.
 */
const outputLayoutOverrides: ConfigDescription[] = NiriLayoutCDs.map((cd) => ({
	...cd,
	path: `output:${cd.path}`,
}))

// Export the combined list
export const NiriOutputCDs: ConfigDescription[] = [...outputRootCDs, ...outputLayoutOverrides]
