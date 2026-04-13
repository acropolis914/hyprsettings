// @ts-check
import { saveKey, deleteKey, duplicateKey, addChildItem, addItem } from '../utils/utils.js'
import { debounce } from '../utils/helpers.js'
import { ContextMenu } from './contextMenu.js'
import { dmenuConfirm } from '../ui_components/dmenu.ts'
import type { ItemPropsKey } from '@scripts/types/editorItemTypes.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'
import { EditorItem_Generic } from '@scripts/ConfigRenderer/EditorItem_Generic.ts'
import { createSwitchBox } from '@scripts/ui_components/switchBox.ts'

export class ConfigGroup {
	group_el: HTMLDivElement
	private document: HTMLDivElement
	private contextMenu: ContextMenu
	private saveDebounced: any
	title: string
	childrenContainer: HTMLDivElement
	topbar_el: HTMLDivElement
	group_name_el: HTMLDivElement
	topbar_tools_el: HTMLDivElement

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
		this.title = this.group_el.title

		this.topbar_el = document.createElement('div')
		this.topbar_el.classList.add('topbar')
		this.group_name_el = document.createElement('div')
		this.group_name_el.classList.add('group_name')
		this.group_name_el.innerText = json['name']

		this.topbar_tools_el = document.createElement('div')
		this.topbar_tools_el.classList.add('topbar-tools')

		const isGroupDisabled = this.group_el.dataset.disabled === 'true'
		const { wrapper: switchWrapper, checkbox: switchCheckbox } = createSwitchBox(!isGroupDisabled)
		switchWrapper.title = 'Enable/Disable (d)'

		switchCheckbox.addEventListener('change', (e) => {
			this.disable(!switchCheckbox.checked)
		})

		switchWrapper.addEventListener('click', (e) => {
			// e.stopPropagation()
		})

		const duplicateBtn = document.createElement('button')
		duplicateBtn.classList.add('duplicate-btn')
		duplicateBtn.innerText = ''
		duplicateBtn.title = 'Duplicate Group'
		duplicateBtn.style.cursor = 'pointer'
		duplicateBtn.addEventListener('click', (e) => {
			e.stopPropagation()
			this.duplicateKey()
		})

		const deleteBtn = document.createElement('button')
		deleteBtn.classList.add('delete-btn')
		deleteBtn.innerText = '󰆴'
		deleteBtn.title = 'Delete Group (Del)'
		deleteBtn.style.cursor = 'pointer'
		deleteBtn.addEventListener('click', (e) => {
			e.stopPropagation()
			this.delete()
		})

		this.topbar_tools_el.appendChild(duplicateBtn)
		this.topbar_tools_el.appendChild(deleteBtn)
		this.topbar_tools_el.appendChild(switchWrapper)

		this.topbar_el.appendChild(this.group_name_el)
		this.topbar_el.appendChild(this.topbar_tools_el)
		this.group_el.appendChild(this.topbar_el)

		this.childrenContainer = document.createElement('div')
		this.childrenContainer.classList.add('children-container')
		this.group_el.appendChild(this.childrenContainer)
		this.group_el.appendConfigItems = this.appendConfigItems.bind(this)

		if (json['comment']) {
			this.group_el.dataset.comment = json['comment']
		}
		if (['windowrule', 'layerrule'].includes(json['name'])) {
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

		this.contextMenu = new ContextMenu([])
		this.addEventListeners()
	}

	getElementRects(): number[] {
		this.group_el.offsetHeight
		const box = this.group_el.getBoundingClientRect()
		const [x1, x2, y1, y2] = [box.left, box.right, box.top, box.bottom]
		return [x1, x2, y1, y2]
	}

	createContextMenu(x = 0, y = 0) {
		if (x === 0 || y === 0) {
			const [, x2, , y2] = this.getElementRects()
			x = x2
			y = y2
		}

		this.contextMenu = new ContextMenu([
			// {
			// 	label: 'Add key',
			// 	icon: '',
			// 	action: () => this.newKey(),
			// },
			{
				label: 'Duplicate Group',
				icon: '󰅀',
				action: () => this.duplicateKey(),
			},
			{
				label: `${this.group_el.dataset.disabled === 'true' ? 'Enable' : 'Disable'}`,
				icon: '󰈉',
				action: () => this.disable(),
			},
			{
				label: 'Delete Group',
				icon: '󰗩',
				action: () => this.delete(),
			},
		])

		this.contextMenu.show(x, y)
	}

	async addEventListeners() {
		this.group_el.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			e.stopPropagation()
			this.createContextMenu(e.clientX, e.clientY)
		})
		this.group_el.addEventListener('focus', () => {
			// this.createContextMenu()
		})

		this.group_el.addEventListener('blur', (e) => {
			const nextTarget = e.relatedTarget as HTMLElement | null
			if (nextTarget?.closest('.context-menu')) {
				return
			}

			// Let focus/click transition into detached context menu settle first.
			setTimeout(() => {
				const active = document.activeElement as HTMLElement | null
				if (active?.closest('.context-menu')) {
					return
				}
				this.contextMenu?.hide()
			}, 20)
		})

		this.group_el.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter' || e.key === 'Space') {
				e.preventDefault()
				e.stopPropagation()
				e.stopImmediatePropagation()
				this.createContextMenu()
				return
			}

			if (e.key === 'Delete' && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
				e.preventDefault()
				e.stopPropagation()
				const confirm = await dmenuConfirm()
				if (confirm) {
					this.delete()
				}
			}
		})
		this.group_el.addEventListener('mouseover', (e) => {
			if (e.target !== this.group_el) {
				this.group_el.removeAttribute('title')
			} else {
				this.group_el.title = this.title
			}
		})
	}
	async newKey() {
		let [itemToAdd, parent_node] = await addChildItem(this.group_el.dataset.position, this.group_el.dataset.uuid)

		let itemProps: ItemPropsKey = {
			name: itemToAdd.name,
			uuid: itemToAdd.uuid,
			value: itemToAdd['data'],
			comment: '',
			type: 'KEY',
			position: `${this.group_el.dataset.position}:${this.group_el.dataset.name}`,
		}
		console.log(itemProps)
		let newEditorItem = new EditorItem_Generic({ ...itemProps })
		let below = false
		this.group_el.prepend(newEditorItem.el)
		await addItem(
			itemProps.type,
			itemProps.name,
			itemProps.value,
			itemProps.comment,
			itemProps.position,
			null, // used as relative_uuid
			false, // below
		)
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

		const switchCheckbox = this.topbar_tools_el.querySelector('input[type="checkbox"]') as HTMLInputElement
		if (switchCheckbox) {
			switchCheckbox.checked = !disabled
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

	async delete() {
		const confirmation = await dmenuConfirm(`Are you sure you want to delete group ${this.group_el.dataset.name} ?`)
		console.log(confirmation)
		if (!confirmation) {
			return
		}
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

		collapseElementFull(this.group_el, 500)
	}

	duplicateKey() {
		duplicateKey(this.group_el.dataset.uuid, this.group_el.dataset.position, true, this.group_el)
	}

	appendConfigItems(el: HTMLDivElement) {
		this.childrenContainer.appendChild(el)
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
