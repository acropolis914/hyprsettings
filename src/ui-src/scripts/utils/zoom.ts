import { GLOBAL } from '@scripts/GLOBAL.ts'
import { saveConfigDebounced } from '@scripts/utils/backendAPI'
import { saveWindowConfig_Persistence } from '@scripts/utils/utils.ts'
const html = document.documentElement
// html.style.setProperty('--zoom-factor', 1)

export function zoom(amount: number = 0.1) {
	const current = parseFloat(getComputedStyle(html).getPropertyValue('--zoom-factor')) || 1
	const next = Math.min(Math.max(0.5, Math.round((current + amount) * 100) / 100), 2)
	html.style.setProperty('--zoom-factor', String(next))
	GLOBAL.persistence['zoom_factor'] = next
	saveWindowConfig_Persistence()
}

export function setZoom(value: number, save = false) {
	const clamped = Math.min(Math.max(0.5, value), 2)
	html.style.setProperty('--zoom-factor', String(clamped))
	GLOBAL.persistence['zoom_factor'] = clamped
	if (save) saveWindowConfig_Persistence()
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
