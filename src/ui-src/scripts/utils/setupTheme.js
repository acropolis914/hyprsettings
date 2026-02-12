import { saveWindowConfig } from './utils.ts'
import { GLOBAL } from '../GLOBAL.js'

GLOBAL['currentThemeIndex'] = 0
let themeButton = document.getElementById('theme-toggle')
const root = document.querySelector(':root')
let headers = ['description', 'link', 'author', 'variant']

export default async function setupTheme() {
	let currentTheme = GLOBAL['config']['current_theme']
	document.documentElement.style.opacity = GLOBAL['config']['transparency'] || '1' // fade in root to prevent FOUC
	root.style.setProperty(`--font-primary`, GLOBAL['config']['font'])

	const index = window.themes.findIndex((t) => t.name === currentTheme)
	if (index !== -1) {
		const theme = window.themes[index]
		GLOBAL.currentThemeIndex = index
		console.log(`Initially setting ${theme.name} as theme from config`)
		applyThemeVars(theme)
	} else {
		console.log(`No theme found matching ${currentTheme}, defaulting to first theme`)
		applyThemeVars(window.themes[0])
		GLOBAL.currentThemeIndex = 0
	}
	updateColoris()
}

themeButton.addEventListener('click', (e) => {
	e.stopPropagation()
	incrementCurrentTheme()
})

export function incrementCurrentTheme() {
	GLOBAL.setKey('currentThemeIndex', (GLOBAL.currentThemeIndex + 1) % window.themes.length)
	let theme = GLOBAL.themes[GLOBAL['currentThemeIndex']]
	changeTheme(theme)
}

function applyThemeVars(theme) {
	// document.documentElement.removeAttribute('style')
	// document.documentElement.setAttribute('style', '')
	Object.entries(theme).forEach(([key, value]) => {
		if (headers.includes(key)) {
			return
		}
		root.style.setProperty(`--${key}`, value, 'important')
	})
	GLOBAL['config']['current_theme'] = theme.name
	window.themeVariant = theme.variant.toLowerCase()
	GLOBAL.setKey(`themeVariant`, theme)

	root.classList.remove('dark')
	root.classList.remove('light')
	root.classList.add(theme.variant.toLowerCase())
}
//
// export function changeTheme(theme) {
// 	document.body.querySelectorAll('*').forEach((e) => {
// 		e.classList.add('themeAnimation')
// 	})
// 	console.log(`Changing theme to ${theme.name}`)
// 	let settingsThemeChanger = document.getElementById('theme-selector-setting')
// 	let settingsThemeChangerSelect = settingsThemeChanger.querySelector('select')
// 	settingsThemeChangerSelect.value = theme.name
// 	// settingsThemeChanger.value = theme.name
// 	applyThemeVars(theme)
// 	saveWindowConfig()
// 	updateJsonViewerTheme(theme.variant.toLowerCase())
// 	updateColoris()
// 	setTimeout(() => {
// 		document.body.querySelectorAll('*').forEach((e) => {
// 			e.classList.remove('themeAnimation')
// 		})
// 	}, 1000)
// }

