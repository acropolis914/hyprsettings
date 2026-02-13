import { ContextMenu } from './contextMenu.js'
import { addItem, deleteKey, saveKey } from '../utils/utils.js'
import { debounce } from '../utils/helpers.js'
import { GLOBAL } from '../GLOBAL.js'
import { findAdjacentConfigKeys, findConfigDescription } from '@scripts/HyprlandSpecific/hyprland_config_descriptions.js'
import { EditorItem_Comments } from './EditorItem_Comments.js'
import { SliderModal } from './keyEditor_Slider.js'
import { GradientModal } from './keyEditor_Gradient.js'
import { parseHyprColor } from '@scripts/HyprlandSpecific/colorparser.js'
import { dmenuConfirm, selectFrom } from '../ui_components/dmenu.js'
import { BezierModal } from './keyEditor_Bezier.js'
import { html, render } from 'lit'
import tippy, { followCursor, hideAll } from 'tippy.js'
import { roundArrow } from 'tippy.js'
// import 'tippy.js/dist/tippy.css'
// import 'tippy.js/dist/svg-arrow.css'
// import '@stylesheets/subs/tippy.css'
import { gotoWiki } from '../ui_components/wikiTab.ts'
import { mount } from 'svelte'
import keyEditor_Animation from '@scripts/ConfigRenderer/keyEditor_Animation.svelte'
import createToolTippy from '@scripts/ui_components/toolTippy.ts'
import { ColorModal } from '@scripts/ConfigRenderer/keyEditor_Color.ts' // optional for styling

// class EditorItem_Template {
//     constructor(json, disabled = false,) {
//         this.initial_load = true
//         this.saveDebounced = debounce(() => this.save(), 250);
//         this.update()
//         this.initial_load=true
//     }
//     update() {
//         if (!this.initial_load){
//             this.saveDebounced()
//         }
//     }
//     addToParent(parent){
//         parent.appendChild(this.el)
//     }
//     save() {
//         // saveKey(type, name, uuid, position, value)
//     }
// }

const templateString = html`
	<div class="editor-item editor-item-generic" tabindex="0">
		<div class="editor-item-preview"></div>
		<div class="generic-editor">
			<!-- <textarea name="key" id="generic-key"></textarea>
			<textarea name="value" id="generic-value"></textarea> -->
		</div>
		<div class="comment-area">
			<span class="comment-hashtag">#</span>
			<textarea class="comment" placeholder="No Comment"></textarea>
		</div>
	</div>
`

export class EditorItem_Generic {
	tippyTitle: string
	initial_load: boolean
	el: HTMLDivElement
	preview_el: HTMLDivElement
	saveDebounced: () => void | any
	keyEditor: HTMLTextAreaElement
	genericEditor_el: Element
	valueEditor: any
	info: string

