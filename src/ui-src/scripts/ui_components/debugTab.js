import { GLOBAL } from '../GLOBAL.ts'
import { updateJsonViewerTheme } from '../utils/setupTheme.js'

export default function initializeJSViewer() {
	GLOBAL.onChange('data', () => {
		console.log('Global data changed. Rerendering debug tab')
		jsViewerInit()
		initGlobalDebugger()
	})
	GLOBAL.onChange('config', () => {
		console.log('Global config changed. Rerendering debug tab')
		initGlobalDebugger()
	})
	GLOBAL.onChange('persistence', () => {
		initGlobalDebugger()
	})
}

export function jsViewerInit() {
	// @ts-ignore
	let debugWindow = document.querySelector('.config-set#debug')

	let label = document.createElement('p')
	label.innerHTML = 'Data rendered by the UI'
	debugWindow.innerHTML = ''

	// Try to find existing viewer
	let viewer = debugWindow.querySelector('andypf-json-viewer')
	let viewerContainer = document.querySelector(
		'.config-set#debug>#json-viewer',
	)

	if (!viewer) {
		viewer = document.createElement('andypf-json-viewer')
		viewer.setAttribute('show-toolbar', 'true')
		viewerContainer = document.createElement('div')
		viewerContainer.setAttribute('id', 'json-viewer')
		viewerContainer.classList.add('editor-item')
		viewerContainer.tabIndex = 0
		viewerContainer.appendChild(label)
		viewerContainer.appendChild(viewer)
		debugWindow.appendChild(viewerContainer)
	}

	// Always update data
	viewer.data = GLOBAL.data

	// Keep global reference in sync
	window.jsViewer = viewer

	updateJsonViewerTheme(window.themeVariant)
}

function initGlobalDebugger() {
	const debugRoot = document.querySelector('.config-set#debug')
	function render() {
		// Reuse container if it exists
		let container = debugRoot.querySelector('#global-debugger')

		if (!container) {
			container = document.createElement('section')
			container.id = 'global-debugger'
			container.dataset.uuid = 'xxyyzz'
			container.tabIndex = 0
			container.classList.add('debug-panel')
			container.classList.add('editor-item')

			const selector = document.createElement('div')
			selector.classList.add('debug-selector')

			const viewer = document.createElement('pre')
			viewer.classList.add('debug-output')

			container.appendChild(selector)
			container.appendChild(viewer)
			debugRoot.appendChild(container)
		}

		const selector = container.querySelector('.debug-selector')
		const viewer = container.querySelector('.debug-output')

		// Clear old buttons to avoid duplicates
		selector.innerHTML = ''

		const globalKeys = Object.getOwnPropertyNames(GLOBAL)

		globalKeys.forEach((key) => {
			let hiddenkeys = [
				'length',
				'name',
				'prototype',
				'onChange',
				'setKey',
				'configText',
				'wikiEntry',
			]
			if (hiddenkeys.includes(key)) return
			const button = document.createElement('button')
			button.classList.add('debug-key-btn')
			button.textContent = key

			button.onclick = () => {
				const value = GLOBAL[key]

				// Clear previous viewer content
				viewer.innerHTML = ''

				if (
					typeof value === 'object' &&
					value !== null &&
					key !== '_listeners'
				) {
					let jsonviewer =
						document.createElement('andypf-json-viewer')
					jsonviewer.setAttribute('show-toolbar', 'true')
					jsonviewer.setAttribute(
						'theme',
						`default-${GLOBAL.themeVariant.toLowerCase()}`,
					)
					jsonviewer.data = JSON.stringify(value, null, 2)
					viewer.appendChild(jsonviewer)
				} else if (key === '_listeners') {
					for (const [
						listenerKey,
						callbacks,
					] of GLOBAL._listeners) {
						const section = document.createElement('div')
						section.style.marginBottom = '0.5rem'

						const header = document.createElement('strong')
						header.textContent = `Listeners for key: ${listenerKey}`
						section.appendChild(header)

						callbacks.forEach((cb, i) => {
							const cbButton =
								document.createElement('button')
							cbButton.textContent = `Callback ${i + 1}`
							cbButton.style.marginLeft = '0.5rem'

							// Create dialog
							const dialog =
								document.createElement('dialog')
							dialog.style.width = '400px'
							dialog.style.padding = '1rem'
							dialog.style.borderRadius = '0.4rem'
							dialog.style.border = '1px solid #666'
							dialog.style.whiteSpace = 'pre-wrap'
							dialog.textContent = cb.toString()

							// Add a close button inside dialog
							const closeBtn =
								document.createElement('button')
							closeBtn.textContent = 'Close'
							closeBtn.style.display = 'block'
							closeBtn.style.marginTop = '0.5rem'
							closeBtn.onclick = () => dialog.close()

							dialog.appendChild(closeBtn)
							document.body.appendChild(dialog)

							cbButton.onclick = (e) => {
								e.stopPropagation()
								dialog.showModal()
							}

							section.appendChild(cbButton)
						})

						viewer.appendChild(section)
					}
				} else {
					viewer.textContent = String(value)
				}
			}

			selector.appendChild(button)
		})

		const button = document.createElement('button')
		button.classList.add('debug-key-btn')
		button.textContent = 'Reload This'
		button.onclick = () => {
			render()
		}
		selector.appendChild(button)
	}
	;['config', 'persistence'].forEach((key) => {
		GLOBAL.onChange(key, () => {
			console.log('potaa')
			render()
		})
	})
	render()
}