export function changeTheme(theme) {
	// 1. Skip animation logic if disabled
	if (!GLOBAL['config']['ui_animations']) {
		document.body.querySelectorAll('*').forEach((e) => {
			e.classList.add('themeAnimation')
		})
		const settingsSelect = document.querySelector('#theme-selector-setting select')
		if (settingsSelect) settingsSelect.value = theme.name

		applyThemeVars(theme)
		saveWindowConfig()
		updateJsonViewerTheme(theme.variant.toLowerCase())
		updateColoris()

		setTimeout(() => {
			document.body.querySelectorAll('*').forEach((e) => {
				e.classList.remove('themeAnimation')
			})
		}, 1000)
		return // Exit early
	}

	// 2. Snapshot: Clone the body (Animation path)
	const settingsSelect = document.querySelector('#theme-selector-setting select')
	if (settingsSelect) settingsSelect.value = theme.name

	const clone = document.body.cloneNode(true)

	// Freeze State
	const rootStyles = getComputedStyle(document.documentElement)
	for (const prop of rootStyles) {
		if (prop.startsWith('--')) {
			clone.style.setProperty(prop, rootStyles.getPropertyValue(prop))
		}
	}

	clone.style.background = rootStyles.background || rootStyles.backgroundColor
	clone.style.color = rootStyles.color

	// Position & Setup
	Object.assign(clone.style, {
		position: 'absolute',
		top: `-${window.scrollY}px`,
		left: '0',
		width: '100vw',
		height: '100vh',
		zIndex: '99999',
		// pointerEvents: 'none',
		// overflow: 'hidden',
		transition: 'clip-path 1s ease-in-out',
		clipPath: 'inset(0 0 0 0)',
	})

	clone.querySelectorAll('script, input, textarea, select').forEach((e) => {
		if (e.tagName === 'SCRIPT') e.remove()
		// else e.setAttribute('readonly', 'true')
	})

	clone.querySelectorAll('select').forEach((e) => {
		if (e.parentNode.id === 'theme-selector-setting') {
			e.value = theme.name
		}
	})

	document.documentElement.appendChild(clone)

	// Apply New Theme
	applyThemeVars(theme)
	saveWindowConfig()
	updateJsonViewerTheme(theme.variant.toLowerCase())
	updateColoris()

	// Animate
	requestAnimationFrame(() => {
		clone.getBoundingClientRect()
		clone.style.clipPath = 'inset(0 0 0 100%)'
		setTimeout(() => clone.remove(), 1000)
	})
}

export function updateJsonViewerTheme(themeVariant) {
	if (window.jsViewer) {
		if (themeVariant === 'dark') {
			window.jsViewer.setAttribute('theme', 'default-dark')
		} else {
			window.jsViewer.setAttribute('theme', 'default-light')
		}
	}
}

/**
 * Refreshes all linked CSS stylesheets by forcing the browser to re-fetch them.
 */
export function refreshAllStylesheets() {
	const links = document.querySelectorAll('link[rel="stylesheet"]')
	const newTimestamp = Date.now()
	links.forEach((link) => {
		const currentHref = link.href
		// Remove any existing query strings (?v=...) and fragment identifiers (#...)
		const cleanHref = currentHref.replace(/(\?.*)|(#.*)/g, '')
		// Update the href, forcing a cache bypass and re-load
		link.href = cleanHref + '?v=' + newTimestamp
	})
}

window.refreshAllStylesheets = refreshAllStylesheets // for debugging

function updateColoris() {
	Coloris({
		// bind picker to THIS input only
		theme: 'pill',
		alpha: true, // enable opacity for RGBA
		forceAlpha: true,
		format: 'rgb',
		swatches: sortSwatchesByValue(getSwatch()), // output rgba if alpha enabled
	})
}

export function getSwatch() {
	const themeName = GLOBAL.config.current_theme
	const currentTheme = window.themes.find((t) => t.name === themeName)
	if (!currentTheme) return []

	const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
	const colors = Object.values(currentTheme).filter((value) => typeof value === 'string' && hexRegex.test(value))
	// Ensure uniqueness
	return [...new Set(colors)]
}

function hexToRgb(hex) {
	hex = hex.replace('#', '')
	if (hex.length === 3) {
		hex = hex
			.split('')
			.map((c) => c + c)
			.join('')
	}
	const bigint = parseInt(hex, 16)
	const r = (bigint >> 16) & 255
	const g = (bigint >> 8) & 255
	const b = bigint & 255
	return [r, g, b]
}

function luminance([r, g, b]) {
	// relative luminance formula
	const a = [r, g, b].map((v) => {
		v /= 255
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
	})
	return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

export function sortSwatchesByValue(colors) {
	return colors.slice().sort((a, b) => luminance(hexToRgb(a)) - luminance(hexToRgb(b)))
}