	constructor(json: string, disabled = false) {
		this.initial_load = true

		let name = json['name']
		let uuid = json['uuid']
		let value = json['value']
		let comment = json['comment']
		let position = json['position']

		this.saveDebounced = debounce(() => this.save(), 15)
		const template = document.createElement('div')
		render(templateString, template)
		this.el = template.firstElementChild!.cloneNode(true) as HTMLDivElement

		this.el.classList.add('editor-item')
		this.el.classList.add('editor-item-generic')
		if (GLOBAL['config'].compact) {
			this.el.classList.add('compact')
		}
		let position_title = json['position'].replace('root:', '').replaceAll(':', ' 󰄾 ')
		this.tippyTitle = `  Location: ${position_title}`
		this.el.dataset.name = name
		this.el.dataset.uuid = uuid
		this.el.dataset.value = value ?? ''
		this.el.dataset.comment = comment ?? ''
		this.el.dataset.position = position ?? ''
		this.el.dataset.disabled = disabled ? 'true' : 'false' //lol vscode badly wants to be a string that's why
		this.el.dataset.type = 'KEY'
		this.el.disable = this.disable.bind(this)
		if (disabled === true) {
			this.el.classList.add('disabled')
		}
		this.preview_el = this.el.querySelector('.editor-item-preview')

		this.genericEditor_el = this.el.querySelector('.generic-editor')
		// this.genericEditor_el.innerHTML = ''
		this.keyEditor = document.createElement('textarea')
		this.keyEditor.rows = 1
		this.keyEditor.id = 'generic-key'
		this.keyEditor.classList.add('hidden')
		this.keyEditor.setAttribute('placeholder', 'Input key here...')
		this.genericEditor_el.appendChild(this.keyEditor)
		this.config_position = position
			.split(':')
			.slice(1) // Remove 'root'
			.map((s) => s.trim())
			.filter((s) => !s.endsWith('.conf'))
			.join(':')

		this.info = findConfigDescription(this.config_position, name)
		if (this.info) {
			this.el.dataset.infoType = this.info['type']
			switch (this.info['type']) {
				case 'CONFIG_OPTION_INT':
				case 'CONFIG_OPTION_FLOAT': {
					const [defaultValue, min, max] = this.info['data']
						.split(',')
						.map((item) => item.trim())
						.map(Number)
					let data = this.info['data']

					let float = this.info['type'] !== 'CONFIG_OPTION_INT'
					this.valueEditor = new SliderModal(min, max, float)
					this.valueEditor.value = value
					break
				}

				case 'CONFIG_OPTION_COLOR': {
					try {
						this.valueEditor = new ColorModal(value)
						// console.log('Kolor', this.valueEditor)
					} catch (e) {
						// console.info('Lubot', e)
						this.valueEditor = null
					}
					break
				}

				case 'CONFIG_OPTION_GRADIENT': {
					try {
						this.valueEditor = new GradientModal(value)
					} catch (E) {
						this.valueEditor = null
					}
					break
				}
				case 'CONFIG_OPTION_BOOL': {
					break
				}
			}
		}
		switch (this.el.dataset.name) {
			case 'bezier':
				this.valueEditor = new BezierModal(value)
				break
			case 'animation':
				// this.value = value
				mount(keyEditor_Animation, {
					target: this.genericEditor_el,
					props: {
						inputValue: value,
						onChange: (value) => {
							this.value = value
							// console.log('value', value)
							this.el.dataset.value = value
							this.update()
						},
					},
				})
		}

		if (!this.valueEditor && this.el.dataset.name != 'animation') {
			this.valueEditor = document.createElement('textarea')
			this.valueEditor.rows = 1
			if (this.info) {
				this.valueEditor.dataset.defaultData = this.info['data'].trim('"')
			}
			this.valueEditor.value = value
			this.valueEditor.id = 'generic-value'
		}

		if (this.info) {
			let description = JSON.stringify(this.info['description'])
			let type = JSON.stringify(this.info['type'])
			let description_title = `${JSON.parse(description)}\n\n<strong> Type:</strong> ${JSON.parse(type).replace('CONFIG_OPTION_', '')}`
			description_title = description_title.charAt(0).toUpperCase() + description_title.slice(1)
			if (JSON.parse(type) === 'CONFIG_OPTION_INT' || JSON.parse(type) === 'CONFIG_OPTION_FLOAT') {
				this.tippyTitle += `\n\n<strong>󱎸  Description:</strong> ${description_title}`
				const [defaultValue, min, max] = this.info['data']
					.split(',')
					.map((item) => item.trim())
					.map(Number)
				this.tippyTitle += `\n<strong>Default:</strong> ${defaultValue} • Min: ${min} • Max: ${max}`
			} else {
				this.tippyTitle += `\n\n<strong>󱎸  Description:</strong> ${description_title}`
				let defaultValue = this.info['data']
				this.tippyTitle += `\n<strong>Default:</strong> ${defaultValue}`
			}
		}

		createToolTippy({ target: this.el, content: this.tippyTitle })
		if (name != 'animation') {
			//todo add a svelte flag
			this.genericEditor_el.appendChild(this.valueEditor)
		}

		if (name === 'generic' || name.startsWith('Custom') || !name) {
			this.keyEditor.classList.remove('hidden')
		} else if (name.startsWith('$')) {
			this.keyEditor.classList.remove('hidden')
			this.keyEditor.value = name
		} else {
			this.keyEditor.value = name
		}

		if (value === 'undefined' || value === '' || !value) {
			value = ''
		}

		this.commentArea = this.el.querySelector('.comment')
		this.commentArea.value = this.el.dataset.comment
		this.createContextMenu()
		this.addListeners()
		this.update()
		this.initial_load = false
	}

