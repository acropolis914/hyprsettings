// dmenu.js
import { GLOBAL } from '../GLOBAL.ts'
import { createOverlay, destroyOverlay } from './darkenOverlay.js'
import { implementScrollHints } from '@scripts/utils/scrollHints.ts'

export interface DMenuItem {
	label?: string
	name?: string
	value?: any
	description?: string
	originalReference?: any
}

export interface DMenuOptions {
	items?: DMenuItem[]
	onSelect?: (item: DMenuItem) => void
	onCancel?: () => void
	promptText?: string
	searchbar?: boolean
	footer?: string
}

/* ============================================================
 * Generic DMenu (reusable, app-agnostic)
 * ============================================================ */
class DMenu {
	listEl: HTMLUListElement
	private root: HTMLDivElement
	items: DMenuItem[]
	filteredItems: DMenuItem[]
	onSelect: (item: DMenuItem) => void
	onCancel: () => void
	promptText: string
	searchbar: boolean
	footerText: string
	inputEl?: HTMLInputElement

	constructor({
		items = [],
		onSelect = () => {},
		onCancel = () => {},
		promptText = '',
		searchbar = true,
		footer = '↑ ↓ Enter',
	}: DMenuOptions = {}) {
		this.items = items
		this.filteredItems = items
		this.onSelect = onSelect
		this.onCancel = onCancel
		this.promptText = promptText
		this.searchbar = searchbar
		this.footerText = footer
		this.root = null as any
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

		this.listEl = document.createElement('ul') as HTMLUListElement
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

	_renderItems(items: DMenuItem[]) {
		this.listEl.innerHTML = ''
		items.forEach((item) => this._addItem(item))
	}

	_filter(query: string) {
		const q = query.toLowerCase()
		this.filteredItems = this.items.filter((item) => (item.label ?? String(item.value ?? item)).toLowerCase().includes(q))
		this._renderItems(this.filteredItems)
		this.focusFirst()
	}

	_addItem(item: DMenuItem) {
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
			desc.innerHTML = item.description
			li.appendChild(desc)
		}

		const choose = () => this.onSelect(item)

		li.addEventListener('click', (e) => {
			e.stopPropagation()
			choose()
		})
		li.addEventListener('focus', (e) => {
			li.classList.add('selected')
			li.querySelector('.dmenu-item-description')?.classList.remove('hidden')

			// Wait for the next frame so the height update is "locked in"
			requestAnimationFrame(() => {
				li.scrollIntoView({ behavior: 'smooth', block: 'center' })
			})
		})
		li.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
				li.classList.remove('selected')
				li.querySelector('.dmenu-item-description')?.classList.add('hidden')
			}
		})
		// li.addEventListener('blur', () => {
		// 	li.classList.remove('selected')
		// 	li.querySelector('.dmenu-item-description')?.classList.add('hidden')
		// })

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
		implementScrollHints(this.listEl)
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
function runMenu(menu: DMenu, resolve: (val: any) => void, reject: (reason?: any) => void, isSelectFrom = false) {
	const root = menu.render()
	const previousView = GLOBAL.currentView ?? 'main'
	GLOBAL.previousView = previousView

	const cleanup = () => {
		menu.destroy()
		destroyOverlay()
		GLOBAL.currentView = previousView
		document.removeEventListener('click', outsideClick)
	}

	const outsideClick = (e: MouseEvent) => {
		if (root && !root.contains(e.target as Node)) {
			cleanup()
			isSelectFrom && reject ? reject('selectioncancelled') : resolve(null)
		}
	}

	menu.onSelect = (item: DMenuItem) => {
		cleanup()
		// If it's the old selectFrom style, return the whole option object
		resolve(item.originalReference ?? item.value)
	}

	menu.onCancel = () => {
		cleanup()
		isSelectFrom && reject ? reject('selectioncancelled') : resolve(null)
	}

	createOverlay()

	setTimeout(() => document.addEventListener('click', outsideClick), 10)
	document.getElementById('content-area').appendChild(root)
	// Delay this so click handlers in editor rows cannot immediately flip view back to `main`.
	setTimeout(() => {
		GLOBAL.currentView = 'dmenu'
	}, 0)
	menu.focusFirst()
}

/* ============================================================
 * Exports
 * ============================================================ */
export function selectFrom(options: DMenuItem[], addCustom = true): Promise<any> {
	return new Promise((resolve, reject) => {
		const items: DMenuItem[] = options.map((o) => ({
			label: o.name,
			value: o.value,
			description: o.description,
			originalReference: o, // Keep the whole object to return it
		}))
		if (addCustom) {
			items.push({
				label: 'Custom value...',
				value: 'custom',
				description: 'Enter a custom value',
			})
		}
		runMenu(new DMenu({ items, promptText: 'Type to search' }), resolve, reject, true)
	})
}

export async function dmenuConfirm(message: string | null = null): Promise<boolean> {
	return new Promise((resolve) => {
		runMenu(
			new DMenu({
				promptText: message || 'Are you sure?',
				items: [
					{ label: 'Yes', value: true },
					{ label: 'No', value: false },
				],
			}),
			resolve as (val: any) => void,
			() => {},
		)
	})
}

export interface DMenuWrapperOptions {
	items?: DMenuItem[]
	promptText?: string
	searchbar?: boolean
	footerText?: string
	addCustom?: boolean
	cancelValue?: any
}

export function dmenuWrapper({
	items = [],
	promptText = '',
	searchbar = true,
	footerText = '↑ ↓ Enter Esc cancel',
	addCustom = false,
	cancelValue = null,
}: DMenuWrapperOptions = {}): Promise<any> {
	return new Promise((resolve) => {
		const menuItems: DMenuItem[] = items.map((o) => ({
			label: o.label ?? String(o.value),
			value: o.value,
			description: o.description,
		}))
		if (addCustom)
			menuItems.push({
				label: 'Custom value...',
				value: 'custom',
				description: 'Enter a custom value',
			})
		runMenu(
			new DMenu({
				searchbar,
				promptText,
				footer: footerText,
				items: menuItems,
			}),
			resolve,
			() => {},
		)
	})
}
