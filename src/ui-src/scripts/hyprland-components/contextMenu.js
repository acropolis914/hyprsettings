import { hideAllContextMenus } from '../utils.ts'
import { GLOBAL } from '../GLOBAL.js'
import tippy, { hideAll } from 'tippy.js'
import { roundArrow } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/dist/svg-arrow.css'
import '@stylesheets/subs/tippy.css'

export class ContextMenu {
	constructor(items = []) {
		this.el = document.createElement('div')
		this.el.classList.add('context-menu', 'hidden')
		this.el.setAttribute('contenteditable', 'false')
		this.el.addEventListener('transitionend', (e) => {
			if (e.propertyName === 'opacity' && getComputedStyle(e.target).opacity === '0') {
				this.el.classList.add('hidden')
			}
		})

		for (const { label, icon, action, title } of items) {
			const btnEl = document.createElement('div')
			btnEl.classList.add('ctx-button')
			tippy(btnEl, {
				content: `${icon} ${label}`,
				triggerTarget: btnEl,
				theme: 'pol',
				onShow(instance) {
					hideAll({ exclude: instance })
				},
			})
			const iconEl = document.createElement('div')
			iconEl.classList.add('ctx-button-icon')
			iconEl.textContent = icon
			const labelEl = document.createElement('div')
			labelEl.classList.add('ctx-button-label')
			if (GLOBAL.config.show_contextmenu_label === false) {
				console.log(GLOBAL['config']['show_contextmenu_label'])
				labelEl.classList.add('hidden')
			}
			labelEl.textContent = label

			if (label.toLowerCase().includes('delete') || label.toLowerCase().includes('reset')) {
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
		this.el.style.visibility = 'hidden'
		this.el.classList.remove('hidden')
		setTimeout(() => {
			let currentSet = document.querySelector(`.config-set#${GLOBAL['activeTab']}`)
			let currentSetRect = currentSet.getBoundingClientRect()
			let [setX1, setX2, setY1, setY2] = [
				currentSetRect.left, // x1 (left)
				currentSetRect.right, // x2 (right)
				currentSetRect.top, // y1 (top)
				currentSetRect.bottom, // y2 (bottom)
			]
			this.el.offsetHeight
			let thisElRect = this.el.getBoundingClientRect()
			let ctxRect = this.el.getBoundingClientRect()
			let [x1, x2, y1, y2] = [ctxRect.left, ctxRect.right, ctxRect.top, ctxRect.bottom]

			if (setY2 < y2) {
				this.el.style.top = `calc(-${ctxRect.height}px - 1rem)`
			} else {
				this.el.style.top = 'calc(100% + 1rem)'
			}
			this.el.style.visibility = 'visible'
			this.el.style.opacity = 1
		}, 1)
	}
	hide() {
		this.el.style.opacity = 0
		// setTimeout(() => {
		// 	this.el.classList.add('hidden')
		// }, 500)
	}
}
