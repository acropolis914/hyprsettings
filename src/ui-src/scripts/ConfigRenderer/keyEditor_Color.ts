import { parseHyprColor } from '@scripts/HyprlandSpecific/colorparser'

export class ColorModal {
	el: HTMLInputElement
	constructor(value: string | number | any) {
		let initialized = false
		this.el = document.createElement('input')
		this.el.setAttribute('type', 'text')
		this.el.setAttribute('data-coloris', '')
		const num = Number(value)
		this.el.value = Number.isNaN(num) ? parseHyprColor(value) : parseHyprColor(num)
		this.el.style.color = 'transparent'
		this.el.style.outline = `10px solid ${this.el.value}`
		this.el.addEventListener('input', () => {
			this.el.style.outline = `10px solid ${this.el.value}`
		})

		initialized = true
		return this.el
	}
}
