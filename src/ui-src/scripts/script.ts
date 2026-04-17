//@ts-check
/* eslint-env browser */
/* global pywebview, TomSelect */
// import '@stylesheets/style.scss'
// import '@stylesheets/style.scss'
import '@stylesheets/subs/tippy.scss'

import './ui_components/documentListeners.ts'
import './ui_components/onboarding.js'
import './ui_components/testingScreen.js'
import './ui_components/searchBar.js'
import './ConfigRenderer/keyEditor_Slider.js'
import './ui_components/shareConfig.ts'

import { GLOBAL } from './GLOBAL.ts'
import { Backend } from './utils/backendAPI.ts'
import setupTheme from './utils/setupTheme.js'

import initializeDebugTab from './ui_components/debugTab.ts'
import initializeSearchBar from './ui_components/searchBar.js'
import createTabView from './ui_components/createTabView.ts'
import createLoadingOverlay, { destroyOverlay } from './ui_components/darkenOverlay.ts'
import createWiki from './ui_components/wikiTab.ts'

import getAndRenderConfig, { clearConfigItems } from './ConfigRenderer/_configRenderer.ts'
import renderSettings from './ui_components/settings.js'

import getDebugStatus from './utils/getDebugStatus.ts'

import tippy from 'tippy.js'
import "./utils/zoom.ts"

import { setZoom, zoom } from './utils/zoom.ts'
import { shortHash } from '@scripts/utils/utils.ts'

declare global {
	interface Window {
		dataLayer: any[];
		Global: typeof GLOBAL;
		reinitialize: typeof reinitialize;
		initialize: typeof initialize;
	}
}

window.Global = GLOBAL
GLOBAL.setKey('backend', 'flask')



async function load_config() {
	const windowConfig = await Backend.readWindowConfig()
	const builtin_themes = await Backend.getBuiltinThemes()

	if (windowConfig['configuration-error']) {
		return console.error('Configuration error:', windowConfig['configuration-error'])
	}
	const themes = [...windowConfig.theme, ...builtin_themes.map((t) => ({ ...t, name: `[builtin] ${t.name}` }))]
	// window.themes = themes
	GLOBAL.setKey('themes', themes)

	// Clean object assignment
	GLOBAL.config = { ...windowConfig.config }
	GLOBAL.setKey("persistence" , { ...(windowConfig.persistence) })
	GLOBAL.config_info = { ...windowConfig.file_info}
	// Onboarding logic
	const isFirstRun = (GLOBAL.persistence.first_run)
	document.getElementById('onboarding').classList.toggle('hidden', !isFirstRun)
	if (GLOBAL.persistence.zoom_factor){
		setZoom(GLOBAL.persistence.zoom_factor)
	} else {
		setZoom(1)
	}
	if (!isFirstRun) GLOBAL.persistence.first_run = false
}

async function setupGTAG() {
	const script = document.createElement('script')
	script.async = true
	script.src = 'https://www.googletagmanager.com/gtag/js?id=G-1HDCZV8DTZ'
	document.head.appendChild(script)
	window.dataLayer = window.dataLayer || []
	function gtag(this: any, ...args: any[]) {
		window.dataLayer.push(arguments)
	}
	const user_id = await shortHash(GLOBAL.config_info.user)
	console.log('user_id', user_id)
	gtag('js', new Date())
	gtag('config', 'G-1HDCZV8DTZ', {
		user_id: user_id,
		cookie_domain: 'none',
	})
	console.log('Gtag initialized after DOMContentLoaded. Nothing gets recorded but the count of unique users.')
}

export async function reinitialize() {
	console.log('Reinitializing...')
	await createLoadingOverlay('Reloading your hyprland config')
	await Backend.debounceGetHyprlandConfig()
}

export async function initialize() {
	await createLoadingOverlay()
	await load_config()
	await setupTheme()
	await getDebugStatus()
	await createTabView()
	initializeDebugTab()
	await getAndRenderConfig()
	renderSettings().then(() => console.log('Done rendering settings tab'))
	initializeSearchBar().then(() => console.log('Done initializing search bar'))
	createWiki().then(() => console.log('Done initializing wikit tab'))
	tippy.setDefaultProps({ delay: 1000, arrow: true })
	await setupGTAG()
}

document.addEventListener('DOMContentLoaded', async () => {
	window.reinitialize = reinitialize
	window.initialize = initialize
	await initialize()
})

window.addEventListener('error', (e) => {
	console.error('🔥', e.error?.stack || `${e.message}\n${e.filename}:${e.lineno}`)
})

window.addEventListener('unhandledrejection', (e) => {
	console.error('🚨 Unhandled Promise rejection:', e.reason?.stack || e.reason)
})

// window.addEventListener('beforeunload', (event) => {
// 	if (GLOBAL.changedFiles.length > 0) {
// 		// Standard way to trigger the browser prompt
// 		event.preventDefault()
// 		// Some browsers require setting returnValue
// 		event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
// 	}
// })
