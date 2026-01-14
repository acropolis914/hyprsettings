import { GLOBAL } from '../GLOBAL.js'
import { hideAllContextMenus } from '../utils.js'
import { createOverlay } from './darken_overlay.js'

document.addEventListener('keydown', (event) => {
	if (event.key === 'F5') {
		event.preventDefault() // stop browser's built-in search
		location.reload()

	}
})

document.addEventListener('mousedown', e => {
	if (!e.target.closest('.context-menu, .editor-item')) {
		hideAllContextMenus()
	}
})

const pressed = new Set()
hotkeys('*', { keydown: true, keyup: true }, (event) => {
	if (event.type === 'keydown') pressed.add(event.key)
	if (event.type === 'keyup') {
		setTimeout(() => {
			pressed.delete(event.key)
		}, 200)

	}
	document.querySelector('#keys-display').innerHTML =
		Array.from(pressed).join(' + ')
	setTimeout(() => {
		pressed.clear()
		document.querySelector('#keys-display').textContent = ''
	}, 1500)
})


GLOBAL.setKey('currentView', 'tabs') //area of the document currently active
GLOBAL['activeTab']
GLOBAL['mainFocus'] = {}
window.currentFocus = null

hotkeys('*', (event) => {
	let pressedKey = event.key
	let focused = document.activeElement

	if (event.key === 'Escape') {
		event.preventDefault()
	}
	if (event.key === 'Tab') {
		// event.preventDefault();
	}
	if (pressedKey === '/') {
		if (GLOBAL['currentView'] !== 'search') {
			event.preventDefault()
			GLOBAL['previousView'] = GLOBAL['currentView']
			GLOBAL['currentView'] = 'search'
			createOverlay()

			document.getElementById('search-bar').focus()
		}
	}

	if (event.key === 'ArrowRight' && GLOBAL['currentView'] === 'tabs') {
		const currentSet = document.querySelector(`.config-set#${GLOBAL['activeTab']}`)
		if (!currentSet) {
			console.log(`Config set ${GLOBAL['activeTab']} doesnt exist.`)
			return
		} else {
			// console.log(`Config set ${GLOBAL["activeTab"]} exists.`);
		}
		if (GLOBAL['mainFocus'][GLOBAL['activeTab']] && currentSet.querySelector(`[data-uuid='${GLOBAL['mainFocus'][GLOBAL['activeTab']]}']`)) {
			const prevFocus = currentSet.querySelector(`[data-uuid='${GLOBAL['mainFocus'][GLOBAL['activeTab']]}']`)
			if (prevFocus) {
				window.currentFocus = prevFocus
				prevFocus.focus({ preventScroll: true })
				GLOBAL.setKey('currentView', 'main')
			}
		} else {
			const firstChild = Array.from(currentSet.children).find(
				child => !child.classList.contains('settings-hidden') && child.getAttribute('tabindex') != null
			)
			if (firstChild) {
				window.currentFocus = firstChild
				firstChild.focus({ preventScroll: true })
				GLOBAL['mainFocus'][GLOBAL['activeTab']] = firstChild.dataset.uuid || 0
				GLOBAL.setKey('currentView', 'main')
			}
		}
	}

	if (event.key === 'ArrowLeft' && GLOBAL['currentView'] === 'main') {
		const activeElem = document.activeElement
		if (activeElem && activeElem.dataset.uuid != null) {
			GLOBAL['mainFocus'][GLOBAL['activeTab']] = activeElem.dataset.uuid
		}
		window.currentFocus.blur()
		GLOBAL.setKey('currentView', 'tabs')
		const selectedTab = document.querySelector(`.selected`)
		if (selectedTab) {
			selectedTab.classList.add('keyboard-selected')
			selectedTab.click()
		}
	}

	switch (GLOBAL['currentView']) {
		case 'main': {
			const currentSet = document.querySelector(`.config-set#${GLOBAL['activeTab']}`)
			if (!currentSet) break

			let activeElement = currentSet.querySelector(`[data-uuid='${GLOBAL['mainFocus'][GLOBAL['activeTab']]}']`)
			if (!activeElement) {
				activeElement = document.activeElement
				if (activeElement.getAttribute('tabindex') == null) {
					break
				}
			}

			const children = Array.from(currentSet.querySelectorAll('.editor-item'))
			let index = children.indexOf(activeElement)
			let newIndex = index

			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault()
					newIndex = (index === children.length - 1) ? 0 : index + 1
					while (children[newIndex].classList.contains('settings-hidden')) {
						newIndex = (newIndex + 1) % children.length
					}
					break
				case 'ArrowUp':
					event.preventDefault()
					newIndex = (index === 0) ? children.length - 1 : index - 1
					while (children[newIndex].classList.contains('settings-hidden')) {
						newIndex = (newIndex - 1 + children.length) % children.length
					}
					break
			}

			activeElement.blur()
			const newActiveElement = children[newIndex]
			if (!newActiveElement) break
			window.currentFocus = newActiveElement
			newActiveElement.focus()
			GLOBAL['mainFocus'][GLOBAL['activeTab']] = newActiveElement.dataset.uuid

			if (newActiveElement.classList.contains('config-group')) {
				// console.log(newActiveElement.classList)
				const offset = 80
				const top = newActiveElement.getBoundingClientRect().top + window.scrollY - offset
				window.scrollTo({ top, behavior: 'smooth' })
			} else {
				newActiveElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
			}
			break
		}

		case 'tabs': {
			// console.debug(GLOBAL['currentView'])
			const currentSelected = document.querySelector('.selected')
			if (!currentSelected) break
			const parent = currentSelected.parentElement
			if (!parent) break
			let children = Array.from(parent.querySelectorAll('li'))
			let index = children.indexOf(currentSelected)
			let newIndex = index

			// console.debug(GLOBAL['currentView'])
			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault()
					newIndex = (index === children.length - 1) ? 0 : index + 1
					while (children[newIndex].tagName === 'DIV' || children[newIndex].classList.contains("hidden")) {
						newIndex = (newIndex + 1) % children.length
					}
					break
				case 'ArrowUp':
					event.preventDefault()
					newIndex = (index === 0) ? children.length - 1 : index - 1
					while (children[newIndex].tagName === 'DIV' || children[newIndex].classList.contains("hidden")) {
						newIndex = (newIndex - 1 + children.length) % children.length
					}
					break
			}
			// console.debug(GLOBAL['currentView'])
			currentSelected.classList.remove('selected')
			currentSelected.classList.remove('keyboard-selected')
			const newSelected = children[newIndex]
			newSelected.classList.add('selected')
			newSelected.classList.add('keyboard-selected')
			newSelected.click()
			newSelected.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
			GLOBAL['activeTab'] = newSelected.id
			// console.log(GLOBAL['currentView'])
			break
		}

		case 'search': {
			// GLOBAL['previousView'] = GLOBAL['currentView']
			// GLOBAL['currentView'] = 'search'
			break
		}

		case 'dmenu': {
			break
		}

		case 'default': {
			console.log("No current handler for this view: ", GLOBAL['currentView'])
		}
	}
})


GLOBAL.onChange('currentView', (/** @type {string} */ value) => {
	switch (value) {
		case 'main':
			document.querySelector('.sidebar-item.keyboard-selected')?.classList.remove('keyboard-selected')
			break
		case 'tabs':
			const selectedTab = document.querySelector(`li.selected`)
			// console.debug("Navigating to tab:",selectedTab.textContent.trim());
			break

	}
})