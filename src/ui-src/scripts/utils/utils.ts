import { Backend, saveConfigDebounced } from './backendAPI.js'
import { GLOBAL } from '../GLOBAL.js'
import { _configRenderer } from '../ConfigRenderer/_configRenderer.ts'
import { findAdjacentConfigKeys } from '@scripts/HyprlandSpecific/configDescriptionTools.ts'
import { selectFrom } from '@scripts/ui_components/dmenu.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'
import type { ItemProps, ItemPropsGroup, ItemPropsKey, NodeType } from '@scripts/types/editorItemTypes.ts'

export function hideAllContextMenus() {
	document.querySelectorAll('.context-menu').forEach((ctx) => {
		ctx.style.opacity = 0
		ctx.remove()
	})
}

function findParent(root: ItemPropsGroup, path: string[], childuuid: string | null = null): ItemPropsGroup {
	// console.log(`Finding parent for path: ${path}`)
	let node = root
	for (let i = 1; i < path.length; i++) {
		const key = path[i]
		if (!node.children) {
			// console.log(`Node ${node["name"]} has no children`)
			throw new Error(`Node ${node['name']} has no children`)
		}
		let parentName = node['name']
		let matchingChildren = node.children.filter((child) => child.name === key)
		if (matchingChildren.length > 1) {
			// console.log(`Node ${node["name"]} has more than one child with name ${key}: `, node)
			let possibleParents = matchingChildren.filter(
				(childNode) => 'children' in childNode && Array.isArray((childNode as ItemPropsGroup).children),
			) as ItemPropsGroup[]
			let finalParents = possibleParents.filter((parentNode) => parentNode.children.some((child) => child.uuid === childuuid))
			node = finalParents[0]
		} else if (matchingChildren.length === 1) {
			node = matchingChildren[0] as ItemPropsGroup
		} else {
			node = undefined as any
		}
		// console.log(`Node ${node["name"]} has children. Looking for ${key}`)
		if (!node) {
			// console.log(`No parent node ${node} found`)
			throw new Error(`Unable to find ${path.join()}`)
		}
	}
	return node
}

function getNodeContext(position: string, uuid?: string | null) {
	let root = GLOBAL['data'] as ItemPropsGroup
	let path = position.split(':')
	let file = path
		.slice(1)
		.filter((p) => p.includes('.conf'))
		.at(-1)
	let parent = findParent(root, path, uuid)
	let nodeIndex = uuid ? parent.children.findIndex((n) => n.uuid === uuid) : -1
	let node = nodeIndex !== -1 ? parent.children[nodeIndex] : undefined
	return { root, path, file, parent, nodeIndex, node }
}

export function handleSave(file: string | undefined, logAction: string, debounced: boolean) {
	if (!file) return console.warn(`No .conf file found for action: ${logAction}`)
	if (!GLOBAL['config'].dryrun && GLOBAL['config'].autosave) {
		console.log(`Saving config (${logAction}):`, file)
		if (debounced) saveConfigDebounced(JSON.stringify(GLOBAL['data']), [file])
		else Backend.saveConfig(JSON.stringify(GLOBAL['data']), [file])
	} else {
		queueManualSave(file)
		console.log(`Dryrun ${logAction}`)
	}
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
	if (type === 'KEY' && GLOBAL.groupsave === true) return console.log('Group save in progress, skipping key save for ', name)

	let { file, node } = getNodeContext(position, uuid)
	if (!node) return console.error(`Could not find child node with uuid ${uuid}`)

	console.log('Changed file:', file)
	Object.assign(node, { name, type: type as NodeType, uuid, position, value, disabled })

	if (type === 'GROUP') {
		;(node as ItemPropsGroup).children?.forEach((child) => (child.disabled = disabled))
	}

	if (comment) node.comment = comment
	else delete node.comment

	handleSave(file, `save ${uuid}`, true)
}

export function queueManualSave(file: string | undefined) {
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

export function deleteKey(uuid: string, position: string) {
	console.log(`Deleting ${position} => with uuid ${uuid}`)
	let { file, parent, nodeIndex } = getNodeContext(position, uuid)
	if (nodeIndex === -1) return console.warn(`Could not find child node with uuid ${uuid} to delete`)

	parent.children.splice(nodeIndex, 1)
	handleSave(file, `delete ${uuid}`, false)
}

export function duplicateKey(uuid: string, position: string, below: boolean = true, element: HTMLElement) {
	console.log(`Duplicating ${position} => with uuid ${uuid}`)
	let { file, parent, node, nodeIndex } = getNodeContext(position, uuid)
	if (!node) return console.warn(`Could not find child node with uuid ${uuid} to duplicate`)

	let newNode = { ...JSON.parse(JSON.stringify(node)), uuid: makeUUID(8) }
	parent.children.splice(nodeIndex + (below ? 1 : 0), 0, newNode)
	console.log(newNode)
	new _configRenderer(newNode, element, below)

	handleSave(file, `duplicate ${uuid}`, false)
	if (!GLOBAL['config'].dryrun && GLOBAL['config'].autosave) window.jsViewer.data = GLOBAL['data']
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
	let { parent, nodeIndex } = getNodeContext(position, relative_uuid)
	let targetIndex = nodeIndex === -1 ? (below ? parent.children.length : 0) : below ? nodeIndex + 1 : nodeIndex

	const newItem: ItemProps = {
		type: type as any, // Cast to any or specific NodeType if needed
		name: name,
		value: value,
		position: position,
		uuid: await Backend.newUUID(),
		comment: comment,
		line_number: null, // Python parser expectation
	}

	parent.children.splice(targetIndex, 0, newItem)

	return { ...newItem, below }
}

export async function addChildItem(position: string, parent_uuid: string) {
	let { node: parent_node } = getNodeContext(position, parent_uuid)
	if (!parent_node) throw new Error(`Parent node not found: ${parent_uuid}`)

	let existingSiblingKeys: string[] = (parent_node as ItemPropsGroup).children.map((i: { name: any }) => i.name)
	let availableKeys: ConfigDescription[] = findAdjacentConfigKeys(parent_node.name, existingSiblingKeys)

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

export function splitWithRemainder(str: string, sep: string | RegExp, limit: number): string[] {
	let parts = str.split(sep)
	if (parts.length > limit) {
		let firstParts = parts.slice(0, limit)
		let remainder = parts.slice(limit).join(typeof sep === 'string' ? sep : '')
		firstParts.push(remainder)
		return firstParts
	}
	return parts
}

export async function shortHash(str: string): Promise<string> {
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
