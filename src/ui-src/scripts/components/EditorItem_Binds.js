import {
	bindFlags,
	modkeys,
	dispatchers,
} from '../hyprland-specific/hyprlandBindDefinitions.js'
import { ContextMenu } from './contextMenu.js'
import {
	addItem,
	debounce,
	deleteKey,
	saveKey,
	splitWithRemainder,
} from '../utils.js'
import { GLOBAL } from '../GLOBAL.js'
import { EditorItem_Comments } from './EditorItem_Comments.js'

// import TomSelect from "../../jslib/tom-select.complete.min"

export class EditorItem_Binds {
	constructor(json, disabled = false) {
		this.initial_load = true
		let name = json['name']
		let uuid = json['uuid']
		let value = json['value']
		let comment = json['comment']
		let position = json['position']
		if (!name.trim().startsWith('bind')) {
			return
		}
		const template = document.getElementById('keybind-template')
		this.el = template.content.firstElementChild.cloneNode(true)
		// @ts-ignore
		if (GLOBAL['config'].compact) {
			this.el.classList.add('compact')
		}
		if (disabled) {
			this.el.classList.add('disabled')
		}
		let position_title = json['position']
			.replace('root:', '')
			.replaceAll(':', ' 󰄾 ')
		this.el.title = `  Location: ${position_title}`
		// this.el.title = position.replace('root:', '')
		this.el.dataset.name = name
		this.el.dataset.uuid = uuid
		this.el.dataset.value = value ?? ''
		this.el.dataset.comment = comment ?? ''
		this.el.dataset.position = position ?? ''
		this.el.dataset.disabled = disabled ?? false
		this.el.dataset.type = 'KEY'
		this.preview = ''
		this.contextMenu = new ContextMenu([
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
				label: 'NewBind Above',
				icon: '󰅃',
				action: () => this.add('KEY', false),
			},
			{
				label: 'NewBind Below',
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
		])
		this.el.appendChild(this.contextMenu.el)
		this.saveDebounced = debounce(() => this.save(), 100)

		this.addElements(name, comment, parent)

		this.addListeners()
		this.update()
		this.initial_load = false
	}

	addElements(name, comment) {
		let bindflag_additems = this.el.dataset.name
			.trim()
			.substring(4)
			.split('')
		let values = splitWithRemainder(this.el.dataset.value, ',', 3)
		this.hasDescription = bindflag_additems.includes('d')
		if (this.hasDescription) {
			// console.debug(`${this.el.dataset.name} = ${this.el.dataset.value} has a description`)
			values = splitWithRemainder(this.el.dataset.value, ',', 4)
		}

		const renderflags = {
			option: function (data, escape) {
				return (
					`<div title="${data.description}">` +
					escape(data.text) +
					`</div>`
				)
			},
			item: function (data, escape) {
				return (
					`<div title="${data.description}">` +
					escape(data.text) +
					`</div>`
				)
			},
		}
		//bindflags
		let bindflag_select_el = this.el.querySelector('.bindflags')

		this.bindflagTS = new TomSelect(bindflag_select_el, {
			options: bindFlags,
			valueField: 'value',
			searchField: 'value',
			labelField: 'value',
			highlight: false,
			duplicates: false,
			hideSelected: true,
			onChange: (value) => {
				if (!this.initial_load) {
					this.update()
				}
			},
			render: renderflags,
		})
		if (bindflag_additems.length == 0) {
			this.bindflagTS.addItem('')
		} else {
			bindflag_additems.forEach((element) => {
				this.bindflagTS.addItem(element)
			})
		}

		//modkeys
		let modkey_select_el = this.el.querySelector('.modkey')
		this.modkeyTS = new TomSelect(modkey_select_el, {
			options: modkeys,
			create: true,
			highlight: false,
			valueField: 'value',
			searchField: 'text',
			onChange: (value) => {
				if (!this.initial_load) {
					this.update()
				}
			},
			render: renderflags,
		})
		let modkeys_additems = values[0].split(' ')
		modkeys_additems.forEach((element) => {
			if (this.hasMod(element)) {
				this.modkeyTS.addItem(element)
			} else {
				this.modkeyTS.createItem(element)
			}
		})

		let key_el = this.el.querySelector('.keypress')
		key_el.rows = 1
		key_el.textContent = values[1].trim()
		key_el.addEventListener('keydown', (e) => {
			if (e.key === ',') {
				e.preventDefault() // prevent the comma from being typed
			}
		})
		key_el.addEventListener('input', (e) => {
			if (!this.initial_load) {
				this.update()
			}
		})

		let description_el = this.el.querySelector('.description')
		if (this.hasDescription) {
			description_el.classList.remove('hidden')
			description_el.textContent = values[2].trim()
		}
		description_el.addEventListener('keydown', (e) => {
			if (e.key === ',') {
				e.preventDefault() // prevent the comma from being typed
			}
		})
		description_el.addEventListener('input', (e) => {
			if (!this.initial_load) {
				this.update()
			}
		})

		const dispatcherSelect_el = this.el.querySelector('.dispatcher')
		const paramSelect_el = this.el.querySelector('.params')
		this.dispatcherTS = new TomSelect(dispatcherSelect_el, {
			create: true,
			options: dispatchers,
			maxItems: 1,
			valueField: 'value',
			searchField: 'value',
			highlight: false,
			onChange: (value) => {
				if (!this.initial_load) {
					this.update()
				}
			},
			render: renderflags,
		})

		let dispatcher_additem = this.hasDescription
			? values[3].trim()
			: values[2].trim()

		if (this.hasDispatch(dispatcher_additem)) {
			this.dispatcherTS.addItem(dispatcher_additem)
		} else {
			this.dispatcherTS.createItem(dispatcher_additem)
		}

		let params_additem = values[3] ? values[3].trim() : null
		if (this.hasDescription) {
			params_additem = values[4] ? values[4].trim() : null
		}
		// this.paramTS.createItem(params_additem)
		paramSelect_el.value = params_additem
		paramSelect_el.addEventListener('input', () => {
			//

			if (!this.initial_load) {
				this.update()
			}
		})

		this.comment_el = this.el.querySelector('.comment')
		this.comment_el.value = this.el.dataset.comment ?? ''
		this.comment_el.addEventListener('input', () => {
			if (!this.initial_load) {
				this.el.dataset.comment = this.comment_el.value
				this.update()
			}
		})
	}

