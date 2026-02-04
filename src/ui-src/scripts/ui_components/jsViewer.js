import { GLOBAL } from '../GLOBAL.js'
import { updateJsonViewerTheme } from '../setupTheme.js'

export default function initializeJSViewer() {
	GLOBAL.onChange('data', () => {
		jsViewerInit()
	})
}

export function jsViewerInit() {
	// @ts-ignore
	window.jsViewer = document.createElement('andypf-json-viewer')
	window.jsViewer.setAttribute('show-toolbar', 'true')
	window.jsViewer.data = GLOBAL.data

	let label = document.createElement('p')
	label.innerHTML = 'Data rendered by the UI'

	let debugWindow = document.querySelector('.config-set#debug')
	debugWindow.innerHTML = ''
	debugWindow.appendChild(label)
	debugWindow.appendChild(window.jsViewer)
	updateJsonViewerTheme(window.themeVariant)
}
