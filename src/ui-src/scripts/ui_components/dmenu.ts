// dmenu.js
import { GLOBAL } from '../GLOBAL.ts'
import { createOverlay, destroyOverlay } from './darkenOverlay.js'

/* ============================================================
 * Generic DMenu (reusable, app-agnostic)
 * ============================================================ */
class DMenu {
	constructor({ items = [], onSelect = () => {}, onCancel = () => {}, promptText = '', searchbar = true, footer = '↑ ↓ Enter' } = {}) {
		this.items = items
		this.filteredItems = items
		this.onSelect = onSelect
		this.onCancel = onCancel
		this.promptText = promptText
		this.searchbar = searchbar
		this.footerText = footer
		this.root = null
	}

	render() {
		this.root = document.createElement('div')
		this.root.className = 'dmenu'
		this.root.id = 'dmenu'
		this.root.tabIndex = 0

		if (this.searchbar) {
			this.inputEl = document.createElement('input')
			this.inputEl.type = 'text'
			this.inputEl.className = 'dmenu-search'
			this.inputEl.placeholder = this.promptText
			this.inputEl.addEventListener('input', () => this._filter(this.inputEl.value))
			this.root.appendChild(this.inputEl)
		}

		this.listEl = document.createElement('ul')
		this.listEl.className = 'dmenu-list'
		this.root.appendChild(this.listEl)

		const footer = document.createElement('div')
		footer.className = 'dmenu-footer'
		footer.textContent = this.footerText
		this.root.appendChild(footer)

		this._renderItems(this.items)

		this.root.addEventListener('keydown', (e) => {
			if (!this.searchbar || !this.inputEl) return
			if (/^[a-zA-Z_.]$/.test(e.key)) {
				e.preventDefault()
				this.inputEl.focus()
				this.inputEl.value += e.key
				this._filter(this.inputEl.value)
			}
			if (e.key === 'Backspace') {
				e.preventDefault()
				this.inputEl.focus()
				this.inputEl.value = this.inputEl.value.slice(0, -1)
				this._filter(this.inputEl.value)
			}
		})

		return this.root
	}

	_renderItems(items) {
		this.listEl.innerHTML = ''
		items.forEach((item) => this._addItem(item))
	}

	_filter(query) {
		const q = query.toLowerCase()
		this.filteredItems = this.items.filter((item) => (item.label ?? String(item.value ?? item)).toLowerCase().includes(q))
		this._renderItems(this.filteredItems)
		this.focusFirst()
	}

	_addItem(item) {
		const li = document.createElement('li')
		li.className = 'dmenu-item'
		li.tabIndex = 0

		const label = document.createElement('div')
		label.className = 'dmenu-item-label'
		label.textContent = item.label ?? item.name ?? String(item.value ?? item)
		li.appendChild(label)

		if (item.description) {
			const desc = document.createElement('div')
			desc.className = 'dmenu-item-description hidden'
			desc.textContent = item.description
			li.appendChild(desc)
		}

		const choose = () => this.onSelect(item)

		li.addEventListener('click', (e) => {
			e.stopPropagation()
			choose()
		})
		li.addEventListener('focus', () => {
			li.classList.add('selected')
			li.querySelector('.dmenu-item-description')?.classList.remove('hidden')
		})
		li.addEventListener('blur', () => {
			li.classList.remove('selected')
			li.querySelector('.dmenu-item-description')?.classList.add('hidden')
		})

		li.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') choose()
			if (e.key === 'Escape') this.onCancel()
			if (e.key === 'ArrowDown') {
				e.preventDefault()
				;(li.nextElementSibling ?? this.listEl.firstElementChild)?.focus()
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault()
				;(li.previousElementSibling ?? this.listEl.lastElementChild)?.focus()
			}
		})

		this.listEl.appendChild(li)
	}

	focusFirst() {
		this.listEl?.firstElementChild?.focus()
	}

	destroy() {
		this.root?.remove()
		this.root = null
	}
}

/* ============================================================
 * Logic Engine
 * ============================================================ */
function runMenu(menu, resolve, reject, isSelectFrom = false) {
	const root = menu.render()

	const cleanup = () => {
		menu.destroy()
		destroyOverlay()
		GLOBAL.currentView = GLOBAL.previousView
		document.removeEventListener('click', outsideClick)
	}

	const outsideClick = (e) => {
		if (root && !root.contains(e.target)) {
			cleanup()
			isSelectFrom ? reject('selectioncancelled') : resolve(null)
		}
	}

	menu.onSelect = (item) => {
		cleanup()
		// If it's the old selectFrom style, return the whole option object
		resolve(item.originalReference ?? item.value)
	}

	menu.onCancel = () => {
		cleanup()
		isSelectFrom ? reject('selectioncancelled') : resolve(null)
	}

	GLOBAL.previousView = GLOBAL.currentView
	GLOBAL.currentView = 'dmenu'
	createOverlay()

	setTimeout(() => document.addEventListener('click', outsideClick), 10)
	document.getElementById('content-area').appendChild(root)
	menu.focusFirst()
}

/* ============================================================
 * Exports
 * ============================================================ */
export function selectFrom(options, addCustom = true) {
	return new Promise((resolve, reject) => {
		const items = options.map((o) => ({
			label: o.name,
			value: o.value,
			description: o.description,
			originalReference: o, // Keep the whole object to return it
		}))
		if (addCustom) {
			items.push({ label: 'Custom value...', value: 'custom', description: 'Enter a custom value' })
		}
		runMenu(new DMenu({ items, promptText: 'Type to search' }), resolve, reject, true)
	})
}

export function dmenuConfirm() {
	return new Promise((resolve) => {
		runMenu(
			new DMenu({
				promptText: 'Are you sure?',
				items: [
					{ label: 'Yes', value: true },
					{ label: 'No', value: false },
				],
			}),
			resolve,
			null,
		)
	})
}

export function dmenuWrapper({
	items = [],
	promptText = '',
	searchbar = true,
	footerText = '↑ ↓ Enter Esc cancel',
	addCustom = false,
	cancelValue = null,
} = {}) {
	return new Promise((resolve) => {
		const menuItems = items.map((o) => ({
			label: o.label ?? String(o.value),
			value: o.value,
			description: o.description,
		}))
		if (addCustom) menuItems.push({ label: 'Custom value...', value: 'custom' })
		runMenu(new DMenu({ searchbar, promptText, footer: footerText, items: menuItems }), resolve, null)
	})
}
