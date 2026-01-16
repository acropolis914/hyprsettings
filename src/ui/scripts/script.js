//@ts-check
/* eslint-env browser */
/* global pywebview, TomSelect */
import { waitFor } from './utils.js'
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
import './consoleInterceptor.js'
window.Global = GLOBAL
GLOBAL.setKey("backend", "flask")

// @ts-ignore
async function setupData() {
	GLOBAL['data'] = JSON.parse(await Backend.getHyprlandConfig())
	jsViewerInit()
	new configRenderer(GLOBAL['data'])
}

async function load_config() {
	let windowConfig = await Backend.readWindowConfig()
	if (windowConfig['configuration-error']) {
		console.log('Configuration error: ', windowConfig['configuration-error'])
		return
	}

	window.themes = windowConfig.theme //just to globally access it for setupTheme
	let builtin_themes = await Backend.getBuiltinThemes()
	// console.log(builtin_themes)
	for (let builtin_theme of builtin_themes) {
		builtin_theme.name = `[builtin] ${builtin_theme.name}`
		// console.log(builtin_theme)
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
	let debugIndicator = document.getElementById("debug-indicator")
	let isDebug
	try {
		console.log("Contacting backend if debug mode is on")
		isDebug = await Backend.getDebugStatus()
	} catch (e) {
		console.log("Error while contacting backend: ", e)
		isDebug = false
	}
	// console.debug({ isDebug })
	GLOBAL.setKey("isDebugging", isDebug)
	// console.log(GLOBAL["isDebugging"])
	if (isDebug) {
		console.log("Debug mode is turned on.")
		debugIndicator.classList.remove("hidden")
	} else {
		debugIndicator.classList.add("hidden")
	}
}

export async function initialize() {
	// Array.from(document.scripts).forEach(s => console.log(s.src))
	await load_config()
	await getDebugStatus()
	await setupTheme()
	await createDynamicTabs()
	await setupData()
	await renderSettings()
	await initializeSearchBar()
	refreshAllStylesheets()
}

document.addEventListener('DOMContentLoaded', async () => {
	await initialize()
	window.initialize = initialize
})

window.addEventListener('error', e => {
	console.error('🔥', e.error?.stack || `${e.message}\n${e.filename}:${e.lineno}`)
})

window.addEventListener('unhandledrejection', e => {
	console.error('🚨 Unhandled Promise rejection:', e.reason?.stack || e.reason)
})


