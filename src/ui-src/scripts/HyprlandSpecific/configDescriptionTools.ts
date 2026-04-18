import { configDescriptions as _configDescriptions } from '@scripts/HyprlandSpecific/configDescriptions.ts'
import { configDescriptionsExtra as _configDescriptionsExtra } from '@scripts/HyprlandSpecific/configDescriptionsExtra.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

const configDescriptions = _configDescriptions as ConfigDescription[]
const configDescriptionsExtra = _configDescriptionsExtra as ConfigDescription[]

let disallowedDeviceParams = ['force_no_accel', 'follow_mouse', 'float_switch_override_focus']
const deviceParams: ConfigDescription[] = configDescriptions
	.filter((i) => i.path === 'input' && !disallowedDeviceParams.includes(i.path))
	.map((i) => {
		// Create a copy and update the path property
		return {
			...i,
			path: i.path.replace('input', 'device'),
		}
	})
let config_descriptions: ConfigDescription[] = [...configDescriptions, ...deviceParams, ...configDescriptionsExtra]

// const types = {}
// for (const configDescription of configDescriptions) {
// 	if (typeof types[configDescription.type] !== 'undefined') {
// 		types[configDescription.type].push(configDescription.data)
// 	} else {
// 		types[configDescription.type] = []
// 		types[configDescription.type].push(configDescription.data)
// 	}
// }
// console.warn(JSON.stringify(types, null, 2))

export function findConfigDescription(path: string, name: string, exclude_types: string[]) {
	return config_descriptions.find((item) => item.path === path && item.name === name && !exclude_types.includes(item.type))
}

export function findAdjacentConfigKeys(path: string, exclude: string[] = []): ConfigDescription[] {
	return config_descriptions.filter((item) => item.path === path).filter((item) => !exclude.includes(item.name))
}

export function findAllAdjacentKeys(path: string = '', exclude: string[] = []): object[] {
	return config_descriptions.filter((item) => !path || item.path.startsWith(path)).filter((item) => !exclude.includes(item.name))
}

if (import.meta.main) {
	let itemsConfig = configDescriptions.filter((i) => i.type === 'CONFIG_OPTION_VECTOR')
	console.log(itemsConfig)
}
