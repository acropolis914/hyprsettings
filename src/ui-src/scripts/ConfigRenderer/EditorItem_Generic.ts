import { ContextMenu } from './contextMenu.js'
import { addItem, deleteKey, saveKey } from '../utils/utils.js'
import { debounce } from '../utils/helpers.js'
import { GLOBAL } from '../GLOBAL.js'
import { EditorItem_Comments } from './EditorItem_Comments.js'
import { SliderModal } from './keyEditor_Slider.js'
import { GradientModal } from './keyEditor_Gradient.js'
import { parseHyprColor } from '@scripts/HyprlandSpecific/colorparser.js'
import { dmenuConfirm, selectFrom } from '../ui_components/dmenu.js'
import { BezierModal } from './keyEditor_Bezier.js'
import { html, render } from 'lit'
import { gotoWiki } from '../ui_components/wikiTab.ts'
import { mount } from 'svelte'
import keyEditor_Animation from '@scripts/ConfigRenderer/keyEditor_Animation.svelte'
import createToolTippy from '@scripts/ui_components/toolTippy.ts'
import { ColorModal } from '@scripts/ConfigRenderer/keyEditor_Color.ts'
import { newEditorItemGeneric } from '@scripts/HyprlandSpecific/editorItem_newKey.ts' // optional for styling
import keyEditor_Bind from '@scripts/ConfigRenderer/keyEditor_Bind.svelte'
import { findAdjacentConfigKeys, findConfigDescription } from '@scripts/HyprlandSpecific/configDescriptionTools.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'
import nameEditor_Chooser from '@scripts/ConfigRenderer/nameEditor_Chooser.svelte'
// import hljs from 'highlight.js/lib/core'
// import bash from 'highlight.js/lib/languages/bash.js'
// hljs.registerLanguage('bash', bash)

// class EditorItem_Template {
//     constructor(json, disabled = false,) {
//         this.initial_load = true
//         this.saveDebounced = debounce(() => this.save(), 250);
//         this.update()
//         this.initial_load=true
//     }
//     update() {
//         if (!this.initial_load){import bash from 'highlight.js/lib/languages/bash'
// // hljs.registerLanguage('bash', bash)
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
		<!--		<div class="editor-item-preview"></div>-->
		<div class="preview-wrapper">
			<div class="editor-item-preview"></div>
			<div class="save-editor-item-wrapper hidden"><button id="save-editor-item">Save</button></div>
		</div>
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

const wikiMap = {
	animation: 'animations',
	bind: 'binds:#basic',
	windowrule: 'window-rules',
	layerrule: 'window-rules:#layer-rules',
	monitor: 'monitors',
	workspace: 'workspace-rules',
	input: 'variables:#input',
	source: 'keywords:#sourcing-multi-file',
	decoration: 'variables#decoration',
	gestures: 'variables#gestures',
	misc: 'variables#misc',
	plugin: 'plugins',
	env: 'environment-variables',
	exec: 'keywords:#executing',
	bezier: 'animations:#curves',
}

export const execNames = [
	{ name: 'exec-once', description: 'command will execute only on launch (support rules)' },
	{ name: 'execr-once', description: 'command will execute only on launch' },
	{ name: 'exec', description: 'command will execute on each reload (support rules)' },
	{ name: 'execr', description: 'command will execute on each reload' },
	{ name: 'exec-shutdown', description: 'command will execute only on shutdown' },
]

void execNames

export class EditorItem_Generic {
	tippyTitle: string
	initial_load: boolean
	el: Node | HTMLDivElement
	preview_el: HTMLDivElement
	saveDebounced: () => void | any
	keyEditor: HTMLTextAreaElement
	genericEditor_el: Element
	valueEditor: any
	info: ConfigDescription
	private contextMenu: ContextMenu
	private commentArea: HTMLTextAreaElement
	config_position: any
	private value: any
	private isBoolean: boolean = false

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
		this.el = template.firstElementChild!.cloneNode(true)

		if (GLOBAL['config'].compact) {
			this.el.classList.add('compact')
		}

