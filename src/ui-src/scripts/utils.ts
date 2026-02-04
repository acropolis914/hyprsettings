import { Backend, saveConfigDebounced } from './backendAPI.js'
import { GLOBAL } from './GLOBAL.js'
import { ConfigRenderer } from './configRenderer.ts'

export function hideAllContextMenus() {
	// console.log("hiding all ctx")
	document.querySelectorAll('.context-menu').forEach((ctx) => {
		ctx.style.opacity = 0
		// console.log("hid this ctx")
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
				let possibleParents = node.filter((node) =>
					Array.isArray(node.children),
				)
				let parent = possibleParents.filter((parentNode) =>
					parentNode.children.some(
						(child) => child.uuid === childuuid,
					),
				)
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

/**
 * Description
 * @param {String} type
 * @param {String} name
 * @param {String} uuid
 * @param {String} position
 * @param {String} value
 * @param {String} comment=null
 * @param {Boolean} disabled=false
 * @returns {any}
 */
export function saveKey(
	type,
	name,
	uuid,
	position,
	value,
	comment = null,
	disabled = false,
) {
	if (type === 'KEY' && GLOBAL.groupsave === true) {
		console.log('Group save in progress, skipping key save for ', name)
		return
	}
	console.log('Saving key:', {
		type,
		name,
		value,
		uuid,
		position,
		comment,
		disabled,
	})
	let root = GLOBAL['data']
	let path = position.split(':')
	let file = path
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

	if (!GLOBAL['config'].dryrun) {
		// window.pywebview.api.save_config(JSON.stringify(GLOBAL['data']))
		saveConfigDebounced(JSON.stringify(GLOBAL['data']), [file])
	} else {
		console.log(`Dryrun save ${uuid}:`, node)
	}
}

export function deleteKey(uuid, position) {
	console.log(`Deleting ${position} => with uuid ${uuid}`)
	let root = GLOBAL['data']
	let path = position.split(':')
	let parent = findParent(root, path, uuid)
	let node = parent.children.find((node) => node.uuid === uuid)
	let nodeIndex = parent.children.findIndex((node) => node.uuid === uuid)
	let changedPath = position.split(':')
	let file = path
		.slice(1)
		.filter((path) => path.includes('.conf'))
		.at(-1)
	if (!file) {
		console.warn('No .conf file found in position:', position)
	} else if (!GLOBAL['config'].dryrun) {
		console.log(`Node ${uuid} deleted:`, node)
		parent.children.splice(nodeIndex, 1)
		Backend.saveConfig(JSON.stringify(GLOBAL['data']), [file])
	} else {
		console.log(`Dryrun delete ${uuid}:`, node)
	}
}

export function duplicateKey(
	uuid,
	position,
	below = true,
	element: HTMLElement,
) {
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
	new ConfigRenderer(newNode, element, below)

	let file = path
		.slice(1)
		.filter((path) => path.includes('.conf'))
		.at(-1)
	if (!GLOBAL['config'].dryrun) {
		console.log(`Node ${uuid} duplicated:`, node)
		Backend.saveConfig(JSON.stringify(GLOBAL['data']), [file])
		// window.pywebview.api.save_config(JSON.stringify(GLOBAL['data']))
		window.jsViewer.data = GLOBAL['data']
	} else {
		console.log(`Dryrun duplicate ${uuid}:`, node)
	}
	// return newNode
}

export async function addItem(
	type,
	name,
	value,
	comment,
	position,
	relative_uuid,
	below = true,
) {
	let root = GLOBAL['data']
	let path = position.split(':')
	let parent = findParent(root, path, relative_uuid)
	// console.log(parent)
	let nodeIndex = parent.children.findIndex(
		(node) => node.uuid == relative_uuid,
	)
	// console.log({ nodeIndex })
	let newuuid = await Backend.newUUID()
	let targetIndex = below ? nodeIndex + 1 : nodeIndex
	// console.log(value)
	parent.children.splice(targetIndex, 0, {
		type: type,
		name: name,
		value: value,
		position: position,
		uuid: newuuid,
	})
	return { type, name, value, comment, position, uuid: newuuid, below }
}

export function makeUUID(length = 8) {
	let full

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
		Backend.saveWindowConfig(
			JSON.stringify(GLOBAL['persistence']),
			'persistence',
		)
		// await window.pywebview.api.save_window_config(JSON.stringify(GLOBAL['config']), 'config')
		// await window.pywebview.api.save_window_config(JSON.stringify(GLOBAL['persistence']), 'persistence')
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
		Backend.saveWindowConfig(
			JSON.stringify(GLOBAL['persistence']),
			'persistence',
		)
	} catch (err) {
		console.error('Failed to save config:', err)
	}
}

export function splitWithRemainder(
	str: string,
	sep: string,
	limit: number,
): string[] {
	let parts = str.split(sep)
	if (parts.length > limit) {
		let firstParts = parts.slice(0, limit)
		let remainder = parts.slice(limit).join(sep)
		firstParts.push(remainder)
		return firstParts
	}
	return parts
}
