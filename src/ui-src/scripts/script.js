//@ts-check
/* eslint-env browser */
/* global pywebview, TomSelect */
import '@stylesheets/style.scss'
import '@stylesheets/subs/tippy.css'

import './ui_components/documentListeners.js'
import './ui_components/onboarding.js'
import './ui_components/testingScreen.js'
import './ui_components/searchBar.js'
import './hyprland-components/keyEditor_Slider.js'
import '@scripts/ui_components/shareConfig.ts'

import { GLOBAL } from './GLOBAL.js'
import { Backend } from './backendAPI.js'
import setupTheme from './setupTheme.js'

import initializeJSViewer from './ui_components/jsViewer.js'
import initializeSearchBar from './ui_components/searchBar.js'
import createDynamicTabs from './ui_components/createDynamicTabs.ts'
import createLoadingOverlay from './ui_components/darken_overlay.js'
import createWiki from './ui_components/wikiTab.ts'

import getAndRenderConfig, { clearConfigItems } from './configRenderer.ts'
import renderSettings from './settings.js'

import getDebugStatus from './utils/getDebugStatus.ts'

import tippy from 'tippy.js'

window.Global = GLOBAL
GLOBAL.setKey('backend', 'flask')

// @ts-ignore
export default function loadHyprsettingsConfig() {
	GLOBAL.onChange()
}

async function load_config() {
	const windowConfig = await Backend.readWindowConfig()
	const builtin_themes = await Backend.getBuiltinThemes()

	if (windowConfig['configuration-error']) {
		return console.error('Configuration error:', windowConfig['configuration-error'])
	}

	// Merge and set themes
	const themes = [...windowConfig.theme, ...builtin_themes.map((t) => ({ ...t, name: `[builtin] ${t.name}` }))]
	window.themes = themes
	GLOBAL.setKey('themes', themes)

	// Clean object assignment
	GLOBAL.config = { ...windowConfig.config }
	GLOBAL.persistence = { ...windowConfig.persistence }

	// Onboarding logic
	const isFirstRun = GLOBAL.persistence.first_run
	document.getElementById('onboarding').classList.toggle('hidden', !isFirstRun)

	if (!isFirstRun) GLOBAL.persistence.first_run = false
}

export async function reinitialize() {
	console.log('Reinitializing...')
	createLoadingOverlay('Reloading your hyprland config..')
	setTimeout(async () => {
		await Backend.debounceGetHyprlandConfig()
	}, 1)
}

export async function initialize() {
	// Array.from(document.scripts).forEach(s => console.log(s.src))
	createLoadingOverlay()
	await load_config()
	await setupTheme()
	await getDebugStatus()
	await createDynamicTabs()
	await getAndRenderConfig().then(() => console.log('Done rendering received config'))
	initializeJSViewer()
	renderSettings().then(() => console.log('Done rendering received settings tab'))
	initializeSearchBar().then(() => console.log('Done initializing search bar'))
	createWiki().then(() => console.log('Done initializing wikit tab'))
	// createWiki()
	tippy.setDefaultProps({ delay: 1000, arrow: true })
}

document.addEventListener('DOMContentLoaded', async () => {
	initialize()
	window.reinitialize = reinitialize
	// refreshAllStylesheets()
	window.initialize = initialize
})

window.addEventListener('error', (e) => {
	console.error('🔥', e.error?.stack || `${e.message}\n${e.filename}:${e.lineno}`)
})

window.addEventListener('unhandledrejection', (e) => {
	console.error('🚨 Unhandled Promise rejection:', e.reason?.stack || e.reason)
})
