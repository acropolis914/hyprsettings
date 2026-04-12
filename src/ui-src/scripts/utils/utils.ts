import { Backend, saveConfigDebounced } from './backendAPI.js'
import { GLOBAL } from '../GLOBAL.js'
import { _configRenderer } from '../ConfigRenderer/_configRenderer.ts'
import { findAdjacentConfigKeys } from '@scripts/HyprlandSpecific/configDescriptionTools.ts'
import { selectFrom } from '@scripts/ui_components/dmenu.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'
import type { ItemProps, ItemPropsGroup } from '@scripts/types/editorItemTypes.ts'

export function hideAllContextMenus() {
	document.querySelectorAll('.context-menu').forEach((ctx) => {
		ctx.style.opacity = 0
		ctx.remove()
	})
}

/**
 * Description
 * @param {JSON|Array} root
 * @param {String[]} path
 * @returns {Object|null}
 */
function findParent(root, path, childuuid = null) {
	// console.log(`Finding parent for path: ${path}`)
	let node = root
	for (let i = 1; i < path.length; i++) {
		const key = path[i]
		if (!node.children) {
			// console.log(`Node ${node["name"]} has no children`)
			return null
		}
		parent = node['name']
		node = node.children.filter((child) => child.name === key)
		if (node.length > 1) {
			// console.log(`Node ${node["name"]} has more than one child with name ${key}: `, node)
			if (Array.isArray(node)) {
				let possibleParents = node.filter((node) => Array.isArray(node.children))
				let parent = possibleParents.filter((parentNode) => parentNode.children.some((child) => child.uuid === childuuid))
				return parent[0]
			}
		} else if (node.length === 1) {
			node = node[0]
		}
		// console.log(`Node ${node["name"]} has children. Looking for ${key}`)
		if (!node) {
			// console.log(`No parent node ${node} found`)
			return null
		}
	}
	return node
}

export function saveKey(
	type: string,
	name: string,
	uuid: string,
	position: string,
	value: string,
	comment: string = null,
	disabled: boolean = false,
): any {
	if (type === 'KEY' && GLOBAL.groupsave === true) {
		console.log('Group save in progress, skipping key save for ', name)
		return
	}
	// console.log('Saving key:', {
	// 	type,
	// 	name,
	// 	value,
	// 	uuid,
	// 	position,
	// 	comment,
	// 	disabled,
	// })
	let root = GLOBAL['data']
	let path = position.split(':')
	let file: string = path
		.slice(1)
		.filter((path) => path.includes('.conf'))
		.at(-1)
	console.log('Changed file:', file)
	let parent = findParent(root, path, uuid)
	let node = parent.children.find((node) => node.uuid === uuid)
	node['name'] = name
	node['type'] = type
	node['uuid'] = uuid
	node['position'] = position
	node['value'] = value
	node['disabled'] = disabled
	if (type === 'GROUP') {
		node['children'].forEach((child) => {
			// console.log('Disabling child:', child)
			child['disabled'] = disabled
		})
	}
	if (comment) {
		node['comment'] = comment
	} else if (node.hasOwnProperty('comment')) {
		delete node['comment']
	}

	if (!GLOBAL['config'].dryrun && GLOBAL['config']['autosave']) {
		// window.pywebview.api.save_config(JSON.stringify(GLOBAL['data']))
		console.log('Saving config:', { name, value, file })
		saveConfigDebounced(JSON.stringify(GLOBAL['data']), [file])
	} else {
		queueManualSave(file)
		console.log(`Dryrun save ${uuid}:`, node)
	}
}

function queueManualSave(file: string | undefined) {
	let saveChangedButton = document.getElementById('save-changed')
	if (!saveChangedButton) {
		console.warn('Save changed button not found')
		return
	}

	// Rebind to avoid stacking listeners across multiple edits.
	saveChangedButton.removeEventListener('click', saveChanged)
	saveChangedButton.addEventListener('click', saveChanged)
	saveChangedButton.classList.remove('btn-hidden')

	if (!file) return

	let changedFiles = Array.isArray(GLOBAL.changedFiles) ? GLOBAL.changedFiles : []
	if (!changedFiles.includes(file)) {
		GLOBAL.setKey('changedFiles', [...changedFiles, file])
	}
}

export function saveChanged() {
	let saveChangedButton = document.getElementById('save-changed')
	saveChangedButton.removeEventListener('click', saveChanged)
	saveChangedButton.classList.add('btn-hidden')
	saveConfigDebounced(JSON.stringify(GLOBAL['data']), GLOBAL.changedFiles)
	GLOBAL.changedFiles = []
}

export function deleteKey(uuid, position) {
	console.log(`Deleting ${position} => with uuid ${uuid}`)
	let root = GLOBAL['data']
	let path = position.split(':')
	let parent = findParent(root, path, uuid)
	let node = parent.children.find((node) => node.uuid === uuid)
	let nodeIndex = parent.children.findIndex((node) => node.uuid === uuid)
	let file = path
		.slice(1)
		.filter((path) => path.includes('.conf'))
		.at(-1)

	parent.children.splice(nodeIndex, 1)

	if (!file) {
		console.warn('No .conf file found in position:', position)
	} else if (!GLOBAL['config'].dryrun && GLOBAL['config'].autosave === true) {
		console.log(`Node ${uuid} deleted:`, node)
		Backend.saveConfig(JSON.stringify(GLOBAL['data']), [file])
	} else {
		queueManualSave(file)
		console.log(`Dryrun delete ${uuid}:`, node)
	}
}

