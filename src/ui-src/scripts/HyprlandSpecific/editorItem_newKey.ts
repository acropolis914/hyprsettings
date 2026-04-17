// import { selectFrom } from '@scripts/ui_components/dmenu.ts'
import { EditorItem_Generic } from '@scripts/ConfigRenderer/EditorItem_Generic.ts'
import { addItem, handleSave } from '@scripts/utils/utils.ts'
import { EditorItem_Comments } from '@scripts/ConfigRenderer/EditorItem_Comments.ts'
// import { findAdjacentConfigKeys } from '@scripts/HyprlandSpecific/configDescriptionTools.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

import { findAdjacentConfigKeys, findAllAdjacentKeys } from '@scripts/HyprlandSpecific/configDescriptionTools.ts'
import { type DMenuItem, selectFrom } from '@scripts/ui_components/dmenu.ts'
import { Backend } from '@scripts/utils/backendAPI.js'
import { makeUUID, queueManualSave } from '@scripts/utils/utils.ts'
import { _configRenderer } from '@scripts/ConfigRenderer/_configRenderer.ts'
import { GLOBAL } from '@scripts/GLOBAL.ts'
import type { ItemProps, ItemPropsGroup, ItemPropsKey } from '@scripts/types/editorItemTypes.ts'

export async function newEditorItemGeneric(options: { relatedElement: Element | HTMLElement; position: string; below: boolean }) {
	const allowed_dupes = ['animation', 'bezier', 'gesture']
	const existingSiblingKeys = Array.from(options.relatedElement.parentNode.children)
		.filter((el) => el.classList.contains('editor-item-generic'))
		.map((el) => el.dataset.name)
		.filter((i) => !allowed_dupes.includes(i))
	// console.log(existingSiblingKeys)

	let availableKeys: any[]
	try {
		availableKeys = findAdjacentConfigKeys(options.position, existingSiblingKeys)
	} catch (e) {
		console.error('findAdjacentConfigKeys threw:', e)
	}

	let keyToAdd: ConfigDescription
	if (Array.isArray(availableKeys) && availableKeys.length > 0) {
		keyToAdd = await selectFrom(availableKeys, true)
	} else {
		console.warn('availableKeys empty or invalid:', availableKeys)
	}

	console.debug('keyToAdd raw:', keyToAdd)

	let name: string
	let value: string

	if (keyToAdd) {
		name = keyToAdd.name
		try {
			if (
				keyToAdd.type === 'CONFIG_OPTION_INT' ||
				(typeof keyToAdd.data === 'string' && keyToAdd.data.includes(',') && keyToAdd.data.split(',').length === 3)
			) {
				value = keyToAdd.data.split(',')[0].replace(/^\s*"(.*)"\s*$/, '$1')
			} else {
				value = keyToAdd.data.replace(/^\s*"(.*)"\s*$/, '$1')
			}
		} catch (e) {
			console.error('Value derivation failed:', e, keyToAdd)
		}
	} else {
		console.debug('No keyToAdd selected.')
	}

	console.debug('Derived name/value BEFORE fallback:', {
		name,
		value,
	})

	const thisName = options.relatedElement.dataset.name
	const isAllowedDupe = allowed_dupes.includes(thisName)
	const isInConfigGroup = options.relatedElement.parentElement?.classList?.contains('config-group')

	console.debug('Fallback decision inputs:', {
		nameIsFalsy: !name,
		thisName,
		isAllowedDupe,
		isInConfigGroup,
	})

	if ((!name || name.toLowerCase().startsWith('custom')) && (isAllowedDupe || !isInConfigGroup)) {
		name = thisName
	} else if (!name) {
		console.warn('Falling back to GENERIC')
		name = 'generic'
	}

	if (name === 'bezier') {
		value = 'sample, 0.65, 0.05, 0.33, 0.91'
	} else if (value == null || value === '') {
		value = ''
	}

	console.debug('FINAL name/value:', { name, value })

	let newGenericItem = await addItem(
		'KEY',
		name,
		value,
		'',
		options.relatedElement.dataset.position,
		options.relatedElement.dataset.uuid,
		options.below,
	)

	console.debug('addItem result:', newGenericItem)

	let newGenericElement = new EditorItem_Generic({
		name: newGenericItem.name,
		uuid: newGenericItem.uuid,
		value: newGenericItem.value,
		comment: newGenericItem.comment,
		position: options.relatedElement.dataset.position,
	})

	if (options.below) {
		options.relatedElement.after(newGenericElement.el)
	} else {
		options.relatedElement.before(newGenericElement.el)
	}
	if (!(name === 'generic') || value == null || value === '') {
		newGenericElement.save()
	}

	if (newGenericElement.el.parentElement.dataset.disabled === 'true') {
		newGenericElement.disable()
	}
	console.log(newGenericElement.el.parentElement.dataset.disabled)
	newGenericElement.el.focus()
	newGenericElement.el.click()
}

