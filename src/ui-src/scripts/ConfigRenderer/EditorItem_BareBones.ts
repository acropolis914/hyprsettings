import { html, render } from 'lit'
import { debounce } from '../utils/helpers.js'
import { saveKey } from '../utils/utils.js'

const templateString = html`
	<div class="editor-item editor-item-generic" tabindex="0">
		<div class="editor-item-preview"></div>
		<div class="generic-editor"></div>
		<div class="comment-area">
			<span class="comment-hashtag">#</span>
			<textarea class="comment" placeholder="No Comment"></textarea>
		</div>
	</div>
`

export class EditorItem_Generic {
	initial_load: boolean
	el: HTMLDivElement
	preview_el: HTMLDivElement
	saveDebounced: () => void
	keyEditor: HTMLTextAreaElement
	valueEditor: HTMLTextAreaElement
	commentArea: HTMLTextAreaElement

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
		this.el.dataset.name = name
		this.el.dataset.uuid = uuid
		this.el.dataset.value = value ?? ''
		this.el.dataset.comment = comment ?? ''
		this.el.dataset.position = position ?? ''
		this.el.dataset.type = 'KEY'
		this.preview_el = this.el.querySelector('.editor-item-preview')

		const genericEditor_el = this.el.querySelector('.generic-editor')
		this.keyEditor = document.createElement('textarea')
		this.keyEditor.rows = 1
		this.keyEditor.value = name
		genericEditor_el.appendChild(this.keyEditor)

		this.valueEditor = document.createElement('textarea')
		this.valueEditor.rows = 1
		this.valueEditor.value = value
		genericEditor_el.appendChild(this.valueEditor)

		this.commentArea = this.el.querySelector('.comment')
		this.commentArea.value = comment ?? ''

		// Add listeners
		this.keyEditor.addEventListener('input', () => {
			this.el.dataset.name = this.keyEditor.value
			this.update()
		})
		this.valueEditor.addEventListener('input', () => {
			this.el.dataset.value = this.valueEditor.value
			this.update()
		})
		this.commentArea.addEventListener('input', () => {
			this.el.dataset.comment = this.commentArea.value
			this.update()
		})

		this.update()
		setTimeout(() => {
			this.initial_load = false
		}, 20)
	}

	update() {
		let name = this.keyEditor.value
		let formatted = name.replace(/_/g, ' ') || 'Please input a key'
		formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
		let value = this.valueEditor.value || 'Please input a value'
		let comment = this.commentArea.value ? `# ${this.commentArea.value}` : ''
		this.preview_el.innerHTML = `<span id="key">${formatted} </span> <span id="value">${value}</span>&nbsp;<i class="preview-comment">${comment}<i>`
		if (!this.initial_load) {
			this.saveDebounced()
		}
	}

	addToParent(parent) {
		parent.appendChild(this.el)
	}

	save() {
		let type = this.el.dataset.type
		let name = this.el.dataset.name
		let uuid = this.el.dataset.uuid
		let value = this.el.dataset.value
		let comment = this.el.dataset.comment
		let position = this.el.dataset.position
		saveKey(type, name, uuid, position, value, comment, false)
	}
}
