import { findAdjacentConfigKeys } from '@scripts/HyprlandSpecific/hyprland_config_descriptions.ts'
import { selectFrom } from '@scripts/ui_components/dmenu.ts'
import { EditorItem_Generic } from '@scripts/ConfigRenderer/EditorItem_Generic.ts'
import { addItem } from '@scripts/utils/utils.ts'
import { EditorItem_Comments } from '@scripts/ConfigRenderer/EditorItem_Comments'

export async function newEditorItemGeneric(options: {
	siblingKeys?: string[]
	relatedElement: Element | HTMLElement
	position: string
	below: boolean
}) {
	const allowed_dupes = ['animation', 'bezier', 'gesture']
	const existingSiblingKeys = Array.from(options.relatedElement.parentNode.children)
		.filter((el) => el.classList.contains('editor-item-generic'))
		.map((el) => el.dataset.name)
		.filter((i) => !allowed_dupes.includes(i))
	console.log(existingSiblingKeys)

	let availableKeys
	try {
		availableKeys = findAdjacentConfigKeys(options.position, existingSiblingKeys)
	} catch (e) {
		console.error('findAdjacentConfigKeys threw:', e)
	}

	let keyToAdd
	if (Array.isArray(availableKeys) && availableKeys.length > 0) {
		keyToAdd = await selectFrom(availableKeys, true)
	} else {
		console.warn('availableKeys empty or invalid:', availableKeys)
	}

	console.debug('keyToAdd raw:', keyToAdd)

	let name
	let value

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
		newGenericElement.dataset.disabled = 'true'
	}
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
