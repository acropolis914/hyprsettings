import { saveWindowConfig } from '../utils.ts'
import { tabs } from '../hyprland-specific/configMap.js'
import { GLOBAL } from '../GLOBAL.js'
let initialLoad = true

class ConfigTab {
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
			document
				.querySelectorAll('aside#sidebar>ul>li')
				.forEach((i) => i.classList.remove('selected'))
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
		item.classList.add('hidden')
		if (this.shown) {
			document
				.querySelectorAll('#content-area>.config-set')
				.forEach((i) => i.classList.add('hidden'))
			item.classList.remove('hidden')
			document.getElementById('config-set-title').textContent =
				this.name
		}
		this.configview.appendChild(item)
	}

	handleTabClick(id) {
		document.querySelectorAll('.config-set').forEach((element) => {
			element.id === id
				? element.classList.remove('hidden')
				: element.classList.add('hidden')
		})
		document.querySelectorAll('.sidebar-item').forEach((element) => {
			element.id === id
				? element.classList.add('selected')
				: element.classList.remove('selected', 'keyboard-selected')
		})
		const sidebarItem = document.querySelector(`aside#sidebar>ul>#${id}`)
		const sidebarItemTitle = sidebarItem.dataset.label
		const configSetTitle = document.querySelector('#config-set-title')
		configSetTitle.textContent = sidebarItemTitle
		if (sidebarItemTitle.toLowerCase() === 'settings') {
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
}

export async function createDynamicTabs() {
	return new Promise((resolve) => {
		let sidebar = document.querySelector('aside#sidebar>ul')
		sidebar.innerHTML = ''
		document.querySelectorAll('.config-set').forEach((element) => {
			element.remove()
		})
		for (let tab of tabs) {
			// console.log(tab)
			new ConfigTab(tab)
		}
		// console.debug(GLOBAL["isDebugging"])
		if (!(GLOBAL['isDebugging'] === true)) {
			// console.debug(GLOBAL['isDebugging'])
			let debugTab = sidebar.querySelector('li#debug')
			debugTab.classList.add('hidden')
		} else {
			// console.debug(GLOBAL["isDebugging"])
		}

		if (GLOBAL['persistence']['last_tab']) {
			let id = GLOBAL['persistence']['last_tab']
			let selected_tab = document.querySelector(
				`aside#sidebar>ul>#${id}`,
			)
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
