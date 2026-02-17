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
import { ColorModal } from '@scripts/ConfigRenderer/keyEditor_Color.ts'
import { newEditorItemGeneric } from '@scripts/HyprlandSpecific/editorItem_newKey.ts' // optional for styling

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
	private contextMenu: HTMLElement
	private commentArea: HTMLElement
	config_position: any

	constructor(json: string | object, disabled = false) {
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
		this.keyEditor = document.createElement('textarea')
		this.keyEditor.rows = 1
		this.keyEditor.id = 'generic-key'
		this.keyEditor.classList.add('hidden')
		this.keyEditor.setAttribute('placeholder', 'Input key here...')
		this.genericEditor_el.appendChild(this.keyEditor)
		this.config_position = position
			.split(':')
			.slice(1) // Remove 'root'
			.map((s: string) => s.trim())
			.filter((s: string) => !s.endsWith('.conf'))
			.join(':')

		this.info = findConfigDescription(this.config_position, name)

		this.valueEditor = this.createValueEditor(value)
		if (!this.valueEditor && this.el.dataset.name !== 'animation') {
			// console.log(this.el.dataset, 'has no value editor')
			this.valueEditor = document.createElement('textarea')
			this.valueEditor.rows = 1
			if (this.info) this.valueEditor.dataset.defaultData = this.info.data.trim('"')
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
				let defaultValue = this.info['data']?.replace(/^\s*"(.*)"\s*$/, '$1')
				this.tippyTitle += `\n<strong>Default:</strong> ${defaultValue}`
			}
		}

		createToolTippy({ target: this.el, content: this.tippyTitle })
		if (this.valueEditor && name != 'animation') {
			//todo add a svelte flag
			try {
				this.genericEditor_el.appendChild(this.valueEditor)
			} catch (e) {
				// this.genericEditor_el.appendChild(this.valueEditor.el)
				console.log(this.valueEditor, this.el.dataset)
				console.error(e)
			}
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
		setTimeout(() => {
			this.initial_load = false
		}, 20)
	}

	createValueEditor(value) {
		if (this.info?.type === 'CONFIG_OPTION_INT' || this.info?.type === 'CONFIG_OPTION_FLOAT') {
			this.el.dataset.infoType = this.info.type
			const [def, min, max] = this.info.data.split(',').map((s) => Number(s.trim()))
			const isFloat = this.info.type !== 'CONFIG_OPTION_INT'
			const editor = new SliderModal(min, max, isFloat)
			editor.value = value
			return editor
		} else if (this.info?.type === 'CONFIG_OPTION_COLOR') {
			this.el.dataset.infoType = this.info.type
			try {
				return new ColorModal(value)
			} catch {
				return null
			}
		} else if (this.info?.type === 'CONFIG_OPTION_GRADIENT') {
			this.el.dataset.infoType = this.info.type
			try {
				return new GradientModal(value)
			} catch {
				return null
			}
		} else if (this.el.dataset.name === 'bezier') {
			return new BezierModal(value)
		} else if (this.el.dataset.name === 'animation') {
			mount(keyEditor_Animation, {
				target: this.genericEditor_el,
				props: {
					inputValue: value,
					onChange: (v) => {
						this.value = v
						this.el.dataset.value = v
						this.update()
					},
				},
			})
			return null
		} else {
			const ta = document.createElement('textarea')
			ta.rows = 1
			if (this.info) ta.dataset.defaultData = this.info.data.trim('"')
			ta.value = value
			ta.id = 'generic-value'
			return ta
		}
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
			// GLOBAL.setKey('previousView', GLOBAL.currentView)
			// GLOBAL.setKey('currentView', 'editorItem')
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
				// GLOBAL.setKey('currentView', 'editorItem')
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
			// GLOBAL.setKey('currentView', GLOBAL.previousView)
			this.contextMenu.hide()
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
		if (this.keyEditor.classList.contains('hidden')) {
			this.keyEditor.classList.remove('hidden')
			this.el.classList.remove('compact')
		} else {
			this.keyEditor.classList.add('hidden')
		}
	}

	async add(type: string, below = true) {
		switch (type) {
			case 'KEY':
				await newEditorItemGeneric({ relatedElement: this.el, position: this.config_position, below: below })
				break

			case 'COMMENT':
				break
		}
	}

	async valueReset() {
		let confirm = await dmenuConfirm()
		if (confirm) {
			if (this.info.type == 'CONFIG_OPTION_INT' || (this.info.data.includes(',') && this.info.data.split(',').length === 3)) {
				this.valueEditor.value = this.info['data'].split(',')[0].replace(/^\s*"(.*)"\s*$/, '$1')
			} else {
				this.valueEditor.value = this.info['data'].replace(/^\s*"(.*)"\s*$/, '$1')
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

	async delete() {
		let nextSibling = this.el.nextElementSibling || this.el.previousElementSibling
		let confirm = await dmenuConfirm()
		if (confirm) {
			deleteKey(this.el.dataset.uuid, this.el.dataset.position)
			nextSibling.focus()
			this.el.remove()
		}
	}

	disable(disabled: boolean | null = null, groupSave: boolean = false) {
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
		let disabled = this.el.dataset.disabled === 'true'
		saveKey(type, name, uuid, position, value, comment, disabled)
	}
}
