//@ts-check
/* eslint-env browser */
/* global pywebview, TomSelect */
import { debounce, waitFor } from './helpers.js'
import { configRenderer } from './configRenderer.js'
import './ui_components/documentListeners.js'
import './ui_components/onboarding.js'
import './ui_components/testingScreen.js'
import './components/keyEditor_Slider.js'
import './ui_components/searchBar.js'
import { GLOBAL } from './GLOBAL.js'
import { jsViewerInit } from './ui_components/jsViewer.js'
import { refreshAllStylesheets, setupTheme, updateJsonViewerTheme } from './setupTheme.js'
import { createDynamicTabs } from './ui_components/createDynamicTabs.js'
import { renderSettings } from './settings.js'
import { initializeSearchBar } from './ui_components/searchBar.js'
import { Backend } from './backendAPI.js'
import '../stylesheets/style.scss'

import { createLoadingOverlay, destroyOverlay } from './ui_components/darken_overlay.js'
import createWiki from '@scripts/ui_components/wikiTab.ts'
// import './consoleInterceptor.js'
window.Global = GLOBAL
GLOBAL.setKey('backend', 'flask')

// @ts-ignore
async function setupData() {
	GLOBAL.data = await JSON.parse(await Backend.getHyprlandConfig())
	await Backend.getHyprlandConfigTexts()
	jsViewerInit()
	new configRenderer(GLOBAL.data)
	destroyOverlay()
	return GLOBAL.data
}

async function load_config() {
	let windowConfig = await Backend.readWindowConfig()
	if (windowConfig['configuration-error']) {
		console.log('Configuration error: ', windowConfig['configuration-error'])
		return
	}

	window.themes = windowConfig.theme //just to globally access it for setupTheme
	let builtin_themes = await Backend.getBuiltinThemes()
	for (let builtin_theme of builtin_themes) {
		builtin_theme.name = `[builtin] ${builtin_theme.name}`
		window.themes.push(builtin_theme)
	}

	GLOBAL['config'] = {}
	GLOBAL['persistence'] = {}
	for (let key in windowConfig.config) {
		GLOBAL['config'][key] = windowConfig.config[key]
	}
	if (windowConfig['persistence']) {
		for (let key in windowConfig.persistence) {
			GLOBAL['persistence'][key] = windowConfig.persistence[key]
		}
	}

	if (GLOBAL['persistence']['first_run']) {
		document.getElementById('onboarding').classList.remove('hidden')
	} else {
		GLOBAL['persistence']['first_run'] = false
	}
}

async function getDebugStatus() {
	let debugIndicator = document.getElementById('debug-indicator')
	let isDebug
	try {
		console.log('Contacting backend if debug mode is on')
		isDebug = await Backend.getDebugStatus()
	} catch (e) {
		console.log('Error while contacting backend: ', e)
		isDebug = false
	}
	GLOBAL.setKey('isDebugging', isDebug)
	if (isDebug) {
		console.log('Debug mode is turned on.')
		debugIndicator.classList.remove('hidden')
	} else {
		debugIndicator.classList.add('hidden')
	}
}

export async function initialize() {
	// Array.from(document.scripts).forEach(s => console.log(s.src))
	createLoadingOverlay()
	await load_config()
	await setupTheme()
	await getDebugStatus()
	await createDynamicTabs()
	setupData()
	renderSettings()
	initializeSearchBar()
	createWiki()

}

document.addEventListener('DOMContentLoaded', async () => {
	await initialize()
	refreshAllStylesheets()
	window.initialize = initialize
})

window.addEventListener('error', (e) => {
	console.error('🔥', e.error?.stack || `${e.message}\n${e.filename}:${e.lineno}`)
})

window.addEventListener('unhandledrejection', (e) => {
	console.error('🚨 Unhandled Promise rejection:', e.reason?.stack || e.reason)
})
