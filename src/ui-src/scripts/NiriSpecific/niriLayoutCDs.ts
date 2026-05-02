import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

export const NiriLayoutCDs: ConfigDescription[] = [
	{
		name: 'proportion',
		path: 'layout:preset-column-widths',
		type: 'CONFIG_OPTION_FLOAT',
		data: '0.5,0.1,1.0',
		description: '',
	},
	{
		name: 'fixed',
		path: 'layout:preset-column-widths',
		type: 'CONFIG_OPTION_INT',
		data: '1000,100,10000',
		description: '',
	},
]
