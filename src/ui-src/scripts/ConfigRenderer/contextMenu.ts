import { hideAllContextMenus } from '../utils/utils.ts'
import { GLOBAL } from '../GLOBAL.ts'
import tippy, { hideAll } from 'tippy.js'
import { roundArrow } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/dist/svg-arrow.css'
import '@stylesheets/subs/tippy.scss'
import { createOverlay } from '@scripts/ui_components/darkenOverlay.js'

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

		this.el.addEventListener('focusin', (e) => {
			this.el.firstChild.focus()
		})

		for (const { label, icon, action, title } of items) {
			const btnEl = document.createElement('div')
			btnEl.classList.add('ctx-button')
			btnEl.tabIndex = 0
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
			const self = this
			btnEl.addEventListener('click', (e) => {
				e.stopPropagation()
				console.log(`clicked: ${label}, running ${action}`)
				self.hide()
				action?.()
			})

			btnEl.appendChild(iconEl)
			btnEl.appendChild(labelEl)
			this.el.appendChild(btnEl)
		}
	}
	toggle() {
		this.el.classList.toggle('hidden')
	}

	show(x = 0, y = 0) {
		// createOverlay()
		this.el.focus()
		hideAllContextMenus()
		document.body.appendChild(this.el)

		this.el.classList.remove('hidden')
		this.el.style.position = 'absolute'
		// this.el.style.opacity = 0 // hide while measuring
		this.el.style.zIndex = '99999'

		// Force reflow to make sure getBoundingClientRect is accurate
		this.el.offsetHeight

		const ctxRect = this.el.getBoundingClientRect()
		const bodyRect = document.body.getBoundingClientRect()

		// Compute max coordinates so menu doesn't overflow
		const maxX = bodyRect.width - ctxRect.width
		const maxY = bodyRect.height - ctxRect.height

		// Clamp x and y
		const finalX = Math.min(Math.max(x, 0), maxX)
		const finalY = Math.min(Math.max(y, 0), maxY)

		this.el.style.left = `${finalX}px`
		this.el.style.top = `${finalY}px`
		this.el.style.visibility = 'visible'
		this.el.style.opacity = 1
	}
	hide() {
		this.el.remove()
		// destroyOverlay()
	}
}