	createContextMenu() {
		let contextMenuItems = [
			{
				label: 'Comment Above',
				icon: '',
				action: () => this.add('COMMENT', false),
			},
			{
				label: 'Comment Below',
				icon: '',
				action: () => this.add('COMMENT', true),
			},
			{
				label: 'Add Above',
				icon: '󰅃',
				action: () => this.add('KEY', false),
			},
			{
				label: 'Add Below',
				icon: '󰅀',
				action: () => this.add('KEY', true),
			},
			{
				label: 'Edit name',
				icon: '󰙂',
				action: () => this.editName(),
			},
			{
				label: 'Toggle Disable',
				icon: '󰈉',
				action: () => this.disable(),
			},
			{
				label: 'Delete Key',
				icon: '󰗩',
				action: () => this.delete(),
			},
		]

		let contextMenuItem_reset = {
			label: 'Reset to Default',
			icon: '',
			action: () => this.valueReset(),
		}
		if (this.info) {
			contextMenuItems.splice(4, 0, contextMenuItem_reset)
		}
		this.contextMenu = new ContextMenu(contextMenuItems)
		this.contextMenu.el.tabIndex = 0
		this.el.appendChild(this.contextMenu.el)
	}

	update() {
		let name = this.keyEditor.value
		let formatted = name.replace(/_/g, ' ') || 'Please input a key'
		if (formatted.trim().toLowerCase() === 'animation') {
			formatted = `<a onclick='window.gotoWiki("wiki:animations")' title="Go to Wiki">${formatted}</a>`
		}
		formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
		let value = this.valueEditor?.value ?? this.value ?? 'Please input a value'

		if (name === null || value === null) {
			this.keyEditor.classList.remove('hidden')
			this.el.classList.add('invalid')
		} else {
			this.el.classList.remove('invalid')
		}
		let comment = this.commentArea.value ? `# ${this.commentArea.value}` : ''
		this.preview_el.innerHTML = `<span id="key">${formatted} </span> <span id="value">${value}</span>&nbsp;<i class="preview-comment">${comment}<i>`
		if (!this.initial_load) {
			this.saveDebounced()
		}
	}

