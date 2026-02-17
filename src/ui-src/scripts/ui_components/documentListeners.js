import { GLOBAL } from '../GLOBAL.ts'
import { hideAllContextMenus } from '@scripts/utils/utils.ts'
import { createOverlay } from './darkenOverlay.js'
import hotkeys from 'hotkeys-js'

/* -------------------------------------------------------------------------- */
/* INITIALIZATION                              */
/* -------------------------------------------------------------------------- */

initializeState()
initializeGlobalListeners()

/* -------------------------------------------------------------------------- */
/* MAIN LOGIC                                 */
/* -------------------------------------------------------------------------- */

/**
 * Main Entry Point for Keyboard Events
 */
function handleKeyInput(event) {
	const key = event.key

	// 1. Check Global Overrides (Search, Reload, Escape)
	// If handleGlobalShortcuts returns true, the event was handled.
	if (handleGlobalShortcuts(event)) return

	// 2. Route based on Current View
	switch (GLOBAL['currentView']) {
		case 'tabs':
			handleTabsView(event)
			break
		case 'main':
			handleMainView(event)
			break
		case 'search':
		case 'dmenu':
			// Add handlers here if needed
			break
		case 'editorItem':
			if (event.key === 'Tab') {
			} else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
				event.preventDefault()
			}
			break
		default:
			console.warn('No handler for view:', GLOBAL['currentView'])
	}
}

/**
 * Logic for when the sidebar (tabs) is active
 */
function handleTabsView(event) {
	const key = event.key

	if (key === 'ArrowRight') {
		attemptSwitchToMain()
		return
	}

	if (key === 'ArrowUp' || key === 'ArrowDown') {
		event.preventDefault()
		navigateSidebar(key === 'ArrowDown' ? 1 : -1)
	}
	if (key === 'Tab') {
		event.preventDefault()
		attemptSwitchToMain()
	}
}

/**
 * Logic for when the main editor area is active
 */
function handleMainView(event) {
	// console.log('mainView', GLOBAL['currentView'])
	const key = event.key
	if (key === 'ArrowLeft') {
		returnToTabs()
		return
	}

	if (key === 'ArrowUp' || key === 'ArrowDown') {
		event.preventDefault()
		navigateEditorItems(key === 'ArrowDown' ? 1 : -1)
	}
}

/* -------------------------------------------------------------------------- */
/* GLOBAL HANDLERS                               */
/* -------------------------------------------------------------------------- */

function handleGlobalShortcuts(event) {
	const key = event.key
	const target = event.target

	if (key === 'F5') {
		event.preventDefault()
		location.reload()
		return true
	}

	if (key === 'Escape') {
		event.preventDefault()
		// Add specific escape logic here if needed
		return true
	}

	// Search Focus ('/')
	if (key === '/') {
		if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
			event.preventDefault()
			document.getElementById('search-bar').focus()
			return true
		}
	}

	return false
}

/* -------------------------------------------------------------------------- */
/* VIEW TRANSITIONS                               */
/* -------------------------------------------------------------------------- */

function attemptSwitchToMain() {
	const currentTabId = GLOBAL['activeTab']
	const currentSet = document.querySelector(`.config-set#${currentTabId}`)

	if (!currentSet) {
		console.log(`Config set ${currentTabId} doesnt exist.`)
		return
	}

	// Try to recover last saved focus
	const savedUuid = GLOBAL['mainFocus'][currentTabId]
	let targetElement = null

	if (savedUuid) {
		targetElement = currentSet.querySelector(`[data-uuid='${savedUuid}']`)
	}

	// Fallback to first focusable child
	if (!targetElement) {
		targetElement = currentSet.querySelector('.editor-item:not(.settings-hidden)')
		// targetElement = Array.from(currentSet.children).find(
		// 	(child) => !child.classList.contains('settings-hidden') && child.getAttribute('tabindex') != null,
		// )
	}

	if (targetElement) {
		window.currentFocus = targetElement
		targetElement.focus({ preventScroll: true })
		// targetElement.click()
		if (!savedUuid && targetElement.dataset.uuid) {
			GLOBAL['mainFocus'][currentTabId] = targetElement.dataset.uuid
		}
		GLOBAL.setKey('currentView', 'main')
	}
}

function returnToTabs() {
	console.log('Returning to tabs')
	GLOBAL.setKey('currentView', 'tabs')
	const activeElem = document.activeElement
	if (activeElem && activeElem.dataset.uuid != null) {
		GLOBAL['mainFocus'][GLOBAL['activeTab']] = activeElem.dataset.uuid
	}

	// Blur Main
	if (window.currentFocus) window.currentFocus.blur()

	// Switch State

	// Visually Select Tab
	const selectedTab = document.querySelector(`.selected`)
	if (selectedTab) {
		selectedTab.classList.add('keyboard-selected')
		selectedTab.click()
	}
}

/* -------------------------------------------------------------------------- */
/* DOM NAVIGATION LOGIC                            */
/* -------------------------------------------------------------------------- */

