import { configDescriptions as _configDescriptions } from '@scripts/HyprlandSpecific/configDescriptions.ts'
import { configDescriptionsExtra as _configDescriptionsExtra } from '@scripts/HyprlandSpecific/configDescriptionsExtra.ts'
import type { ConfigDataType, ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

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

const configMap = new Map<string, ConfigDescription>()
for (const desc of config_descriptions) {
	const key = `${desc.path}|${desc.name}`
	configMap.set(key, desc)
}

export function findConfigDescription(path: string, name: string, exclude_types: string[]) {
	const desc = configMap.get(`${path}|${name}`)
	if (desc && !exclude_types.includes(desc.type)) {
		return desc
	}
	return undefined
}

/**
 * Removes .conf and root: from pathstring like root:hyprland.conf:general
 * @param path
 */
function cleanPath(path: string): string {
	if (path.includes('root:') || path.includes('conf:')) {
		let pathSet = path
			.split(':')
			.filter((i) => !i.trim().startsWith('root'))
			.filter((i) => !i.trim().endsWith('.conf'))
		return pathSet.join(':')
	}
	return path
}

/**
 * Finds all config keys of exactly the same path
 * @param path {string}
 * @param exclude {string[]}
 * @returns ConfigDescription[]
 */
export function findAdjacentConfigKeys(path: string, exclude: string[] = []): ConfigDescription[] {
	let excludeSet = new Set(exclude)
	return config_descriptions.filter((item) => item.path === path).filter((item) => !excludeSet.has(item.name))
}

/**
 * Finds all keys that starts with the same path
 * @param path {string} Just give the pathstring as it is. We'll clean it up ourselves lol.
 * @param exclude
 */
export function findAllAdjacentKeys(path: string = '', exclude: string[] = []): object[] {
	let excludeSet = new Set(exclude)
	return config_descriptions.filter((item) => !path || item.path.startsWith(path)).filter((item) => !excludeSet.has(item.name))
}

if (import.meta.main) {
	// let itemsConfig = configDescriptions.filter((i) => i.type === 'CONFIG_OPTION_VECTOR')
	// console.log(itemsConfig)

	function findAllTypes() {
		const types = {}
		for (const configDescription of configDescriptions) {
			if (typeof types[configDescription.type] !== 'undefined') {
				types[configDescription.type].push(configDescription.data)
			} else {
				types[configDescription.type] = []
				types[configDescription.type].push(configDescription.data)
			}
		}
		return types
	}
	// console.log(JSON.stringify(findAllTypes(), null, 2))

	function testCleanPath() {
		const samples = [
			'root:hyprland.conf:general',
			'root:config.conf:section:value',
			'hyprland.conf:general',
			'root:onlyroot',
			'normal:path:value',
			'root:abc.conf:def:ghi',
		]

		for (const str of samples) {
			console.log(`${str} -> ${cleanPath(str)}`)
		}
	}
	// testCleanPath()
}
