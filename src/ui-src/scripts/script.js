//@ts-check
/* eslint-env browser */
/* global pywebview, TomSelect */
import getAndRenderConfig from './configRenderer.ts'
import './ui_components/documentListeners.js'
import './ui_components/onboarding.js'
import './ui_components/testingScreen.js'
import './hyprland-components/keyEditor_Slider.js'
import './ui_components/searchBar.js'
import { GLOBAL } from './GLOBAL.js'
import initializeJSViewer from './ui_components/jsViewer.js'
import { setupTheme } from './setupTheme.js'
import { createDynamicTabs } from './ui_components/createDynamicTabs.js'
import { renderSettings } from './settings.js'
import { initializeSearchBar } from './ui_components/searchBar.js'
import { Backend } from './backendAPI.js'
import '@stylesheets/style.scss'

import { createLoadingOverlay } from './ui_components/darken_overlay.js'
import createWiki from '@scripts/ui_components/wikiTab.ts'
import tippy from 'tippy.js'
import '@stylesheets/subs/tippy.css'
window.Global = GLOBAL
GLOBAL.setKey('backend', 'flask')

// @ts-ignore
export default function loadHyprsettingsConfig() {
	GLOBAL.onChange()
}

async function load_config() {
	let windowConfig = await Backend.readWindowConfig()
	if (windowConfig['configuration-error']) {
		console.log(
			'Configuration error: ',
			windowConfig['configuration-error'],
		)
		return
	}

	window.themes = windowConfig.theme //just to globally access it for setupTheme
	GLOBAL.setKey('themes', windowConfig.theme)
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
export async function reinitialize() {
	createLoadingOverlay('Reloading your hyprland config..')
	await Backend.getHyprlandConfig()
	await Backend.getHyprlandConfigTexts()
}

export async function initialize() {
	// Array.from(document.scripts).forEach(s => console.log(s.src))
	createLoadingOverlay()
	await load_config()
	await setupTheme()
	await getDebugStatus()
	await createDynamicTabs()
	getAndRenderConfig()
	initializeJSViewer()
	renderSettings()
	initializeSearchBar()
	createWiki()
	tippy.setDefaultProps({ delay: 500 })
}

document.addEventListener('DOMContentLoaded', async () => {
	initialize()
	window.reinitialize = reinitialize
	// refreshAllStylesheets()
	window.initialize = initialize
})

window.addEventListener('error', (e) => {
	console.error(
		'🔥',
		e.error?.stack || `${e.message}\n${e.filename}:${e.lineno}`,
	)
})

window.addEventListener('unhandledrejection', (e) => {
	console.error(
		'🚨 Unhandled Promise rejection:',
		e.reason?.stack || e.reason,
	)
})
