import { debounce, saveKey } from '../utils.ts'
import { ContextMenu } from './contextMenu.js'
export class ConfigGroup {
	constructor(json) {
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
		this.saveDebounced = debounce(() => this.save(), 500)
		this.group_el.setAttribute(
			'title',
			json['position'].replace('root:', ''),
		)
		if (json['comment']) {
			this.group_el.dataset.comment = json['comment']
		}
		if (
			this.group_el.dataset.name === 'windowrule' ||
			this.group_el.dataset.name === 'layerrule'
		) {
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
			if (
				e.key === 'd' &&
				e.target.tagName !== 'TEXTAREA' &&
				e.target.tagName !== 'INPUT'
			) {
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
			// {
			// 	label: 'NewBind Below',
			// 	icon: '󰅀',
			// 	action: () => this.add('KEY', true),
			// },
			// {
			// 	label: 'Toggle Disable(Bugs!)',
			// 	icon: '󰈉',
			// 	action: () => this.disable(),
			// },
			{
				label: 'Delete Group',
				icon: '󰗩',
				action: () => this.delete(),
			},
		])

		// this.group_el.appendChild(this.contextMenu.el)

		this.addEventListeners()
	}

	addEventListeners() {
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
	}

	disable(disable = null) {
		// WARNING! THIS IS NOT YET WORKING GOOD
		function hasDisabledParent(el) {
			let parent = el.parentElement
			console.log(parent)
			while (parent) {
				if (
					parent.dataset.type === 'GROUP' &&
					parent.dataset.disabled === 'true'
				) {
					return true
				}
				parent = parent.parentElement
			}

			return false
		}

		let disabled
		if (disable !== null) {
			this.group_el.dataset.disabled = disable.toString()
			disabled = disable
		} else {
			let isParentDisabled = hasDisabledParent(this.group_el)
			if (isParentDisabled) {
				console.warn(
					'Parent is disabled, cannot enable/disable child',
				)
				return
			}
			this.group_el.dataset.disabled =
				this.group_el.dataset.disabled !== 'true'
			disabled = this.group_el.dataset.disabled === 'true'
		}
		// console.log(disabled)

		let children = [...this.group_el.querySelectorAll('[data-uuid]')]
		children.forEach((element) => {
			// console.log("Disabling element:", element)
			element.disable(disabled, true)
		})

		this.save()
	}

	return() {
		return this.group_el
	}

	save() {
		saveKey(
			'GROUP',
			this.group_el.dataset.name,
			this.group_el.dataset.uuid,
			this.group_el.dataset.position,
			this.group_el.dataset.value,
			this.group_el.dataset.comment,
			this.group_el.dataset.disabled,
		)
	}
}
