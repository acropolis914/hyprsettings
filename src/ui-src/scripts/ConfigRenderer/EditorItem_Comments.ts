import { ContextMenu } from './contextMenu.js'
import { addItem, deleteKey, saveKey } from '../utils/utils.ts'
import { debounce } from '../utils/helpers.js'
import { GLOBAL } from '../GLOBAL.ts'
import { EditorItem_Generic } from './EditorItem_Generic.ts'
import type { ItemPropsKey, ItemPropsMisc } from '@scripts/types/editorItemTypes.ts'
// import { EditorItem_Binds } from './EditorItem_Binds.ts'

export class EditorItem_Comments {
	initial_load: boolean
	el: HTMLDivElement
	editing: boolean
	constructor(json: ItemPropsMisc, hidden: boolean = false) {
		let comment = json['comment']
		let uuid = json['uuid']
		let position = json['position']
		this.initial_load = true
		this.el = document.createElement('div')
		this.el.dataset.name = 'comment'
		this.el.dataset.comment = comment
		this.el.dataset.uuid = uuid
		this.el.dataset.position = position
		this.el.dataset.type = json['type']
		this.editing = false
		this.el.disable = this.disable.bind(this)

		// let [name, value] = this.el.dataset.comment.replace(/^[ #]+/, '').split(/=(.*)/).slice(0, 2).map(p => (p.trim()))
		// if (name && value){
		// }
		let position_title = json['position'].replace('root:', '').replaceAll(':', ' 󰄾 ')
		this.el.title = `  Location: ${position_title}`
		this.el.classList.add('editor-item')
		this.el.setAttribute('tabindex', 0)
		if (hidden) {
			this.el.classList.add('settings-hidden')
		}
		this.textarea = this.el.appendChild(document.createElement('textarea'))
		// this.textarea.contentEditable = "true"
		this.textarea.setAttribute('rows', '1')
		this.textarea.classList.add('editor-item-comment')
		this.textarea.value = comment
		this.saveDebounced = debounce(() => this.save(), 100)
		this.textarea.addEventListener('input', () => this.update())
		this.contextMenu = new ContextMenu([])
		this.addListeners()

		this.initial_load = false
	}

	update() {
		this.el.dataset.comment = this.textarea.value
		if (!this.initial_load) {
			this.saveDebounced()
		}
	}

	getElementRects() {
		this.el.offsetHeight
		let box = this.el.getBoundingClientRect()
		let [x1, x2, y1, y2] = [box.left, box.right, box.top, box.bottom]
		return [x1, x2, y1, y2]
	}

	createContextMenu(x = 0, y = 0) {
		if (x === 0 || y === 0) {
			let [, x2, , y2] = this.getElementRects()
			x = x2
			y = y2
		}

		this.contextMenu = new ContextMenu([
			{
				label: 'Add Above',
				icon: '󰅃',
				action: () => this.add(false),
			},
			{ label: 'Add Below', icon: '󰅀', action: () => this.add() },
			{
				label: 'Delete Key',
				icon: '󰗩',
				action: () => this.delete(),
			},
		])

		this.contextMenu.show(x, y)
	}

	addListeners() {
		this.el.addEventListener('click', () => {
			this.createContextMenu()
		})
		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			e.stopPropagation()
			this.createContextMenu(e.clientX, e.clientY)
		})
		this.el.addEventListener('dblclick', () => {
			this.contextMenu.hide()
		})
		this.el.addEventListener('focus', () => {
			this.createContextMenu()
			if (this.editing) {
				this.textarea.focus()
			}
		})
		this.el.addEventListener('blur', (e) => {
			const nextTarget = e.relatedTarget
			if (nextTarget?.closest?.('.context-menu')) {
				return
			}

			setTimeout(() => {
				const active = document.activeElement
				if (active?.closest?.('.context-menu')) {
					return
				}
				this.contextMenu.hide()
			}, 20)
		})
		this.el.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				if (!this.editing) {
					e.preventDefault()
					// console.debug(this.editing)
					this.editing = true
					setTimeout(() => this.textarea.focus(), 0)
					this.createContextMenu()
				} else {
					e.preventDefault()
					// console.debug(this.editing)
					setTimeout(() => this.gotoNext(), 1)
					this.editing = false
				}
			}
			if (e.key === 'Escape') {
				e.preventDefault()
				this.el.focus()
				this.editing = false
				this.textarea.blur()
			}
		})
		this.textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.stopPropagation()
				// this.editing = false
				this.gotoNext(true)
			}
			//testing signed commit
			if (e.key === 'ArrowDown') {
				e.preventDefault()
				e.stopPropagation()
				// this.editing = false
				this.gotoNext()
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault()
				e.stopPropagation()
				// this.editing = false
				this.gotoNext(false)
			}
		})
		this.textarea.addEventListener('focus', (e) => {
			this.editing = true
		})
	}

	gotoNext(down = true) {
		let nextSibling = down ? this.el.nextElementSibling : this.el.previousElementSibling
		if (!nextSibling) {
			if (down) {
				nextSibling = this.el.parentNode.firstElementChild
			} else {
				nextSibling = this.el.parentNode.lastElementChild
			}
		}
		GLOBAL['mainFocus'][GLOBAL['activeTab']] = nextSibling.dataset.uuid
		nextSibling.focus()
	}

	async add(below = true) {
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
				type: 'COMMENT',
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

	addToParent(parent) {
		parent.appendChild(this.el)
	}

	return() {
		return this.el
	}

	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position)
		this.el.remove()
	}

	disable() {
		// 	this is needed so when calling disable on any editor item
		// it won't throw any errors
	}

	save() {
		if (!this.el.dataset.comment.trim().startsWith('#') && this.el.dataset.comment.split('=').length > 1) {
			console.log('detected comment to key transformation')
			let [name, value] = this.el.dataset.comment
				.split(/=(.*)/)
				.slice(0, 2)
				.map((p) => p.trim())
			let [new_value, comment] = value
				.split(/#(.*)/)
				.slice(0, 2)
				.map((p) => p.trim())
			let uuid = this.el.dataset.uuid
			let type = 'KEY'
			let position = this.el.dataset.position
			if (name && value) {
				saveKey(type, name, uuid, position, value, (comment = comment), false)
				let json = {
					name: name,
					uuid: uuid,
					value: new_value,
					comment: comment ? `# ${comment}` : '',
					position: position,
					type: type,
				}
				if (name.startsWith('bind')) {
					this.el.replaceWith(new EditorItem_Binds(json).return())
				} else {
					this.el.replaceWith(new EditorItem_Generic(json).return())
				}
			}
		} else {
			let type = 'COMMENT'
			let name = this.el.dataset.name
			let uuid = this.el.dataset.uuid
			let position = this.el.dataset.position
			let value = null
			let comment
			if (!this.el.dataset.comment.trim().startsWith('#')) {
				comment = `# ${this.el.dataset.comment}`
			} else {
				comment = this.el.dataset.comment
			}
			saveKey(type, name, uuid, position, value, comment, false)
		}
	}
}
