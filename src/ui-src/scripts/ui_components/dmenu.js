// dmenu.js
import { GLOBAL } from '../GLOBAL.ts'
import { createOverlay, destroyOverlay } from './darken_overlay.js'

/* ============================================================
 * Generic DMenu (reusable, app-agnostic)
 * ============================================================ */
class DMenu {
	constructor({
		items = [],
		onSelect = () => {},
		onCancel = () => {},
		promptText = '',
		searchbar = true,
		footer = '↑ ↓ Enter',
	} = {}) {
		this.items = items
		this.filteredItems = items
		this.onSelect = onSelect
		this.onCancel = onCancel
		this.promptText = promptText
		this.searchbar = searchbar
		this.footerText = footer

		this.root = null
		this.listEl = null
		this.inputEl = null
	}

	render() {
		this.root = document.createElement('div')
		this.root.className = 'dmenu'
		this.root.id = 'dmenu'
		this.root.tabIndex = 0

		/* search bar (top) */
		if (this.searchbar) {
			this.inputEl = document.createElement('input')
			this.inputEl.type = 'text'
			this.inputEl.className = 'dmenu-search'
			this.inputEl.placeholder = this.promptText

			this.inputEl.addEventListener('input', () => {
				this._filter(this.inputEl.value)
			})

			this.root.appendChild(this.inputEl)
		}

		/* list */
		this.listEl = document.createElement('ul')
		this.listEl.className = 'dmenu-list'
		this.listEl.tabIndex = 0
		this.root.appendChild(this.listEl)

		/* footer (bottom hint box) */
		const footer = document.createElement('div')
		footer.className = 'dmenu-footer'
		footer.textContent = this.footerText
		this.root.appendChild(footer)

		this._renderItems(this.items)

		/* direct typing → searchbar */
		this.root.addEventListener('keydown', (e) => {
			if (!this.searchbar || !this.inputEl) return

			// letters + underscore only
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
		this.filteredItems = this.items.filter((item) =>
			(item.label ?? String(item)).toLowerCase().includes(q),
		)

		this._renderItems(this.filteredItems)
		this.focusFirst()
	}

	_addItem(item) {
		const li = document.createElement('li')
		li.className = 'dmenu-item'
		li.tabIndex = 0

		let listLabel = document.createElement('div')
		listLabel.classList.add('dmenu-item-label')
		listLabel.textContent = item.label ?? String(item)
		li.appendChild(listLabel)

		let listDescription
		if (item.description) {
			listDescription = document.createElement('div')
			listDescription.classList.add('dmenu-item-description')
			listDescription.classList.add('hidden')
			li.appendChild(listDescription)
			listDescription.textContent = item.description
		}

		const choose = () => this.onSelect(item)

		li.addEventListener('click', choose)

		li.addEventListener('focus', () => {
			li.classList.add('selected')
			listDescription.classList.remove('hidden')
		})

		li.addEventListener('mouseover', () => {
			li.classList.add('mousehover')
			listDescription.classList.remove('hidden')
		})
		li.addEventListener('pointerleave', () => {
			if (li.classList.contains('selected')) {return}
			li.classList.remove('mousehover')
			listDescription.classList.add('hidden')
		})

		li.addEventListener('blur', () => {
			li.classList.remove('selected')
			listDescription.classList.add('hidden')
		})

		li.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') choose()
			if (e.key === 'Escape') this.onCancel()

			if (e.key === 'ArrowDown') {
				e.preventDefault()
				;(this._next(li) ?? this.listEl.firstElementChild)?.focus()
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault()
				;(this._prev(li) ?? this.listEl.lastElementChild)?.focus()
			}
		})

		this.listEl.appendChild(li)
	}

	_next(el) {
		let n = el.nextElementSibling
		while (n && n.tagName !== 'LI') n = n.nextElementSibling
		return n
	}

	_prev(el) {
		let p = el.previousElementSibling
		while (p && p.tagName !== 'LI') p = p.previousElementSibling
		return p
	}

	focusFirst() {
		this.listEl?.firstElementChild?.focus()
	}

	destroy() {
		this.root?.remove()
	}
}

/* ============================================================
 * Backwards-compatible wrapper
 * ============================================================ */
