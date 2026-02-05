import { GLOBAL } from '@scripts/GLOBAL.js'
const testingScreen = document.querySelector('.testing-screen')
const testingScreenHeader = document.getElementById('testing-screen-header')
let open = false

GLOBAL.onChange('themeVariant', () => {})

document.addEventListener('keydown', (event) => {
	if (event.key === 'F3') {
		event.preventDefault()
		toggleTestingScreen()
	}
	if (event.key === 'F3' || event.key === 'Escape') {
		// blur the iframe to remove its focus
		console.log('Parent caught key:', event.key)
		// now you can do your exit logic
	}
})

testingScreen.addEventListener('transitionend', (e) => {
	if (
		e.propertyName === 'opacity' &&
		getComputedStyle(e.target).opacity === '0'
	) {
		console.log('Element is now invisible')
		testingScreen.classList.add('hidden')
	} else if (
		e.propertyName === 'opacity' &&
		getComputedStyle(e.target).opacity > '0' &&
		open
	) {
		testingScreen.classList.remove('hidden')
	}
})

function toggleTestingScreen() {
	if (!open) {
		// testingScreen.classList.remove("hidden")
		testingScreen.classList.remove('hidden')
		requestAnimationFrame(() => {
			testingScreen.style.opacity = '1'
		})
	} else {
		testingScreen.style.opacity = '0'
		// testingScreen.classList.add("hidden")
	}
	open = !open
}

import Prism from 'prismjs'
import 'prismjs/components/prism-ini.js'
import '@stylesheets/prism.css'

export async function renderTextPreview() {
	let configPreview_el = document.getElementById('config-preview')
	let configPreviewTabs_el = document.getElementById('config-preview-tabs')
	let configPreviewCode_el = document.getElementById('config-preview-code')
	configPreviewTabs_el.innerHTML = ''
	configPreviewCode_el.innerHTML = ''
	configPreviewCode_el.classList.add('language-ini')
	let pre = configPreview_el.querySelector('pre')

	function createTab(path) {
		let tab = document.createElement('div')
		configPreviewTabs_el.appendChild(tab)
		tab.classList.add('config-preview-tab-item')
		tab.textContent = path.split('/').at(-1).replace('.conf', '')
		tab.addEventListener('click', (e) => {
			Array.from(configPreviewTabs_el.children).forEach((child) => {
				child.classList.remove('active')
			})
			tab.classList.add('active')
		})
		return tab
	}
	let totalSize_configtext = 0
	GLOBAL.configText.forEach((element, index) => {
		// console.log(element)
		let path = element.path
		let text = element.content
		totalSize_configtext += new TextEncoder().encode(
			element.content,
		).length

		// create tab
		let tab = createTab(path)

		tab.addEventListener('click', (e) => {
			configPreviewCode_el.textContent = text
			Prism.highlightElement(configPreviewCode_el)
			configPreviewCode_el.classList.remove('hidden')
			pre.classList.remove('hidden')
		})
		if (tab.innerText === 'hyprland') {
			tab.click()
		}
		tab.addEventListener('dblclick', async (e) => {
			const response = await fetch(
				'/api/open_file?path=' + encodeURIComponent(path),
			)
			if (!response.ok) {
				console.error('Failed to open file:', response.statusText)
			}
		})
	})
	console.log({ totalSize_configtext })
}

GLOBAL.onChange('configText', renderTextPreview)
