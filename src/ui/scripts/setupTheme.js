import { saveWindowConfig } from './utils.js'
import { GLOBAL } from './GLOBAL.js'

let themeButton = document.getElementById('theme-toggle')
let currentThemeIndex = 0
var root = document.querySelector(':root')
let headers = ['description', 'link', 'author', 'variant']

export async function setupTheme() {
	let currentTheme = GLOBAL['config']['current_theme']
	document.documentElement.style.opacity = GLOBAL['config']['transparency'] || '1' // fade in root to prevent FOUC
	root.style.setProperty(`--font-primary`, GLOBAL['config']['font'])
	window.themes.forEach(theme => {
		if (theme.name == currentTheme) {
			currentThemeIndex = window.themes.findIndex(theme => theme.name === currentTheme)
			window.themeVariant = theme.variant.toLowerCase()
			console.log(`Initially setting ${theme.name} as theme from config`)
			Object.entries(theme).forEach(([key, value]) => {
				if (headers.includes(key)) {
					return
				}
				root.style.setProperty(`--${key}`, value, 'important')
			})
			root.classList.remove('dark')
			root.classList.remove('light')
			root.classList.add(theme.variant.toLowerCase())
			GLOBAL['config']['current_theme'] = theme.name
		}
	})
	updateColoris()
}

themeButton.addEventListener('click', (e) => {
	e.stopPropagation()
	changeTheme()
})

function changeTheme() {
	currentThemeIndex += 1
	currentThemeIndex = currentThemeIndex % (window.themes.length)
	let theme = window.themes[currentThemeIndex]
	console.log(`Changing theme to ${theme.name}`)
	Object.entries(theme).forEach(([key, value]) => {
		if (headers.includes(key)) {
			return
		}
		root.style.setProperty(`--${key}`, value, 'important')
	})
	GLOBAL['config']['current_theme'] = theme.name
	window.themeVariant = theme['variant'].toLowerCase()
	// console.log(window.themeVariant)
	if (window.themeVariant === 'dark') {
		window.jsViewer.setAttribute('theme', 'default-dark')
	} else {
		window.jsViewer.setAttribute('theme', 'default-light')
	}
	root.classList.remove('dark')
	root.classList.remove('light')
	root.classList.add(theme.variant.toLowerCase())
	saveWindowConfig()
	updateColoris()
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
