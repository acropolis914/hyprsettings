import { ContextMenu } from './contextMenu.js'
import { addItem, debounce, deleteKey, saveKey } from '../utils.js'
import { GLOBAL } from '../GLOBAL.js'

export class EditorItem_Comments {
	constructor(json, hidden = false) {
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
		// let [name, value] = this.el.dataset.comment.replace(/^[ #]+/, '').split(/=(.*)/).slice(0, 2).map(p => (p.trim()))
		// if (name && value){
		// }
		this.el.title = position.replace('root:', '').replaceAll(':', '   ')
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
		this.contextMenu = new ContextMenu([
			{ label: 'Add Above', icon: '󰅃', action: () => this.add(false) },
			{ label: 'Add Below', icon: '󰅀', action: () => this.add() },
			{ label: 'Delete Key', icon: '󰗩', action: () => this.delete() }
		])
		this.el.appendChild(this.contextMenu.el)
		this.addListeners()

		this.initial_load = false
	}

	update() {
		this.el.dataset.comment = this.textarea.value
		if (!this.initial_load) {
			this.saveDebounced()
		}

	}

	addListeners() {
		this.el.addEventListener('click', (e) => {
			this.contextMenu.show()
		})
		this.el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			this.contextMenu.show()
		})
		this.el.addEventListener('dblclick', (e) => {
			this.contextMenu.hide()
		})
		this.el.addEventListener('focus', (e) => {
			this.contextMenu.show()
			if (this.editing) {
				this.textarea.focus()
			}
		})
		this.el.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				if (!this.editing) {
					e.preventDefault()
					// console.debug(this.editing)
					this.editing = true
					setTimeout(() => this.textarea.focus(), 0)
					this.contextMenu.show()
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
		let newCommentItem = await addItem('COMMENT', 'comment', '', '# New comment', this.el.dataset.position, this.el.dataset.uuid, below)
		let newCommentElement = new EditorItem_Comments({
			name: newCommentItem['comment'],
			uuid: newCommentItem['uuid'],
			value: newCommentItem['value'],
			comment: newCommentItem['comment'],
			position: this.el.dataset.position
		}, false)
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

	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position)
		this.el.remove()
	}

	save() {
		if (!this.el.dataset.comment.trim().startsWith('#') && this.el.dataset.comment.split('=').length > 1) {
			console.log('detected comment to key transformation')
			let [name, value] = this.el.dataset.comment.split(/=(.*)/).slice(0, 2).map(p => (p.trim()))
			let [new_value, comment] = value.split(/#(.*)/).slice(0, 2).map(p => (p.trim()))
			let uuid = this.el.dataset.uuid
			let type = 'KEY'
			let position = this.el.dataset.position
			if (name && value) {
				saveKey(type, name, uuid, position, value, comment = comment, false)
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