		this.el.dataset.name = name
		this.el.dataset.uuid = uuid
		this.el.dataset.value = value ?? ''
		this.el.dataset.comment = comment ?? ''
		this.el.dataset.position = position ?? ''
		this.el.dataset.disabled = disabled ? 'true' : 'false'
		this.el.dataset.type = 'KEY'
		this.el.disable = this.disable.bind(this)

		if (disabled === true) {
			this.el.classList.add('disabled')
		}

		this.preview_el = this.el.querySelector('.editor-item-preview')
		this.genericEditor_el = this.el.querySelector('.generic-editor')
		this.createNameEditor(name)
		this.config_position = position
			.split(':')
			.slice(1) // Remove 'root'
			.map((s: string) => s.trim())
			.filter((s: string) => !s.endsWith('.conf'))
			.join(':')

		this.info = findConfigDescription(this.config_position, name, ['GROUP'])

		this.valueEditor = this.createValueEditor(value)
		if (!this.valueEditor && this.el.dataset.name !== 'animation' && !this.el.dataset.name.startsWith('bind')) {
			// console.log(this.el.dataset, 'has no value editor')
			this.valueEditor = document.createElement('textarea')
			this.valueEditor.rows = 1
			if (this.info) this.valueEditor.dataset.defaultData = this.info.data.trim('"')
			this.valueEditor.value = value
			this.valueEditor.id = 'generic-value'
		}

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
		} else if (name.startsWith('exec')) {
			this.genericEditor_el.style.flex
		} else {
			this.keyEditor.value = name
		}

		if (value === 'undefined' || value === '' || !value) {
			value = ''
		}

		this.commentArea = this.el.querySelector('.comment')
		this.commentArea.value = this.el.dataset.comment

		this.createTooltip(json)
		this.addListeners()
		this.update()
		setTimeout(() => {
			this.initial_load = false
		}, 20)
	}

	private createNameEditor(name) {
		if (name.startsWith('exec')) {
			mount(nameEditor_Chooser, {
				target: this.genericEditor_el,
				props: {
					value: name,
					items: execNames,
					orientation: 'horizontal',
					onChange: (value) => {
						this.el.dataset.name = value
						this.update()
					},
				},
			})
			// this.keyEditor = document.createElement('textarea')
			// this.keyEditor.rows = 1
			// this.keyEditor.id = 'generic-key'
			// // this.keyEditor.classList.add('')
			// this.keyEditor.setAttribute('placeholder', 'Input key here...')
			// this.genericEditor_el.appendChild(this.keyEditor)
		} else {
			this.keyEditor = document.createElement('textarea')
			this.keyEditor.rows = 1
			this.keyEditor.id = 'generic-key'
			this.keyEditor.classList.add('hidden')
			this.keyEditor.setAttribute('placeholder', 'Input key here...')
			this.genericEditor_el.appendChild(this.keyEditor)
		}
	}

	createValueEditor(value: string) {
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
		} else if (this.el.dataset.name.startsWith('bind')) {
			mount(keyEditor_Bind, {
				target: this.genericEditor_el,
				props: {
					inputValue: value,
					bindName: this.el.dataset.name,
					onChange: (v) => {
						this.value = v
						this.el.dataset.value = v
						this.update()
					},
					onNameChange: (name) => {
						this.el.dataset.name = name
						this.keyEditor.value = name
						this.update()
					},
				},
			})
			return null
		} else if (this.flipValueIfBool(false) || this.el.dataset.name === 'enable' || this.info?.type === 'CONFIG_OPTION_BOOL') {
			// Extracted and modified logic from the else/reordered block
			this.isBoolean = true
			const ta = document.createElement('textarea')
			ta.id = 'generic-value'
			ta.rows = 1
			ta.value = value

			if (this.info) {
				ta.dataset.defaultData = this.info.data.trim('"')
			}

			/*
			const checkbox = document.createElement('input')
			checkbox.type = 'checkbox'
			if (this.info && this.info.data.startsWith('"') && this.info.data.endsWith('"'))
			    checkbox.dataset.defaultData = this.info.data.replace(/^"|"$/g, '')
			checkbox.checked = this.parseBool(this.el.dataset.value)
			console.log({ given: this.el.dataset.value, output: this.parseBool(this.el.dataset.value) })
			checkbox.id = 'generic-value'
			*/

			const checkboxWrapper = document.createElement('label')
			checkboxWrapper.classList.add('switch', 'preview-boolean-switch')

			const checkbox2 = document.createElement('input')
			checkbox2.type = 'checkbox'
			checkbox2.id = 'preview-boolean-switch-box'
			checkbox2.checked = this.parseBool(this.el.dataset.value)

			const fakeSlider = document.createElement('span')
			fakeSlider.className = 'fake-slider'

			// Event Listeners
			checkboxWrapper.addEventListener('click', (e) => {
				// e.stopPropagation()
			})

			checkbox2.addEventListener('change', (e) => {
				if (this.initial_load) return

				const val = this.el.dataset.value?.trim()

				if (val === '0' || val === '1') {
					// Determine the new value (toggle it)
					const newValue = val === '1' ? '0' : '1'

					// Update the DOM and your editor state
					this.el.dataset.value = newValue
					this.valueEditor.value = newValue

					console.log(`Changed value from ${val} to ${newValue}`)
				} else {
					this.flipValueIfBool(true)
				}
				this.update()
			})

			// DOM Assembly
			checkboxWrapper.appendChild(checkbox2)
			checkboxWrapper.appendChild(fakeSlider)
			this.el.querySelector('.preview-wrapper').appendChild(checkboxWrapper)

			// console.log(ta.value, this.el.dataset.name)

			return ta
		} else {
			const ta = document.createElement('textarea')
			ta.rows = 1
			if (this.info) ta.dataset.defaultData = this.info.data.trim('"')
			ta.value = value
			ta.id = 'generic-value'
			return ta
		}
	}

	private createTooltip(json: string | object) {
		let position_title = json['position'].replace('root:', '').replaceAll(':', ' 󰄾 ')
		this.tippyTitle = `<strong>  Location:</strong> ${position_title}`

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
	}

	createContextMenu(x = 0, y = 0, show = true) {
		if (x == 0 || y == 0) {
			let [x0, x1, y0, y1] = this.getElementRects()
			x = x1
			y = y1
		}
		// console.log({ x, y })
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
				label: `${this.keyEditor?.classList.contains('hidden') ? 'Edit Name' : 'Hide name'}`,
				icon: '󰙂',
				action: () => this.editName(),
			},
			{
				label: `${this.el.dataset.disabled === 'true' ? 'Enable' : 'Disable'}`,
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
		if (show) {
			this.contextMenu.show(x, y)
		}
	}

	update() {
		let name = this.el.dataset.name ?? this.keyEditor.value ?? ''
		if (this.keyEditor && this.keyEditor?.value !== name) {
			this.keyEditor.value = name
		}
		let formatted = name.replace(/_/g, ' ') || 'Please input a key'
		const lower = formatted.trim().toLowerCase()

		// Find if the string starts with any of our keys
		const match = Object.keys(wikiMap).find((key) => lower.startsWith(key))

		if (match) {
			const path = wikiMap[match]
			formatted = `<a onclick='window.gotoWiki("wiki:configuring:${path}")' title="Go to ${match} wiki">${formatted}</a>`
		}
		formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)

		let value = this.valueEditor?.value ?? this.value ?? 'Please input a value'
		if (name === '' || value === null) {
			this.keyEditor.classList.remove('hidden')
			this.el.classList.add('invalid')
		} else {
			this.el.classList.remove('invalid')
		}
		let comment = this.commentArea.value ? `# ${this.commentArea.value}` : ''

		this.preview_el.innerHTML = `<span id="key">${formatted} </span><span id="equal-sign">= </span><span id="value">${value}</span>&nbsp;<i class="preview-comment">${comment}<i>`
		if (!this.initial_load) {
			this.saveDebounced()
		}
	}

	getElementRects(): number[] {
		this.el.offsetHeight
		let box = this.el.getBoundingClientRect()
		let [x1, x2, y1, y2] = [box.left, box.right, box.top, box.bottom]
		return [x1, x2, y1, y2]
	}

	addListeners() {
		this.el.addEventListener('click', (e) => {
			GLOBAL['mainFocus'][GLOBAL['activeTab']] = this.el.dataset.uuid
			// GLOBAL.setKey('previousView', GLOBAL.currentView)
			// GLOBAL.setKey('currentView', 'editorItem')
			if (this.isBoolean) {
			} else {
				this.el.classList.remove('compact')
			}
			// this.createContextMenu()
		})
		// this.el.addEventListener('contextmenu', (e) => {
		// 	e.preventDefault()
		// 	e.stopPropagation()
		//
		// 	this.createContextMenu()
		// })

		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			e.stopPropagation()
			// e is a MouseEvent
			if (e.pointerType === 'mouse' || e instanceof MouseEvent) {
				// Mouse right-click
				console.log('Mouse right-click at:', e.clientX, e.clientY)
				this.createContextMenu(e.clientX, e.clientY)
			} else {
				this.createContextMenu()
			}

			// Optional: prevent default context menu
			e.preventDefault()
		})
		this.el.addEventListener('dblclick', (e) => {
			if (this.el.dataset.name === 'bezier' && this.valueEditor.contains(e.target)) {
				// this.el.classList.toggle('compact')
				// this.contextMenu.hide()
			} else if (this.flipValueIfBool()) {
				// this.contextMenu.hide()
			} else {
				this.el.classList.toggle('compact')
				this.contextMenu?.hide()
			}
		})
		this.el.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === 'Space') {
				if (e.target != this.el) return
				// GLOBAL.setKey('currentView', 'editorItem')
				// console.log("Pressed enter")
				e.preventDefault()
				e.stopPropagation()
				e.stopImmediatePropagation()
				if (this.flipValueIfBool()) {
					return
				}
				this.el.classList.toggle('compact')
				this.createContextMenu()
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
			// this.createContextMenu()
		})
		this.el.addEventListener('blur', (e) => {
			const nextTarget = e.relatedTarget as HTMLElement | null
			if (nextTarget?.closest('.context-menu')) {
				return
			}

			// Delay slightly so click/focus on detached context menu buttons can settle.
			setTimeout(() => {
				const active = document.activeElement as HTMLElement | null
				if (active?.closest('.context-menu')) {
					return
				}
				this.contextMenu?.hide()
			}, 20)

			// this.el.classList.add("compact")
		})
		this.keyEditor?.addEventListener('input', (e) => {
			if (e.key === 'Enter') {
				e.stopPropagation()
				this.keyEditor?.classList.add('hidden')
			}
			this.el.dataset.name = this.keyEditor.value
			this.update()
		})
		this.keyEditor?.addEventListener('change', () => {
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
		if (this.keyEditor && this.keyEditor.classList.contains('hidden')) {
			this.keyEditor.classList.remove('hidden')
			this.el.classList.remove('compact')
		} else {
			this.keyEditor?.classList.add('hidden')
		}
	}

	async add(type: string, below = true) {
		switch (type) {
			case 'KEY':
				await newEditorItemGeneric({
					relatedElement: this.el,
					position: this.config_position,
					below: below,
				})
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

		if (key || isConfigBool || this.el.dataset.name === 'enable') {
			if (save) {
				// Determine the opposite value
				let next = pairs[key] || (val === 'true' ? 'false' : 'true') || (val === '1' ? '0' : '1')

				// Apply specific flavor
				if (next === 'yes') next = 'yes, please :)'

				// Commit to UI, DOM, and Backend
				this.valueEditor.value = next
				this.el.dataset.value = next
				const previewCheckboxEl = this.el.querySelector('#preview-boolean-switch-box') as HTMLInputElement
				previewCheckboxEl.checked = ['yes', 'true', 'on', '1'].some((t) => next.startsWith(t))
				this.update()
			}
			return true
		}
		return false
	}
	parseBool(str: string): boolean {
		if (typeof str !== 'string') return null

		let val = str.toLowerCase().trim()

		// normalize known truthy / falsy prefixes
		const truthy = ['true', 'on', 'yes', '1']
		const falsy = ['false', 'off', 'no', '0', '', ' ']

		// check truthy
		if (truthy.some((k) => val.startsWith(k))) return true

		// check falsy
		if (falsy.some((k) => val.startsWith(k))) return false

		return null // not a boolean-like string
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
