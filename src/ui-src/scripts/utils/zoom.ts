import { GLOBAL } from '@scripts/GLOBAL.ts'
import { saveConfigDebounced } from '@scripts/utils/backendAPI'
import { saveWindowConfig_Persistence } from '@scripts/utils/utils.ts'
const html = document.documentElement
html.style.setProperty('--zoom-factor', 1)

export function zoom(amount: number = 0.1) {
	const current = parseFloat(html.style.zoom) || 1
	const next: number = parseFloat((current + amount).toFixed(2))
	if (next <= 0.5) return
	html.style.zoom = String(next)
	html.style.setProperty('--zoom-factor', 1 / next)
	GLOBAL.persistence['zoom_factor'] = next
	saveWindowConfig_Persistence()
}
export function setZoom(value: number, save = false) {
	html.style.zoom = String(value)
	html.style.setProperty('--zoom-factor', 1 / value)
	GLOBAL.persistence['zoom_factor'] = value
	saveWindowConfig_Persistence().then()
}

document.addEventListener('keydown', (e) => {
	if (e.key === '=' && e.ctrlKey) {
		zoom(0.1)
	}
	if (e.key === '-' && e.ctrlKey) {
		zoom(-0.1)
	}
})

globalThis.zoom = zoom