export async function newEditorItemComments() {
	let newCommentItem = await addItem('COMMENT', 'comment', '', '# New comment', this.el.dataset.position, this.el.dataset.uuid, below)
	let newCommentElement = new EditorItem_Comments(
		{
			name: newCommentItem['comment'],
			uuid: newCommentItem['uuid'],
			value: newCommentItem['value'],
			comment: newCommentItem['comment'],
			position: this.el.dataset.position,
		},
		false,
	)
	if (below) {
		this.el.after(newCommentElement.el)
	} else {
		this.el.before(newCommentElement.el)
	}
	newCommentElement.el.focus()
	newCommentElement.save()
}

export async function addKeys(
	pathString: string = null,
	parentElement: HTMLElement = null,
	parentJSON: ItemPropsGroup = null,
	disabled: boolean = false,
) {
	let renderTo = parentElement ?? (document.querySelector('.config-set#permissions') as HTMLElement)
	let originalPathString = pathString
	pathString = pathString
		.replace('root:', '')
		.split(':')
		.filter((i) => !i.endsWith('.conf'))
		.join(':')

	const allowed_dupes = [
		'animation',
		'bezier',
		'gesture',
		'windowrule',
		'bind',
		'workspace',
		'monitor',
		'source',
		'permission',
		'device',
	]
	const existingSiblingKeys = Array.from(parentElement?.querySelectorAll('.editor-item-generic'))
		.map((el: HTMLDivElement) => el.dataset.name)
		.filter((i) => !allowed_dupes.includes(i))
	//
	let availableKeys = findAllAdjacentKeys(pathString, existingSiblingKeys) // This creates a NEW array and NEW objects
	const updatedKeys = availableKeys.map((item) => {
		const key = { ...item } as ConfigDescription
		if (key.path.startsWith(`${pathString}:`)) {
			key.path = key.path.replace(`${pathString}:`, '')
		} else if (key.path.startsWith(pathString)) {
			key.path = key.path.replace(pathString, '')
		}
		let keyPath = () => {
			if (key.path) {
				return `<b>Path:</b> ${key.path}`
			} else {
				return '<b>Top level keyword</b>'
			}
		}
		let keyType = () => {
			return `<b>Type:</b> ${key.type.replace('CONFIG_OPTION_', '').toLowerCase()}`
		}
		key.description = `${key.description}<br><small>${keyPath()} | ${keyType()}</small>`
		return key
	})

	let keyToAdd: ConfigDescription | String = await selectFrom(updatedKeys)
	if (keyToAdd === 'custom') {
		keyToAdd = {
			name: '',
			path: '',
			data: '',
			type: 'CONFIG_OPTION_STR',
			description: '',
		}
	}
	console.log(keyToAdd)

	console.log(keyToAdd)
	let pathList = keyToAdd['path'].split(':')
	if (pathList.length === 1 && pathList[0] === '') {
		pathList = []
	}
	let depth = pathList.length
	let configString = ''
	if (keyToAdd['type'] !== 'GROUP') {
		console.log('Not a group', keyToAdd['type'], pathList)
		while (pathList.length > 0) {
			configString += `${pathList[0]} {\n`
			pathList.shift()
		}
		configString += `${keyToAdd['name']} = `
		if (keyToAdd['type'] === 'CONFIG_OPTION_FLOAT' || keyToAdd['type'] === 'CONFIG_OPTION_INT') {
			configString += `${keyToAdd['data'].split(',')[0]}\n`
		} else {
			let str = `${keyToAdd['data']}`.trim()
			const first = str[0]
			const last = str[str.length - 1]
			if (first === last && `'"\``.includes(first)) {
				str = str.slice(1, -1)
			}
			configString += str + '\n'
		}
		while (depth > 0) {
			configString += `}\n`
			depth -= 1
		}
	} else {
		// console.log('A group')
		configString += `${keyToAdd['name']}{\n`
		// console.log(keyToAdd['name'])
		if (keyToAdd['name'] === 'windowrule') {
			configString += `name = windowrule-${makeUUID()}\n`
		}
		if (keyToAdd['name'] === 'device') {
			configString += `name = device-${makeUUID()}\n`
		}
		configString += '}'
	}

	// console.log(configString)
	let parsed: ItemPropsGroup = await Backend.getHyprlandConfigFromString(configString)
	let newNode = parsed.children[0]
	newNode['disabled'] = disabled
	if (!pathString) {
		const files = Object.keys(GLOBAL.files)
		const fileList = files.map((file) => {
			return {
				name: file.split('/').at(-1),
				description: file,
				value: file,
			}
		})
		let path: DMenuItem = await selectFrom(fileList)
		console.log(path)
		let position = GLOBAL['files'][path.value]['children'][0]['position']
		console.log(position)
		newNode['position'] = position
		GLOBAL.files[path.value].children.push(newNode)
		handleSave(path.value.split('/').at(-1), `save ${newNode['uuid']}`, false)
		new _configRenderer(newNode, renderTo, false, true)
	} else {
		newNode['position'] = originalPathString
		let filepath = originalPathString
			.split(':')
			.filter((i) => i.endsWith('.conf'))
			.at(-1)
		handleSave(filepath, `save ${newNode['uuid']}`, false)
		parentJSON.children.push(newNode)
		new _configRenderer(newNode, renderTo, false, true)
	}
}
