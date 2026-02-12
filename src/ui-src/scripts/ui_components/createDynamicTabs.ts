import { saveWindowConfig } from '../utils/utils.ts'
import { tabs } from '@scripts/HyprlandSpecific/configMap.js'
import { GLOBAL } from '../GLOBAL.js'
import ContextMenu from './verticalContextMenu.svelte'
import { mount, unmount } from 'svelte'
import { counter, menuState } from './svelteStates.svelte.js'
import { waitFor } from '@scripts/utils/helpers'

let initialLoad = true

class ConfigTab {
	private configview: any

	constructor(tab) {
		// console.log(tab)
		if (tab.name === 'separator') {
			this.sidebar = document.querySelector('aside#sidebar>ul')
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
		item.id = this.id
		item.dataset.label = this.name
		// console.log(item.dataset.label)
		if (this.shown) {
			document.querySelectorAll('aside#sidebar>ul>li').forEach((i) => i.classList.remove('selected'))
			item.classList.add('selected')
		}
		item.addEventListener('click', () => {
			this.handleTabClick(this.id)
		})
		item.addEventListener('contextmenu', (e) => {
			e.preventDefault()
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
			if (GLOBAL.currentView !== 'main') {
				GLOBAL.setKey('previousView', GLOBAL.currentView)
				GLOBAL.setKey('currentView', 'main')
			}
		})
		let contextMenu: any
		let contextMenuState
		item.addEventListener('contextmenu', (e) => {
			e.preventDefault()
			if (e.target != item) return
			if (!contextMenu) {
				let { menu: contextMenu, menuState: contextMenuState } = this.createContextMenu(item, e)
				contextMenuState.visible = true
			} else {
				contextMenuState.visible = true
			}
		})

		item.addEventListener('click', async (e) => {
			if (contextMenu) await unmount(contextMenu)
		})

		if (this.shown) {
			document.querySelectorAll('#content-area>.config-set').forEach((i) => i.classList.add('hidden'))
			item.classList.remove('hidden')
			document.getElementById('config-set-title').textContent = this.name
		}
		this.configview.appendChild(item)
	}

	handleTabClick(id) {
		document.querySelectorAll('.config-set').forEach((element) => {
			element.id === id ? element.classList.remove('hidden') : element.classList.add('hidden')
		})
		document.querySelectorAll('.sidebar-item').forEach((element) => {
			element.id === id ? element.classList.add('selected') : element.classList.remove('selected', 'keyboard-selected')
		})
		const sidebarItem = document.querySelector(`aside#sidebar>ul>#${id}`)
		const sidebarItemTitle = sidebarItem.dataset.label
		const configSetTitle = document.querySelector('#config-set-title')
		configSetTitle.textContent = sidebarItemTitle
		if (id === 'settings') {
			console.log(id)
			configSetTitle.classList.add('hidden')
		} else {
			configSetTitle.classList.remove('hidden')
		}
		GLOBAL['persistence']['last_tab'] = id
		GLOBAL.setKey('currentView', 'tabs')
		GLOBAL.setKey('activeTab', id)
		if (!initialLoad) {
			saveWindowConfig()
		}
	}

	createContextMenu(el: HTMLDivElement, e: MouseEvent) {
		console.log(counter.count)
		const rect = el.getBoundingClientRect()
		menuState.x = e.pageX
		menuState.y = e.pageY
		const menu = mount(ContextMenu, {
			target: document.body,
			props: menuState,
		})
		return { menu, menuState }
	}
}

export default async function createDynamicTabs() {
	return new Promise(async (resolve) => {
		// const simpleBarInstance = new SimpleBar(document.querySelector('#scroll-wrapper'))
		// const contentEl = simpleBarInstance.getContentElement()

		let sidebar = document.querySelector('aside#sidebar>ul') //TODO Fix sidebar .simplebar-content > ul:nth-child(1)
		// let sidebar = await waitFor(() => document.querySelector('.simplebar-content > ul'))
		sidebar.innerHTML = ''
		document.querySelectorAll('.config-set').forEach((element) => {
			element.remove()
		})
		for (let tab of tabs) {
			// console.log(tab)
			new ConfigTab(tab)
		}
		if (!(GLOBAL['isDebugging'] === true)) {
			let debugTab = sidebar.querySelector('li#debug')
			debugTab.classList.add('hidden')
		} else {
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
		resolve()
	})
}