	addListeners() {
		this.el.addEventListener('click', (e) => {
			this.el.classList.remove('compact')
			this.contextMenu.show()
		})
		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			this.contextMenu.show()
		})
		this.el.addEventListener('dblclick', (e) => {
			// let target = e.target()
			this.el.classList.toggle('compact')
			this.contextMenu.hide()
		})
		this.el.addEventListener('keydown', (e) => {
			// e.stopPropagation()
			if (e.key === 'Enter') {
				this.el.classList.toggle('compact')
				this.contextMenu.show()
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
				this.disable()
			}
		})
		this.el.addEventListener('focus', (e) => {
			this.contextMenu.show()
		})
		this.el.addEventListener('blur', () => {
			this.contextMenu.hide()
		})
	}

	update() {
		let bindFlags = this.bindflagTS.getValue()
		let bindflagString = Array.isArray(bindFlags)
			? `bind${bindFlags.join('')}`
			: bindFlags
		let modKeys = this.modkeyTS.getValue()
		let modKeyString = Array.isArray(modKeys)
			? modKeys.join(' ')
			: modKeys
		let keyPress = this.el.querySelector('.keypress').value
		let description = this.el.querySelector('.description').value
		let disPatcherString = this.dispatcherTS.getValue()
		let paramString = this.el.querySelector('.params').value.trim()
		let preview_el = this.el.querySelector('.editor-item-preview')
		let comment = this.comment_el.value
			? `# ${this.comment_el.value}`
			: ''
		this.el.dataset.name = bindflagString
		if (this.hasDescription) {
			preview_el.innerHTML = `<span id="key">${bindflagString}</span> = <span id="value">${modKeyString}, ${keyPress},${description}, ${disPatcherString}, ${paramString}</span>&nbsp<i class="preview-comment">${comment}</i>`
			// this.preview = `${bindflagString} = ${modKeyString}, ${keyPress},${description}, ${disPatcherString}, ${paramString} ${comment}`
			this.el.dataset.value = `${modKeyString}, ${keyPress},${description}, ${disPatcherString}, ${paramString}`
		} else {
			preview_el.innerHTML = `<span id="key">${bindflagString}</span> = <span id="value">${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString}</span>&nbsp<i class="preview-comment">${comment}</i>`
			// this.preview = `${bindflagString} = ${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString} ${comment}`
			this.el.dataset.value = `${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString}`
		}
		let saved_comment = this.comment_el.value
		this.el.dataset.comment = saved_comment
		if (!this.initial_load) {
			this.saveDebounced()
		}
	}

	addToParent(parent) {
		parent.appendChild(this.el)
	}

	async add(type, below = true) {
		switch (type) {
			case 'KEY':
				let newBindItem = await addItem(
					'KEY',
					'bind',
					'SUPER, I, exec, hyprsettings',
					'',
					this.el.dataset.position,
					this.el.dataset.uuid,
					below,
				)
				let newBindElement = new EditorItem_Binds({
					name: newBindItem['name'],
					uuid: newBindItem['uuid'],
					value: newBindItem['value'],
					comment: newBindItem['comment'],
					position: this.el.dataset.position,
				})
				if (below) {
					this.el.after(newBindElement.el)
				} else {
					this.el.before(newBindElement.el)
				}
				newBindElement.save()
				break
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
		}
	}

	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position)
		this.el.remove()
	}

	disable() {
		if (this.el.dataset.disabled == 'false') {
			this.el.dataset.disabled = true
			this.el.classList.add('disabled')
			this.el.querySelectorAll('textarea').forEach((el) => {
				el.disabled = true
			})
			this.save()
		} else {
			this.el.dataset.disabled = false
			this.el.classList.remove('disabled')
			this.el.querySelectorAll('textarea').forEach((el) => {
				el.disabled = false
			})
			this.save()
		}
	}

	hasMod(element) {
		for (const mod of modkeys) {
			if (mod.value.includes(element)) {
				return true
			}
		}
		return false
	}

	hasDispatch(element) {
		for (const dispatcher of dispatchers) {
			if (dispatcher.value.includes(element)) {
				return true
			}
		}
		return false
	}
	return(){
		return this.el
	}

	save() {
		let name = this.el.dataset.name
		let uuid = this.el.dataset.uuid
		let position = this.el.dataset.position
		let value = this.el.dataset.value
		const commentToSave =
			this.comment_el.value.trim() === ''
				? null
				: this.comment_el.value
		let type = this.el.dataset.type
		let disabled = this.el.dataset.disabled === 'true'
		saveKey(type, name, uuid, position, value, commentToSave, disabled)
	}
}
