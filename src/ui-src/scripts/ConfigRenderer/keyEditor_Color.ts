import { parseHyprColor } from '@scripts/HyprlandSpecific/colorparser'
import '@scripts/jslib/coloris.css'
import '@scripts/jslib/coloris.js'

export class ColorModal {
	el: HTMLInputElement
	wrapper: HTMLDivElement
	_listeners: any = []
	value: string

	constructor(value: string | number | any) {
		let initialized = false
		this.wrapper = document.createElement('div')
		this.el = document.createElement('input')
		this.el.setAttribute('type', 'text')
		this.wrapper.classList.add('generic-editor-colormodal')
		this.el.setAttribute('data-coloris', '')
		const num = Number(value)
		this.el.value = Number.isNaN(num) ? parseHyprColor(value) : parseHyprColor(num)
		this.el.style.color = 'transparent'
		this.el.style.backgroundColor = `${this.el.value}`
		this.el.addEventListener('input', () => {
			this.value = this.el.value
			this.el.style.backgroundColor = `${this.el.value}`
			this._notifyInputListeners()
			this._emit()
		})
		this.wrapper.appendChild(this.el)
		initialized = true
	}

	addListeners() {
		this.el.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				e.stopPropagation()
				e.stopImmediatePropagation()
				this.el.click()
			}
		})
	}

	_notifyInputListeners() {
		const inputEvent = new Event('input', { bubbles: true })
		this.wrapper.dispatchEvent(inputEvent)
	}

	_emit() {
		for (const fn of this._listeners) fn(this.value)
	}
}
