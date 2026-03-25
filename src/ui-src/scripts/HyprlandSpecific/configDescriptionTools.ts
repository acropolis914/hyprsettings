import { configDescriptions } from '@scripts/HyprlandSpecific/configDescriptions.ts'
import { configDescriptionsExtra } from '@scripts/HyprlandSpecific/configDescriptionsExtra.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

let config_descriptions: ConfigDescription[] = [
	...configDescriptions,
	...configDescriptionsExtra,
]

export function findConfigDescription(
	path: string,
	name: string,
	exclude_types: string[],
) {
	return config_descriptions.find(
		(item) =>
			item.path === path &&
			item.name === name &&
			!exclude_types.includes(item.type),
	)
}

export function findAdjacentConfigKeys(
	path: string,
	exclude: string[] = [],
): ConfigDescription[] {
	return config_descriptions
		.filter((item) => item.path === path)
		.filter((item) => !exclude.includes(item.name))
}

export function findAllAdjacentKeys(path: string, exclude: string[]): object[] {
	return config_descriptions
		.filter((item) => item.path.startsWith(path))
		.filter((item) => !exclude.includes(item.name))
}