function navigateSidebar(direction) {
	const currentSelected = document.querySelector('.selected')
	if (!currentSelected || !currentSelected.parentElement) return

	const children = Array.from(currentSelected.parentElement.querySelectorAll('li'))
	const currentIndex = children.indexOf(currentSelected)

	let newIndex = getNextValidIndex(children, currentIndex, direction, (item) => {
		// Skip DIVs or Hidden items
		return item.tagName === 'DIV' || item.classList.contains('hidden')
	})

	// UI Updates
	currentSelected.classList.remove('selected', 'keyboard-selected')

	const newSelected = children[newIndex]
	newSelected.classList.add('selected', 'keyboard-selected')
	newSelected.click()

	newSelected.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	GLOBAL['activeTab'] = newSelected.id
}

function navigateEditorItems(direction) {
	const currentSet = document.querySelector(`.config-set#${GLOBAL['activeTab']}`)
	if (!currentSet) return

	let activeElement = document.activeElement

	// Ensure active element belongs to current set, otherwise fallback to saved focus
	if (!currentSet.contains(activeElement)) {
		const savedUuid = GLOBAL['mainFocus'][GLOBAL['activeTab']]
		if (savedUuid) {
			activeElement = currentSet.querySelector(`[data-uuid='${savedUuid}']`) || currentSet.querySelector('.editor-item')
		}
	}

	if (!activeElement || activeElement.getAttribute('tabindex') == null) {
		activeElement = currentSet.querySelector('.editor-item:not(.settings-hidden)')
	}

	const children = Array.from(currentSet.querySelectorAll('.editor-item'))
	const currentIndex = children.indexOf(activeElement)

	let newIndex = getNextValidIndex(children, currentIndex, direction, (item) => {
		return item.classList.contains('settings-hidden')
	})

	const newActiveElement = children[newIndex]
	if (!newActiveElement) return

	// Apply Focus
	activeElement.blur()
	window.currentFocus = newActiveElement
	newActiveElement.focus()

	// Update State
	GLOBAL['mainFocus'][GLOBAL['activeTab']] = newActiveElement.dataset.uuid

	// Scroll Logic
	if (newActiveElement.classList.contains('config-group')) {
		const offset = 80
		const top = newActiveElement.getBoundingClientRect().top + window.scrollY - offset
		window.scrollTo({ top, behavior: 'smooth' })
	} else {
		newActiveElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	}
}

/**
 * Circular index calculator that skips invalid items
 */
function getNextValidIndex(array, currentIndex, direction, shouldSkipFn) {
	let newIndex = currentIndex === -1 ? 0 : currentIndex
	const length = array.length

	// Initial step
	if (direction === 1) {
		newIndex = currentIndex === length - 1 ? 0 : currentIndex + 1
	} else {
		newIndex = currentIndex === 0 ? length - 1 : currentIndex - 1
	}

	// Loop until we find a valid item
	while (shouldSkipFn(array[newIndex])) {
		if (direction === 1) {
			newIndex = (newIndex + 1) % length
		} else {
			newIndex = (newIndex - 1 + length) % length
		}
		// Safety break to prevent infinite loops if all are hidden
		if (newIndex === currentIndex) break
	}

	return newIndex
}

/* -------------------------------------------------------------------------- */
/* SETUP & LISTENERS                             */
/* -------------------------------------------------------------------------- */

function initializeState() {
	GLOBAL.setKey('currentView', 'tabs')
	GLOBAL['mainFocus'] = {}
	window.currentFocus = null

	// GLOBAL.onChange('currentView', (value) => {
	// 	if (value === 'main') {
	// 		handleMainView()
	// 	}
	// })
}

function initializeGlobalListeners() {
	// 1. Main Key Listener
	hotkeys('*', handleKeyInput)

	// 2. Mouse Down (Context Menu)
	document.addEventListener('mousedown', (e) => {
		if (!e.target.closest('.context-menu, .editor-item')) {
			hideAllContextMenus()
		}
	})

	document.addEventListener('click', (e) => {
		// console.log(e.target)
		if (e.target.classList.contains('config-set') || e.target.classList.contains('editor-item')) {
			handleMainView(e)
		}
	})

	// 3. Key Logger Visualizer
	const pressed = new Set()
	hotkeys('*', { keydown: true, keyup: true }, (event) => handleKeyVisualizer(event, pressed))

	// 4. State Change Listener
	GLOBAL.onChange('currentView', handleViewChangeEffect)
}

function handleViewChangeEffect(value) {
	switch (value) {
		case 'main':
			document.querySelector('.sidebar-item.keyboard-selected')?.classList.remove('keyboard-selected')
			break
		case 'tabs':
			// Logic for returning to tabs if needed
			break
	}
}

function handleKeyVisualizer(event, pressedSet) {
	if (event.type === 'keydown') pressedSet.add(event.key)

	if (event.type === 'keyup') {
		setTimeout(() => {
			pressedSet.delete(event.key)
		}, 200)
	}

	const display = document.querySelector('#keys-display')
	if (display) {
		display.innerHTML = Array.from(pressedSet).join(' + ')
		setTimeout(() => {
			pressedSet.clear()
			display.textContent = ''
		}, 1500)
	}
}