	addListeners() {
		this.el.addEventListener('click', (e) => {
			GLOBAL['mainFocus'][GLOBAL['activeTab']] = this.el.dataset.uuid
			if (this.flipValueIfBool(false)) {
			} else {
				this.el.classList.remove('compact')
			}

			this.contextMenu.show()
		})
		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			e.stopPropagation()
			this.contextMenu.show()
		})
		this.el.addEventListener('dblclick', (e) => {
			if (this.el.dataset.name === 'bezier' && this.valueEditor.contains(e.target)) {
				// this.el.classList.toggle('compact')
				// this.contextMenu.hide()
			} else if (this.flipValueIfBool()) {
				// this.contextMenu.hide()
			} else {
				this.el.classList.toggle('compact')
				this.contextMenu.hide()
			}
		})
		this.el.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === 'Space') {
				// console.log("Pressed enter")
				e.preventDefault()
				e.stopPropagation()
				e.stopImmediatePropagation()
				if (this.flipValueIfBool()) {
					return
				}
				this.el.classList.toggle('compact')
				this.contextMenu.show()
			}
			if (e.key === 'Delete') {
				e.preventDefault()
				e.stopPropagation()
				Array.from(this.contextMenu.el.children).forEach((element) => {
					let label_el = element.querySelector('.ctx-button-label')
					if (label_el.textContent.toLowerCase().includes('delete')) {
						setTimeout(() => element.click(), 0)
					}
				})
			}
			if (e.key === 'd') {
				if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
					return
				}
				e.stopPropagation()
				e.stopImmediatePropagation()
				this.disable()
			}
		})
		this.el.addEventListener('focus', (e) => {
			this.contextMenu.show()
		})
		this.el.addEventListener('blur', () => {
			// this.contextMenu.hide()
			// this.el.classList.add("compact")
		})
		this.keyEditor.addEventListener('input', () => {
			this.el.dataset.name = this.keyEditor.value
			this.update()
		})
		this.keyEditor.addEventListener('change', () => {
			this.el.dataset.name = this.keyEditor.value
			this.update()
		})

		this.valueEditor?.addEventListener('input', () => {
			this.el.dataset.value = this.valueEditor.value
			this.update()
		})

		this.valueEditor?.addEventListener('click', (e) => {
			if (this.flipValueIfBool()) {
				e.preventDefault()
			}
		})

		this.valueEditor?.addEventListener('change', () => {
			this.el.dataset.value = this.valueEditor.value
			this.update()
		})

		this.valueEditor?.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.stopPropagation()
				e.stopImmediatePropagation()
			}
		})

		this.commentArea.addEventListener('input', () => {
			this.el.dataset.comment = this.commentArea.value
			this.update()
		})
	}

	addToParent(parent) {
		parent.appendChild(this.el)
	}

	editName() {
		this.keyEditor.classList.remove('hidden')
		this.el.classList.remove('compact')
	}

	async add(type, below = true) {
		switch (type) {
			case 'KEY': {
				const existingSiblingKeys = Array.from(this.el.parentNode.children)
					.filter((el) => el.classList.contains('editor-item-generic'))
					.map((el) => el.dataset.name)

				let availableKeys
				try {
					availableKeys = findAdjacentConfigKeys(this.config_position, existingSiblingKeys)
				} catch (e) {
					console.error('findAdjacentConfigKeys threw:', e)
				}

				let randomKey
				if (Array.isArray(availableKeys) && availableKeys.length > 0) {
					randomKey = await selectFrom(availableKeys, true)
				} else {
					console.warn('availableKeys empty or invalid:', availableKeys)
				}

				console.debug('randomKey raw:', randomKey)

				let name
				let value

				if (randomKey) {
					name = randomKey.name

					try {
						if (
							randomKey.type === 'CONFIG_OPTION_INT' ||
							(typeof randomKey.data === 'string' &&
								randomKey.data.includes(',') &&
								randomKey.data.split(',').length === 3)
						) {
							value = randomKey.data.split(',')[0].trim()
						} else {
							value = randomKey.data
						}
					} catch (e) {
						console.error('Value derivation failed:', e, randomKey)
					}
				} else {
					console.debug('No randomKey selected.')
				}

				console.debug('Derived name/value BEFORE fallback:', {
					name,
					value,
				})

				const allowed_dupes = ['animation', 'bezier', 'gesture']
				const thisName = this.el.dataset.name
				const isAllowedDupe = allowed_dupes.includes(thisName)
				const isInConfigGroup = this.el.parentElement?.classList?.contains('config-group')

				console.debug('Fallback decision inputs:', {
					nameIsFalsy: !name,
					thisName,
					isAllowedDupe,
					isInConfigGroup,
				})

				if ((!name || name.toLowerCase().startsWith('custom')) && (isAllowedDupe || !isInConfigGroup)) {
					console.log('hello', thisName)
					name = thisName
				} else if (!name) {
					console.warn('Falling back to GENERIC')
					name = 'generic'
				}

				if (name === 'bezier') {
					value = 'sample, 0.65, 0.05, 0.33, 0.91'
				}

				console.debug('FINAL name/value:', { name, value })

				let newGenericItem = await addItem('KEY', name, value, '', this.el.dataset.position, this.el.dataset.uuid, below)

				console.debug('addItem result:', newGenericItem)

				let newGenericElement = new EditorItem_Generic({
					name: newGenericItem.name,
					uuid: newGenericItem.uuid,
					value: newGenericItem.value,
					comment: newGenericItem.comment,
					position: this.el.dataset.position,
				})

				if (below) {
					this.el.after(newGenericElement.el)
				} else {
					this.el.before(newGenericElement.el)
				}

				newGenericElement.save()
				newGenericElement.el.click()
				break
			}
			case 'COMMENT':
				let newCommentItem = await addItem(
					'COMMENT',
					'comment',
					'',
					'# New comment',
					this.el.dataset.position,
					this.el.dataset.uuid,
					below,
				)
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
				newCommentElement.save()
				break
		}
	}

	async valueReset() {
		let confirm = await dmenuConfirm()
		if (confirm) {
			if (this.info.type == 'CONFIG_OPTION_INT' || (this.info.data.includes(',') && this.info.data.split(',').length === 3)) {
				this.valueEditor.value = this.info['data'].split(',')[0].trim().trim('"')
			} else {
				this.valueEditor.value = this.info['data'].trim().trim('"')
			}
			this.el.dataset.value = this.valueEditor.value
			this.update()
		}
	}

	flipValueIfBool(save = true) {
		let val
		try {
			val = this.valueEditor.value.toLowerCase().trim()
		} catch (e) {
			// console.error(e)
			return false
		}

		// Define toggle pairs
		const pairs = {
			true: 'false',
			false: 'true',
			on: 'off',
			off: 'on',
			yes: 'no',
			no: 'yes',
		}

		// Find which toggle group this belongs to
		const key = Object.keys(pairs).find((k) => val.startsWith(k))
		const isConfigBool = this.el.dataset.infoType === 'CONFIG_OPTION_BOOL'

		if (key || isConfigBool) {
			if (save) {
				// Determine the opposite value
				let next = pairs[key] || (val === 'true' ? 'false' : 'true')

				// Apply specific flavor
				if (next === 'yes') next = 'yes, please :)'

				// Commit to UI, DOM, and Backend
				this.valueEditor.value = next
				this.el.dataset.value = next
				this.update()
			}
			return true
		}
		return false
	}

	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position)
		this.el.remove()
	}

	/**
	 *
	 * @param {boolean|null} disabled
	 * @param groupSave
	 */
	disable(disabled: boolean | null = null, groupSave = false) {
		if (disabled !== null) {
			this.el.dataset.disabled = disabled.toString()
			disabled === true ? this.el.classList.add('disabled') : this.el.classList.remove('disabled')
		} else {
			this.el.dataset.disabled = this.el.dataset.disabled === 'true' ? 'false' : 'true'
			// this.el.classList.toggle('disabled')
			this.el.dataset.disabled === 'true' ? this.el.classList.add('disabled') : this.el.classList.remove('disabled')
		}
		if (!groupSave) {
			this.saveDebounced()
		} else {
			console.log(`Saving key as a part of a group. Skipping self save.`)
		}
	}

	return() {
		return this.el
	}

	save() {
		let type = this.el.dataset.type
		let name = this.el.dataset.name
		let uuid = this.el.dataset.uuid
		let value = this.el.dataset.value
		let comment = this.el.dataset.comment
		let position = this.el.dataset.position
		let disabled = this.el.dataset.disabled === 'true' ? true : false
		saveKey(type, name, uuid, position, value, comment, disabled)
	}
}
