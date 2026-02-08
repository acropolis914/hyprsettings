// @ts-check
import { saveKey, deleteKey, duplicateKey } from '../utils.js'
import { debounce } from '../helpers.js'
import { ContextMenu } from './contextMenu.js'
import { dmenuConfirm } from '../ui_components/dmenu'

export class ConfigGroup {
	group_el: HTMLDivElement
	private document: HTMLDivElement
	private contextMenu: ContextMenu
	private saveDebounced: any

	constructor(json: JSON) {
		this.group_el = document.createElement('div')
		this.group_el.classList.add('config-group')
		this.group_el.setAttribute('tabindex', '0')
		this.group_el.classList.add('editor-item')
		this.group_el.dataset.name = json['name']
		this.group_el.dataset.uuid = json['uuid']
		this.group_el.dataset.position = json['position']
		this.group_el.dataset.disabled = json['disabled']
		this.group_el.dataset.type = json['type']
		this.group_el.disable = this.disable.bind(this)
		this.saveDebounced = debounce(() => this.save(), 15)
		this.group_el.setAttribute('title', json['position'].replace('root:', ''))
		if (json['comment']) {
			this.group_el.dataset.comment = json['comment']
		}
		if (this.group_el.dataset.name === 'windowrule' || this.group_el.dataset.name === 'layerrule') {
			this.group_el.classList.add('rule')
		}
		this.group_el.addEventListener('keydown', (e) => {
			// if (e.key == "Enter") {
			// 	e.preventDefault()
			// 	// this.group_el.querySelector(".editor-item").focus();
			// 	const firstChild = Array.from(this.group_el.children).find(child => child.classList.contains('editor-item'))
			// 	firstChild.click()
			// 	console.log(firstChild)
			// 	console.log("Group is entered");
			// }
			if (e.key == 'd' && e.target.tagName != 'TEXTAREA' && e.target.tagName != 'INPUT') {
				e.stopPropagation()
				e.stopImmediatePropagation()
				this.disable()
			}
		})

		this.contextMenu = new ContextMenu([
			// {
			// 	label: 'Comment Above',
			// 	icon: '',
			// 	action: () => this.add('COMMENT', false),
			// },
			// {
			// 	label: 'Comment Below',
			// 	icon: '',
			// 	action: () => this.add('COMMENT', true),
			// },
			// {
			// 	label: 'NewBind Above',
			// 	icon: '󰅃',
			// 	action: () => this.add('KEY', false),
			// },
			{
				label: 'Duplicate Group',
				icon: '󰅀',
				action: () => this.duplicateKey(true),
			},
			{
				label: 'Toggle Disable(Bugs!)',
				icon: '󰈉',
				action: () => this.disable(),
			},
			{
				label: 'Delete Group',
				icon: '󰗩',
				action: () => this.delete(),
			},
		])

		this.group_el.appendChild(this.contextMenu.el)
		this.addEventListeners()
	}

	async addEventListeners() {
		this.group_el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			this.contextMenu.show()
		})
		this.group_el.addEventListener('focus', (e) => {
			this.contextMenu.show()
		})

		this.group_el.addEventListener('blur', (e) => {
			this.contextMenu.hide()
		})

		this.group_el.addEventListener('keydown', async (e) => {
			if (e.key === 'Delete' && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
				e.preventDefault()
				e.stopPropagation()
				const confirm = await dmenuConfirm()
				if (confirm) {
					this.delete()
				}
			}
		})
	}

	disable(disable: boolean | null = null) {
		// WARNING! THIS IS NOT YET WORKING GOOD
		function hasDisabledParent(el) {
			let parent = el.parentElement
			console.log(parent)
			while (parent) {
				if (parent.dataset.type === 'GROUP' && parent.dataset.disabled === 'true') {
					return true
				}
				parent = parent.parentElement
			}

			return false
		}

		let disabled: boolean
		if (disable !== null) {
			this.group_el.dataset.disabled = disable.toString()
			disabled = disable
		} else {
			let isParentDisabled = hasDisabledParent(this.group_el)
			if (isParentDisabled) {
				console.warn('Parent is disabled, cannot enable/disable child')
				return
			}
			this.group_el.dataset.disabled = this.group_el.dataset.disabled === 'true' ? 'false' : 'true'
			disabled = this.group_el.dataset.disabled === 'true'
		}
		this.save()
		// GLOBAL['groupsave'] = true
		// @ts-ignore
		let children = [...this.group_el.querySelectorAll('[data-uuid]')]
		children.forEach((element: HTMLDivElement) => {
			// console.log("Disabling element:", element)
			element.disable(disabled, true)
		})
		// setTimeout(() => {
		// 	GLOBAL['groupsave'] = false
		// }, 20);
	}

	return() {
		return this.group_el
	}

	delete() {
		this.group_el.style.backgroundColor = 'var(--surface-1)'
		let before = this.group_el.previousElementSibling || this.group_el.nextElementSibling
		function collapseElementFull(el, duration = 1000) {
			const style = getComputedStyle(el)

			// store initial values
			const startHeight = el.offsetHeight
			const startOpacity = parseFloat(style.opacity) || 1

			const startPaddingTop = parseFloat(style.paddingTop)
			const startPaddingBottom = parseFloat(style.paddingBottom)

			const startMarginTop = parseFloat(style.marginTop)
			const startMarginBottom = parseFloat(style.marginBottom)

			const startBorderTop = parseFloat(style.borderTopWidth)
			const startBorderBottom = parseFloat(style.borderBottomWidth)

			el.style.overflow = 'hidden'
			const startTime = performance.now()

			function animate(now) {
				const elapsed = now - startTime
				let t = Math.min(elapsed / duration, 1) // progress 0 → 1

				// EASE OUT QUAD
				const factor = 1 - (1 - t) * (1 - t)

				const invFactor = 1 - factor // for collapsing from full → 0

				el.style.height = startHeight * invFactor + 'px'
				el.style.opacity = startOpacity * invFactor

				el.style.paddingTop = startPaddingTop * invFactor + 'px'
				el.style.paddingBottom = startPaddingBottom * invFactor + 'px'

				el.style.marginTop = startMarginTop * invFactor + 'px'
				el.style.marginBottom = startMarginBottom * invFactor + 'px'

				el.style.borderTopWidth = startBorderTop * invFactor + 'px'
				el.style.borderBottomWidth = startBorderBottom * invFactor + 'px'

				if (t < 1) {
					requestAnimationFrame(animate)
				} else {
					// animation done
					deleteKey(el.dataset.uuid, el.dataset.position)
					el.remove()
					before.click()
					before.focus()
					before.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					})
				}
			}

			requestAnimationFrame(animate)
		}

		// Usage
		collapseElementFull(this.group_el, 500)
	}
	duplicateKey() {
		duplicateKey(this.group_el.dataset.uuid, this.group_el.dataset.position, true, this.group_el)
	}

	save() {
		const disabled = this.group_el.dataset.disabled === 'true'
		// console.log("Saving group:", this.group_el.dataset.name, "Disabled:", disabled)
		saveKey(
			'GROUP',
			this.group_el.dataset.name,
			this.group_el.dataset.uuid,
			this.group_el.dataset.position,
			this.group_el.dataset.value,
			this.group_el.dataset.comment,
			disabled,
		)
	}
}
