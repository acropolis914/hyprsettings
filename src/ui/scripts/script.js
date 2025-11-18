//@ts-check
/* eslint-env browser */
/* global pywebview, TomSelect */
import { waitFor } from './utils.js'
import { configRenderer } from './configRenderer.js'
import './ui_components/documentListeners.js'
import './ui_components/onboarding.js'
import './ui_components/testingScreen.js'
import './components/keyEditor_Slider.js'
import { GLOBAL } from './GLOBAL.js'
import { jsViewerInit } from './ui_components/jsViewer.js'
import { setupTheme } from './setupTheme.js'
import { createDynamicTabs } from './ui_components/createDynamicTabs.js'
import { renderSettings } from './settings.js'

window.Global = GLOBAL

// @ts-ignore


async function setupData() {
	await waitFor(() => window.pywebview?.api.init)
	// @ts-ignore
	GLOBAL['data']
	GLOBAL['data'] = await JSON.parse(await window.pywebview.api.init())
	jsViewerInit()
	new configRenderer(GLOBAL['data'])
}

async function load_config() {
	await waitFor(() => window.pywebview?.api.init)
	let windowConfig = await window.pywebview.api.read_window_config()
	if (windowConfig['configuration-error']) {
		console.log('Configuration error: ', windowConfig['configuration-error'])
		return
	}

	window.themes = windowConfig.theme //just to globally access it for setupTheme
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

document.addEventListener('DOMContentLoaded', async () => {
	await load_config()
	await setupTheme()
	await createDynamicTabs()
	await setupData()
	await renderSettings()

})

window.addEventListener('error', e => {
	console.error('🔥', e.error?.stack || `${e.message}\n${e.filename}:${e.lineno}`)
})

window.addEventListener('unhandledrejection', e => {
	console.error('🚨 Unhandled Promise rejection:', e.reason?.stack || e.reason)
})


