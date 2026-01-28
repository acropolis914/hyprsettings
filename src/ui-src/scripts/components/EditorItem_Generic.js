import { ContextMenu } from './contextMenu.js'
import { addItem, debounce, deleteKey, saveKey } from '../utils.js'
import { GLOBAL } from '../GLOBAL.js'
import {
	findAdjacentConfigKeys,
	findConfigDescription,
} from '../hyprland-specific/hyprland_config_descriptions.js'
import { EditorItem_Comments } from './EditorItem_Comments.js'
import { SliderModal } from './keyEditor_Slider.js'
import { GradientModal } from './keyEditor_Gradient.js'
import { parseHyprColor } from '../hyprland-specific/colorparser.js'
import { selectFrom } from '../ui_components/dmenu.js'
import { BezierModal } from './keyEditor_Bezier.js'

// class EditorItem_Template {
//     constructor(json, disabled = false,) {
//         this.inital_load = true
//         this.saveDebounced = debounce(() => this.save(), 250);
//         this.update()
//         this.inital_load=true
//     }
//     update() {
//         if (!this.inital_load){
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
export class EditorItem_Generic {
	constructor(json, disabled = false) {
		this.inital_load = true

		let name = json['name']
		let uuid = json['uuid']
		let value = json['value']
		let comment = json['comment']
		let position = json['position']

		this.saveDebounced = debounce(() => this.save(), 15)
		const template = document.getElementById('generic-template')
		this.el = template.content.firstElementChild.cloneNode(true)
		this.el.classList.add('editor-item')
		this.el.classList.add('editor-item-generic')
		if (GLOBAL['config'].compact) {
			this.el.classList.add('compact')
		}
		let position_title = json['position']
			.replace('root:', '')
			.replaceAll(':', ' 󰄾 ')
		this.el.title = `  Location: ${position_title}`
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
		this.genericEditor_el.innerHTML = ''
		this.keyEditor = document.createElement('textarea')
		this.keyEditor.rows = 1
		this.keyEditor.id = 'generic-key'
		// this.config_position = position.split(':').slice(2).join(':')
		this.config_position = position
			.split(':')
			.slice(1) // Remove 'root'
			.map((s) => s.trim())
			.filter((s) => !s.endsWith('.conf'))
			.join(':')
		// console.log(this.config_position)
		this.info = findConfigDescription(this.config_position, name)
		if (this.info) {
			this.el.dataset.infoType = this.info['type']
			switch (this.info['type']) {
				case 'CONFIG_OPTION_INT':
				case 'CONFIG_OPTION_FLOAT': {
					// console.log(this.el.dataset.name, "is an int with range", this.info.data)
					const [defaultValue, min, max] = this.info['data']
						.split(',')
						.map((item) => item.trim())
						.map(Number)
					let data = this.info['data']
					// console.log({ min, max, data })
					this.valueEditor = new SliderModal(
						min,
						max,
						this.info['type'] === 'CONFIG_OPTION_INT'
							? false
							: true,
					).el
					this.valueEditor.value = value
					break
				}

				case 'CONFIG_OPTION_COLOR': {
					try {
						this.valueEditor =
							document.createElement('input')
						this.valueEditor.setAttribute(
							'type',
							'text',
						)
						this.valueEditor.setAttribute(
							'data-coloris',
							'',
						)
						if (parseInt(value)) {
							value = Number(value)
						}
						this.valueEditor.value =
							parseHyprColor(value)
						this.valueEditor.style.backgroundColor =
							this.valueEditor.value
						this.valueEditor.style.color = 'transparent'
						this.valueEditor.addEventListener(
							'input',
							() => {
								this.valueEditor.style.backgroundColor =
									this.valueEditor.value
							},
						)
					} catch (E) {
						this.valueEditor = null
					}
					break
				}

				case 'CONFIG_OPTION_GRADIENT': {
					try {
						this.valueEditor = new GradientModal(
							value,
						).el
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
				// this.el.style.backgroundColor = "red"
				// console.log({value})
				// console.log({name, rest})
				this.valueEditor = new BezierModal(value).el
		}

		if (!this.valueEditor) {
			this.valueEditor = document.createElement('textarea')
			this.valueEditor = document.createElement('textarea')
			this.valueEditor.rows = 1
			this.valueEditor.rows = 1
			if (this.info) {
				this.valueEditor.dataset.defaultData = this.info['data']
			}
			this.valueEditor.value = value
		}

		if (this.info) {
			// console.log(this.info['type'])
			let description = JSON.stringify(this.info['description'])
			let type = JSON.stringify(this.info['type'])

			let description_title = `${JSON.parse(description)}\n\n Type: ${JSON.parse(type).replace('CONFIG_OPTION_', '')}`
			description_title =
				description_title.charAt(0).toUpperCase() +
				description_title.slice(1)
			if (
				JSON.parse(type) === 'CONFIG_OPTION_INT' ||
				JSON.parse(type) === 'CONFIG_OPTION_FLOAT'
			) {
				this.el.title += `\n\n󱎸  Description: ${description_title}`
				const [defaultValue, min, max] = this.info['data']
					.split(',')
					.map((item) => item.trim())
					.map(Number)
				this.el.title += `\nDefault: ${defaultValue} • Min: ${min} • Max: ${max}`
			} else {
				this.el.title += `\n\n󱎸  Description: ${description_title}`
				let defaultValue = this.info['data']
				this.el.title += `\nDefault: ${defaultValue}`
			}
			// this.valueEditor.title = title
		}

		this.valueEditor.id = 'generic-value'
		if (name.startsWith('$') || name === 'generic') {
			this.genericEditor_el.appendChild(this.keyEditor)
		}

		this.genericEditor_el.appendChild(this.valueEditor)
		this.keyEditor.value = name
		this.commentArea = this.el.querySelector('.comment')
		this.commentArea.value = this.el.dataset.comment

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
			//cause if there is an info, there is also a default value
			contextMenuItems.splice(4, 0, contextMenuItem_reset)
		}

		this.contextMenu = new ContextMenu(contextMenuItems)
		this.el.appendChild(this.contextMenu.el)
		this.addListeners()
		this.update()
		this.inital_load = false
	}

	update() {
		let name = this.keyEditor.value
		let formatted = name.replace(/_/g, ' ')
		formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
		let value = this.valueEditor.value
		let comment = this.commentArea.value
			? `# ${this.commentArea.value}`
			: ''
		this.preview_el.innerHTML = `<span id="key">${formatted} </span> <span id="value">${value}</span>&nbsp;<i class="preview-comment">${comment}<i>`
		if (!this.inital_load) {
			this.saveDebounced()
		}
	}

	addListeners() {
		this.el.addEventListener('click', (e) => {
			if (this.flipValueIfBool()) {
				// this.contextMenu.hide()
			} else {
				this.el.classList.remove('compact')
			}
			this.contextMenu.show()
		})
		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			this.contextMenu.show()
		})
		this.el.addEventListener('dblclick', (e) => {
			if (
				this.el.dataset.name === 'bezier' &&
				this.valueEditor.contains(e.target)
			) {
				// this.el.classList.toggle('compact')
				// this.contextMenu.hide()
			} else if (
				this.el.dataset.infoType === 'CONFIG_OPTION_BOOL'
			) {
				// this.contextMenu.hide()
			} else {
				this.el.classList.toggle('compact')
				this.contextMenu.hide()
			}
		})
		this.el.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				// console.log("Pressed enter")
				if (this.flipValueIfBool()) {
					return
				}
				this.el.classList.toggle('compact')
				this.contextMenu.el.classList.toggle('hidden')
			}
			if (e.key === 'Delete') {
				e.preventDefault()
				e.stopPropagation()
				Array.from(this.contextMenu.el.children).forEach(
					(element) => {
						let label_el =
							element.querySelector(
								'.ctx-button-label',
							)
						if (
							label_el.textContent
								.toLowerCase()
								.includes('delete')
						) {
							setTimeout(() => element.click(), 0)
						}
					},
				)
			}
			if (e.key === 'd') {
				if (
					e.target.tagName === 'TEXTAREA' ||
					e.target.tagName === 'INPUT'
				) {
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

		this.valueEditor.addEventListener('input', () => {
			this.el.dataset.value = this.valueEditor.value
			// console.log(this.valueEditor)
			this.update()
		})

		this.valueEditor.addEventListener('click', (e) => {
			if (this.flipValueIfBool()) {
				e.preventDefault()
			}
		})

		this.valueEditor.addEventListener('change', () => {
			this.el.dataset.value = this.valueEditor.value
			this.update()
		})

		this.commentArea.addEventListener('input', () => {
			this.el.dataset.comment = this.commentArea.value
			this.update()
		})
	}

	addToParent(parent) {
		parent.appendChild(this.el)
	}

	async add(type, below = true) {
		switch (type) {
			case 'KEY': {
				console.group('ADD KEY')

				console.debug('Current element:', this.el)
				console.debug('dataset:', { ...this.el.dataset })
				console.debug(
					'parent classes:',
					this.el.parentElement?.classList?.value,
				)

				const existingSiblingKeys = Array.from(
					this.el.parentNode.children,
				)
					.filter((el) =>
						el.classList.contains(
							'editor-item-generic',
						),
					)
					.map((el) => el.dataset.name)

				console.debug(
					'existingSiblingKeys:',
					existingSiblingKeys,
				)

				let availableKeys
				console.debug(this.config_position)
				try {
					availableKeys = findAdjacentConfigKeys(
						this.config_position,
						existingSiblingKeys,
					)
				} catch (e) {
					console.error('findAdjacentConfigKeys threw:', e)
				}
				// console.table(availableKeys);

				let randomKey
				if (
					Array.isArray(availableKeys) &&
					availableKeys.length > 0
				) {
					// const idx = Math.floor(Math.random() * availableKeys.length);
					// randomKey = availableKeys[idx];
					// console.debug('Random index:', idx);
					randomKey = await selectFrom(availableKeys)
				} else {
					console.warn(
						'availableKeys empty or invalid:',
						availableKeys,
					)
				}

				console.debug('randomKey raw:', randomKey)

				let name
				let value

				if (randomKey) {
					// console.debug('randomKey fields:', {
					// 	name: randomKey.name,
					// 	type: randomKey.type,
					// 	data: randomKey.data
					// });

					name = randomKey.name

					try {
						if (
							randomKey.type ===
								'CONFIG_OPTION_INT' ||
							(typeof randomKey.data === 'string' &&
								randomKey.data.includes(',') &&
								randomKey.data.split(',')
									.length === 3)
						) {
							value = randomKey.data
								.split(',')[0]
								.trim()
						} else {
							value = randomKey.data
						}
					} catch (e) {
						console.error(
							'Value derivation failed:',
							e,
							randomKey,
						)
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
				const isInConfigGroup =
					this.el.parentElement?.classList?.contains(
						'config-group',
					)

				console.debug('Fallback decision inputs:', {
					nameIsFalsy: !name,
					thisName,
					isAllowedDupe,
					isInConfigGroup,
				})

				if (!name && (isAllowedDupe || !isInConfigGroup)) {
					console.warn(
						'Using dataset name due to dupe rules',
					)
					name = thisName
				} else if (!name) {
					console.warn('Falling back to GENERIC')
					name = 'generic'
				}

				if (name === 'bezier') {
					value = 'sample, 0.65, 0.05, 0.33, 0.91'
				}

				console.debug('FINAL name/value:', { name, value })

				let newGenericItem = await addItem(
					'KEY',
					name,
					value,
					'',
					this.el.dataset.position,
					this.el.dataset.uuid,
					below,
				)

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

				console.groupEnd()
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

	valueReset() {
		if (
			this.info.type == 'CONFIG_OPTION_INT' ||
			(this.info.data.includes(',') &&
				this.info.data.split(',').length === 3)
		) {
			this.valueEditor.value = this.info['data']
				.split(',')[0]
				.trim()
		} else {
			this.valueEditor.value = this.info['data']
		}
		this.el.dataset.value = this.valueEditor.value
		this.update()
	}

	flipValueIfBool() {
		if (
			this.el.dataset.infoType === 'CONFIG_OPTION_BOOL' ||
			this.el.dataset.value === 'on' ||
			this.el.dataset.value === 'off'
		) {
			if (
				this.valueEditor.value === 'true' ||
				this.valueEditor.value === 'false'
			) {
				this.valueEditor.value =
					this.valueEditor.value === 'true'
						? 'false'
						: 'true'
			} else if (
				this.el.dataset.value === 'on' ||
				this.el.dataset.value === 'off'
			) {
				this.valueEditor.value =
					this.valueEditor.value === 'on' ? 'off' : 'on'
			}

			this.el.dataset.value = this.valueEditor.value
			// console.log(this.inital_load)
			this.update()
			return true
		} else {
			return false
		}
	}

	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position)
		this.el.remove()
	}

	/**
	 *
	 * @param {boolean|null} disabled
	 */
	disable(disabled = null, groupSave = false) {
		if (disabled !== null) {
			this.el.dataset.disabled = disabled.toString()
			disabled === true
				? this.el.classList.add('disabled')
				: this.el.classList.remove('disabled')
		} else {
			this.el.dataset.disabled =
				this.el.dataset.disabled === 'true' ? 'false' : 'true'
			// this.el.classList.toggle('disabled')
			this.el.dataset.disabled === 'true'
				? this.el.classList.add('disabled')
				: this.el.classList.remove('disabled')
		}
		if (!groupSave) {
			this.saveDebounced()
		} else {
			console.log(
				`Saving key as a part of a group. Skipping self save.`,
			)
		}
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
