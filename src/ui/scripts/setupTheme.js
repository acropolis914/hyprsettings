import { saveWindowConfig } from './utils.js'
import { GLOBAL } from './GLOBAL.js'

let themeButton = document.getElementById('theme-toggle')
GLOBAL['currentThemeIndex'] = 0
const root = document.querySelector(':root')
let headers = ['description', 'link', 'author', 'variant']
// refreshAllStylesheets()


export async function setupTheme() {
	// window.refreshAllStylesheets = refreshAllStylesheets
	let currentTheme = GLOBAL['config']['current_theme']
	document.documentElement.style.opacity = GLOBAL['config']['transparency'] || '1' // fade in root to prevent FOUC
	root.style.setProperty(`--font-primary`, GLOBAL['config']['font'])

	const index = window.themes.findIndex(t => t.name === currentTheme)
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
	GLOBAL['currentThemeIndex'] += 1
	GLOBAL['currentThemeIndex'] = GLOBAL['currentThemeIndex'] % (window.themes.length)
	let theme = window.themes[GLOBAL['currentThemeIndex']]
	changeTheme(theme)
}

function applyThemeVars(theme) {
	Object.entries(theme).forEach(([key, value]) => {
		if (headers.includes(key)) {
			return
		}
		root.style.setProperty(`--${key}`, value, 'important')
	})
	GLOBAL['config']['current_theme'] = theme.name
	window.themeVariant = theme.variant.toLowerCase()
	root.classList.remove('dark')
	root.classList.remove('light')
	root.classList.add(theme.variant.toLowerCase())
}

export function changeTheme(theme) {
	console.log(`Changing theme to ${theme.name}`)
	let settingsThemeChanger = document.getElementById('theme-selector-setting')
	let settingsThemeChangerSelect = settingsThemeChanger.querySelector('select')
	settingsThemeChangerSelect.value = theme.name
	// settingsThemeChanger.value = theme.name
	applyThemeVars(theme)
	saveWindowConfig()
	updateJsonViewerTheme(theme.variant.toLowerCase())
	updateColoris()
}


export function updateJsonViewerTheme(themeVariant) {
	if (themeVariant === 'dark') {
		window.jsViewer.setAttribute('theme', 'default-dark')
	} else {
		window.jsViewer.setAttribute('theme', 'default-light')
	}
}

/**
 * Refreshes all linked CSS stylesheets by forcing the browser to re-fetch them.
 */
export function refreshAllStylesheets() {
	const links = document.querySelectorAll('link[rel="stylesheet"]')
	const newTimestamp = Date.now()
	links.forEach(link => {
		const currentHref = link.href
		// Remove any existing query strings (?v=...) and fragment identifiers (#...)
		const cleanHref = currentHref.replace(/(\?.*)|(#.*)/g, '')
		// Update the href, forcing a cache bypass and re-load
		link.href = cleanHref + '?v=' + newTimestamp
	})
}





function updateColoris() {
	Coloris({// bind picker to THIS input only
		theme: 'pill',
		alpha: true,        // enable opacity for RGBA
		forceAlpha: true,
		format: 'rgb',
		swatches: sortSwatchesByValue(getSwatch())     // output rgba if alpha enabled
	})
}

export function getSwatch() {
	const themeName = GLOBAL.config.current_theme
	const currentTheme = window.themes.find(t => t.name === themeName)
	if (!currentTheme) return []

	const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
	const colors = Object.values(currentTheme)
		.filter(value => typeof value === 'string' && hexRegex.test(value))
	// Ensure uniqueness
	return [...new Set(colors)]
}

function hexToRgb(hex) {
	hex = hex.replace('#', '')
	if (hex.length === 3) {
		hex = hex.split('').map(c => c + c).join('')
	}
	const bigint = parseInt(hex, 16)
	const r = (bigint >> 16) & 255
	const g = (bigint >> 8) & 255
	const b = bigint & 255
	return [r, g, b]
}

function luminance([r, g, b]) {
	// relative luminance formula
	const a = [r, g, b].map(v => {
		v /= 255
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
	})
	return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

export function sortSwatchesByValue(colors) {
	return colors.slice().sort((a, b) => luminance(hexToRgb(a)) - luminance(hexToRgb(b)))
}
