import { configDescriptions } from '@scripts/HyprlandSpecific/configDescriptions.ts'
import { configDescriptionsExtra } from '@scripts/HyprlandSpecific/configDescriptionsExtra.ts'

let config_descriptions = [...configDescriptions, ...configDescriptionsExtra]

export function findConfigDescription(path: string, name: string) {
	return config_descriptions.find(
		(item) => item.path === path && item.name === name,
	)
}

export function findAdjacentConfigKeys(
	path: string,
	exclude: string[] = [],
): object[] {
	return config_descriptions
		.filter((item) => item.path === path)
		.filter((item) => !exclude.includes(item.name))
}

export function findAllAdjacentKeys(path: string, exclude: string[]): object[] {
	return config_descriptions
		.filter((item) => item.path.startsWith(path))
		.filter((item) => !exclude.includes(item.name))
}