export function selectFrom(options, addCustom = true) {
	return new Promise((resolve, reject) => {
		GLOBAL.previousView = GLOBAL.currentView
		GLOBAL.currentView = 'dmenu'
		// console.log(options)

		createOverlay()

		let menu

		function cleanup() {
			menu?.destroy()
			destroyOverlay()
			GLOBAL.currentView = GLOBAL.previousView
			document.removeEventListener('click', outsideClick)
		}
		if (addCustom) {
			let custom = {
				name: 'Custom value...',
				value: 'custom',
				description: 'Enter a custom value',
			}
			options.push(custom)
		}

		menu = new DMenu({
			items: options.map((o) => ({
				label: o.name,
				value: o,
				type: o.type,
				description: o.description,
			})),
			onSelect: (item) => {
				cleanup()
				resolve(item.value)
			},
			onCancel: () => {
				cleanup()
				console.warn('Selection cancelled')
				reject('selectioncancelled')
			},
			promptText: 'Type to search',
		})

		const root = menu.render()

		function outsideClick(e) {
			if (!root.contains(e.target)) {
				cleanup()
				console.warn('Selection cancelled')
				reject('selectioncancelled')
			}
		}

		document.addEventListener('click', outsideClick)

		document.getElementById('content-area').appendChild(root)

		menu.focusFirst()
	})
}

export function dmenuConfirm() {
	return new Promise((resolve, reject) => {
		GLOBAL.setKey('previousView', GLOBAL.currentView)
		GLOBAL.currentView = 'dmenu'
		createOverlay()
		let menu
		function cleanup() {
			menu?.destroy()
			destroyOverlay()
			GLOBAL.currentView = GLOBAL.previousView
			document.removeEventListener('click', outsideClick)
		}
		menu = new DMenu({
			searchbar: true,
			promptText: 'Are you sure?',
			items: [
				{ label: 'Yes', value: true },
				{ label: 'No', value: false },
			],
			onSelect: (item) => {
				menu.destroy()
				resolve(item.value)
				cleanup()

			},
			onCancel: () => {
				menu.destroy()
				resolve(false)
				cleanup()
			},
		})

		function outsideClick(e) {
			if (!root.contains(e.target)) {
				cleanup()
				console.warn('Selection cancelled')
				reject('selectioncancelled')
			}
		}

		document.addEventListener('click', outsideClick)
		document.getElementById('content-area').appendChild(menu.render())
		menu.focusFirst()
	})
}



/* ============================================================
 * General DMenu wrapper: returns a promise with item.value
 * ============================================================ */
export function dmenuWrapper({
						    items = [],          // array of { label, value, description?, type? }
						    promptText = '',     // optional placeholder / prompt
						    searchbar = true,    // whether to show search input
						    footerText = '↑ ↓ Enter Esc cancel',
						    addCustom = false,   // optional "custom value..." item
						    cancelValue = null,  // what to resolve if cancelled / Esc / outside click
					    } = {}) {
	return new Promise((resolve) => {
		GLOBAL.previousView = GLOBAL.currentView
		GLOBAL.currentView = 'dmenu'

		createOverlay()

		let menu

		function cleanup() {
			menu?.destroy()
			destroyOverlay()
			GLOBAL.currentView = GLOBAL.previousView
			document.removeEventListener('click', outsideClick)
		}

		if (addCustom) {
			items.push({
				label: 'Custom value...',
				value: 'custom',
				description: 'Enter a custom value',
			})
		}

		menu = new DMenu({
			searchbar,
			promptText,
			footer: footerText,
			items: items.map((o) => ({
				label: o.label ?? String(o.value),
				value: o.value,
				type: o.type,
				description: o.description,
			})),
			onSelect: (item) => {
				cleanup()
				resolve(item.value)
			},
			onCancel: () => {
				cleanup()
				resolve(cancelValue)
			},
		})

		const root = menu.render()

		function outsideClick(e) {
			if (!root.contains(e.target)) {
				cleanup()
				resolve(cancelValue)
			}
		}

		document.addEventListener('click', outsideClick)
		document.getElementById('content-area').appendChild(root)
		menu.focusFirst()
	})
}

/* ============================================================
 * Sample usage (direct DMenu)
 * ============================================================ */

// const menu = new DMenu({
// 	promptText: 'Choose an action',
// 	footer: '↑ ↓ Enter  Esc cancel',
// 	items: [
// 		{ label: 'Open', id: 'open' },
// 		{ label: 'Save', id: 'save' },
// 		{ label: 'Quit', id: 'quit' },
// 	],
// 	onSelect: item => {
// 		console.log('Selected:', item.id);
// 		menu.destroy();
// 	},
// 	onCancel: () => {
// 		console.log('Cancelled');
// 		menu.destroy();
// 	},
// });
//
// document.body.appendChild(menu.render());
// menu.focusFirst();