export function duplicateKey(uuid, position, below = true, element: HTMLElement) {
	console.log(`Duplicating ${position} => with uuid ${uuid}`)
	let root = GLOBAL['data']
	let path = position.split(':')
	let parent = findParent(root, path, uuid)
	let node = parent.children.find((node) => node.uuid === uuid)
	let nodeIndex = parent.children.findIndex((node) => node.uuid === uuid)
	let newuuid = makeUUID(8)
	let newNode = JSON.parse(JSON.stringify(node))
	newNode.uuid = newuuid
	parent.children.splice(nodeIndex + (below ? 1 : 0), 0, newNode)
	new _configRenderer(newNode, element, below)

	let file = path
		.slice(1)
		.filter((path) => path.includes('.conf'))
		.at(-1)
	if (!GLOBAL['config'].dryrun && GLOBAL['config'].autosave === true) {
		console.log(`Node ${uuid} duplicated:`, node)
		Backend.saveConfig(JSON.stringify(GLOBAL['data']), [file])
		// window.pywebview.api.save_config(JSON.stringify(GLOBAL['data']))
		window.jsViewer.data = GLOBAL['data']
	} else {
		queueManualSave(file)
		console.log(`Dryrun duplicate ${uuid}:`, node)
	}
	// return newNode
}

export async function addItem(
	type: string,
	name: string,
	value: string,
	comment: string,
	position: string,
	relative_uuid?: string,
	below = true,
) {
	let root = GLOBAL['data']
	let path = position.split(':')

	// Cast to ItemPropsGroup so TypeScript knows .children exists
	let parent = findParent(root, path, relative_uuid) as ItemPropsGroup

	// Find the index of the relative item
	let nodeIndex = relative_uuid ? parent.children.findIndex((node) => node.uuid === relative_uuid) : -1

	let newuuid = await Backend.newUUID()
	let targetIndex: number

	if (nodeIndex === -1) {
		// DEFAULT LOGIC: If no UUID or not found, add to the very beginning (0)
		// or the very end (length) based on 'below'
		targetIndex = below ? parent.children.length : 0
	} else {
		// RELATIVE LOGIC: Place it exactly before or after the found node
		targetIndex = below ? nodeIndex + 1 : nodeIndex
	}

	const newItem: ItemProps = {
		type: type as any, // Cast to any or specific NodeType if needed
		name: name,
		value: value,
		position: position,
		uuid: newuuid,
		comment: comment,
		line_number: null, // Python parser expectation
	}

	parent.children.splice(targetIndex, 0, newItem)

	return { ...newItem, below }
}

export async function addChildItem(position: string, parent_uuid: string) {
	let root: ItemProps = GLOBAL['data']
	let path = position.split(':')
	let parent_node_of_group = findParent(root, path, parent_uuid) as ItemPropsGroup
	let parent_node = parent_node_of_group.children.find((node) => node['uuid'] === parent_uuid) as ItemPropsGroup
	let existingSiblingKeys: string[] = parent_node.children.map((i: { name: any }) => i.name)
	let availableKeys: ConfigDescription[] = findAdjacentConfigKeys(parent_node.name, existingSiblingKeys)
	// console.log(availableKeys)
	let itemToAdd: ConfigDescription = (await selectFrom(availableKeys)) as ConfigDescription
	itemToAdd['uuid'] = makeUUID()
	return [itemToAdd as ConfigDescription, parent_node]
}

export function makeUUID(length = 8) {
	let full = ''

	if (crypto?.randomUUID) {
		full = crypto.randomUUID().replace(/-/g, '')
	} else {
		// fallback (not cryptographically strong, but stable)
		full = ''
		for (let i = 0; i < 32; i++) {
			full += Math.floor(Math.random() * 16).toString(16)
		}
	}

	return full.slice(0, length)
}

export function saveWindowConfig() {
	try {
		Backend.saveWindowConfig(JSON.stringify(GLOBAL['config']), 'config')
		Backend.saveWindowConfig(JSON.stringify(GLOBAL['persistence']), 'persistence')
	} catch (err) {
		console.error('Failed to save config:', err)
	}
}

export async function saveWindowConfig_Config() {
	try {
		Backend.saveWindowConfig(JSON.stringify(GLOBAL['config']), 'config')
	} catch (err) {
		console.error('Failed to save config:', err)
	}
}

export async function saveWindowConfig_Persistence() {
	try {
		Backend.saveWindowConfig(JSON.stringify(GLOBAL['persistence']), 'persistence')
	} catch (err) {
		console.error('Failed to save config:', err)
	}
}

export function splitWithRemainder(str: string, sep: string, limit: number): string[] {
	let parts = str.split(sep)
	if (parts.length > limit) {
		let firstParts = parts.slice(0, limit)
		let remainder = parts.slice(limit).join(sep)
		firstParts.push(remainder)
		return firstParts
	}
	return parts
}

export async function shortHash(str) {
	const data = new TextEncoder().encode(str)
	const hash = await crypto.subtle.digest('SHA-256', data)
	const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')

	return hex.slice(0, 8) // 👈 cut to 8 chars
}

export type NormalizedRect = {
	left: number
	top: number
	width: number
	height: number
	right: number
	bottom: number
	x: number
	y: number
}

export function getNormalizedRect(el: Element): NormalizedRect {
	const rect = el.getBoundingClientRect()

	const computed = getComputedStyle(document.documentElement)

	const zoom = parseFloat(computed.zoom || '') || parseFloat(computed.getPropertyValue('--zoom-factor')) || 1

	const isWebKit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg/i.test(navigator.userAgent)

	let left = rect.left
	let top = rect.top
	let width = rect.width
	let height = rect.height

	// Chrome / Firefox: rect is affected by zoom → normalize it
	if (!isWebKit && zoom !== 1) {
		left /= zoom
		top /= zoom
		width /= zoom
		height /= zoom
	}

	return {
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
	}
}
