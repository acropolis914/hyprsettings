import { hideAllContextMenus } from '../utils.ts'
import { GLOBAL } from '../GLOBAL.js'

export class ContextMenu {
	constructor(items = []) {
		this.el = document.createElement('div')
		this.el.classList.add('context-menu', 'hidden')
		this.el.setAttribute('contenteditable', 'false')
		this.el.addEventListener('transitionend', (e) => {
			if (
				e.propertyName === 'opacity' &&
				getComputedStyle(e.target).opacity === '0'
			) {
				this.el.classList.add('hidden')
			}
		})

		for (const { label, icon, action, title } of items) {
			const btnEl = document.createElement('div')
			btnEl.classList.add('ctx-button')
			const iconEl = document.createElement('div')
			iconEl.classList.add('ctx-button-icon')
			iconEl.textContent = icon
			const labelEl = document.createElement('div')
			labelEl.classList.add('ctx-button-label')
			if (!GLOBAL['config']['show_contextmenu_label'] || true) {
				labelEl.classList.add('hidden')
			}
			labelEl.textContent = label

			if (
				label.toLowerCase().includes('delete') ||
				label.toLowerCase().includes('reset')
			) {
				let clickCount = 0
				let timeoutId
				btnEl.addEventListener('click', (e) => {
					e.stopPropagation()

					clickCount += 1

					if (clickCount === 1) {
						iconEl.classList.add('warn')
						labelEl.classList.add('warn')
						labelEl.textContent = 'You sure?'
						console.log('Are you sure?')

						clearTimeout(timeoutId)
						timeoutId = setTimeout(() => reset(), 2000) // auto-reset after 2s
					} else {
						clearTimeout(timeoutId)
						reset()
						action?.()
					}
				})

				function reset() {
					clickCount = 0
					iconEl.classList.remove('warn')
					labelEl.classList.remove('warn')
					labelEl.textContent = label
				}

				btnEl.addEventListener('mouseleave', () => {
					clearTimeout(timeoutId)
					timeoutId = setTimeout(() => reset(), 1500)
				})
			} else {
				btnEl.addEventListener('click', (e) => {
					e.stopPropagation()
					action?.()
				})
			}

			btnEl.appendChild(iconEl)
			btnEl.appendChild(labelEl)
			this.el.appendChild(btnEl)
		}
	}
	toggle() {
		this.el.classList.toggle('hidden')
	}

	show() {
		hideAllContextMenus()
		this.el.style.opacity = 1
		this.el.classList.remove('hidden')
	}
	hide() {
		this.el.style.opacity = 0
		setTimeout(() => {
			this.el.classList.add('hidden')
		}, 500)
	}
}
