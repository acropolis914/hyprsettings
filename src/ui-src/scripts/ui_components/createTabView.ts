import { saveWindowConfig } from '../utils/utils.ts'
import { tabs } from '@scripts/HyprlandSpecific/configMap.js'
import { GLOBAL } from '../GLOBAL.js'
import ContextMenu from './verticalContextMenu.svelte'
import { mount, unmount } from 'svelte'
import { counter, menuState } from './svelteStates.svelte.js'
import { implementScrollHints } from '@scripts/utils/scrollHints.ts'

let initialLoad = true
let activeContextMenus: any[] = []

interface TabProps {
	id?: string
	name: string
	icon?: string
	default?: boolean
}

class ConfigTab {
	private configview: any
	sidebar = document.querySelector('aside#sidebar>ul')
	id: string
	name: any
	icon: any
	shown: boolean
	contextMenu: any

	constructor(tab: TabProps, options = {}) {
		if (tab.name === 'separator') {
			this.make_separator(tab)
			return
		}
		this.id = tab.id
		this.name = tab.name
		this.icon = tab.icon
		let exists = document.querySelector(`aside#sidebar>ul>li#${this.id}`)
		if (exists) {
			console.warn(`A tab with id ${tab.id} already exists.`)
			return
		}

		this.shown = tab.default
		this.sidebar = document.querySelector('aside#sidebar>ul')
		this.configview = document.querySelector('#content-area')
		this.makeSidebarItem()
		this.makeContentView()
		this.makeDocumentFragment(tab)
	}

	make_separator(tab) {
		let separator = document.createElement('div')
		separator.classList.add('tab-separator')
		separator.textContent = tab.label
		separator.setAttribute('title', tab.label)
		separator.addEventListener('contextmenu', (e) => {
			e.preventDefault()
		})
		this.sidebar.appendChild(separator)
	}

	makeSidebarItem() {
		let item = document.createElement('li')
		item.id = this.id
		item.classList.add('sidebar-item')
		item.tabIndex = 0
		let icon = document.createElement('div')
		icon.textContent = this.icon
		icon.classList.add('sidebar-icon')
		icon.id = 'sidebar-icon'
		let text = document.createElement('div')
		text.textContent = this.name
		text.classList.add('sidebar-text')
		item.appendChild(icon)
		item.appendChild(text)
		item.setAttribute('title', this.name)
		// item.textContent = this.name;

		item.dataset.label = this.name
		// console.log(item.dataset.label)
		if (this.shown) {
			document.querySelectorAll('aside#sidebar>ul>li').forEach((i) => i.classList.remove('selected'))
			item.classList.add('selected')
		}
		item.addEventListener('click', () => {
			this.handleTabClick()
			if (this.contextMenu) {
				unmount(this.contextMenu)
				this.contextMenu = undefined
			}
		})
		item.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			this.createContextMenu(item, e)
			this.handleTabClick()
		})
		// item.addEventListener("focus", (e) => {
		// 	this.handleTabClick(this.id);
		// });
		this.sidebar.append(item)
	}

	makeContentView() {
		let item = document.createElement('div')
		item.classList.add('config-set')
		item.id = this.id
		item.classList.add('hidden', 'scrollable')
		item.addEventListener('click', (e) => {
			if (GLOBAL.currentView !== 'main' && item.id !== 'wiki') {
				GLOBAL.setKey('previousView', GLOBAL.currentView)
				GLOBAL.setKey('currentView', 'main')
			}
		})

		item.addEventListener('contextmenu', (e) => {
			console.log('Showing config-set context-menu')
			e.preventDefault()
			if (e.target != item) return
			this.createContextMenu(item, e)
		})

		item.addEventListener('click', async (e) => {
			if (this.contextMenu) {
				unmount(this.contextMenu)
				this.contextMenu = undefined
			}
		})

		if (this.shown) {
			document.querySelectorAll('#content-area>.config-set').forEach((i) => i.classList.add('hidden'))
			item.classList.remove('hidden')
			document.getElementById('config-set-title').textContent = this.name
		}
		implementScrollHints(item)
		this.configview.appendChild(item)
	}

	makeDocumentFragment() {
		GLOBAL.editorItemTemporaryContainers[`${this.id}`] = new DocumentFragment()
	}

	handleTabClick() {
		document.querySelectorAll('.config-set').forEach((element) => {
			element.id === this.id ? element.classList.remove('hidden') : element.classList.add('hidden')
		})
		document.querySelectorAll('.sidebar-item').forEach((element) => {
			element.id === this.id ? element.classList.add('selected') : element.classList.remove('selected', 'keyboard-selected')
		})
		const sidebarItem = document.querySelector(`aside#sidebar>ul>#${this.id}`)
		const sidebarItemTitle = this.name
		const configSetTitle = document.querySelector('#config-set-title')
		configSetTitle.textContent = sidebarItemTitle
		if (this.id === 'settings') {
			// console.log(id)
			configSetTitle.classList.add('hidden')
		} else {
			configSetTitle.classList.remove('hidden')
		}
		GLOBAL['persistence']['last_tab'] = this.id
		GLOBAL.setKey('currentView', 'tabs')
		GLOBAL.setKey('activeTab', this.id)
		if (!initialLoad) {
			saveWindowConfig()
		}
	}

	createContextMenu(el: HTMLDivElement | HTMLElement, e: MouseEvent) {
		let noContextMenu = ['settings', 'debug', 'wiki']
		if (noContextMenu.includes(this.id)) {
			return
		}
		console.log('Opening context menu for the config set')

		// Unmount all currently active context menus first
		activeContextMenus.forEach((menu) => unmount(menu))
		activeContextMenus = []

		if (this.contextMenu) {
			unmount(this.contextMenu)
			this.contextMenu = undefined
		}

		// Update global state for action handlers to work correctly
		menuState.closestConfigSet = document.querySelector(`.config-set#${this.id}`)

		// Avoid reactivity cross-talk by passing a fresh local object instead of the global menuState
		let localState = {
			items: menuState.items,
			visible: true,
			x: e.pageX,
			y: e.pageY,
			closestConfigSet: menuState.closestConfigSet,
		}

		const menu = mount(ContextMenu, {
			target: document.body as HTMLElement,
			props: localState,
		})
		this.contextMenu = menu
		activeContextMenus.push(menu)
		return { menu, localState }
	}
}

export default async function createTabView() {
	return new Promise(async (resolve) => {
		let sidebar = document.querySelector('aside#sidebar>ul')
		sidebar.innerHTML = ''
		document.querySelectorAll('.config-set').forEach((element) => {
			element.remove()
		})
		for (let tab of tabs) {
			if (tab.name === 'debug' && !(GLOBAL['isDebugging'] === true)) {
				continue
			}
			new ConfigTab(tab)
		}
		setTimeout(() => {
			let scrollContainer = document.querySelector('aside#sidebar') as HTMLDivElement | HTMLUListElement
			implementScrollHints(scrollContainer)
		}, 0)

		if (!(GLOBAL['isDebugging'] === true)) {
			let debugTab = sidebar.querySelector('li#debug')
			debugTab.classList.add('hidden')
		}

		if (GLOBAL['persistence']['last_tab']) {
			let id = GLOBAL['persistence']['last_tab']
			let selected_tab = document.querySelector(`aside#sidebar>ul>#${id}`)
			if (selected_tab) {
				selected_tab.click()
			}
			GLOBAL['activeTab'] = id
		} else {
			console.log(GLOBAL)
		}
		initialLoad = false

		resolve(true)
	})
}

export async function focusTab(id: string) {
	document.querySelector(`aside#sidebar>ul>#${id}`).click()
}
