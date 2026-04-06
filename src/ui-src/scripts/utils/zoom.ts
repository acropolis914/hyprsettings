import { GLOBAL } from '@scripts/GLOBAL.ts'
const html = document.documentElement
html.style.setProperty('--zoom-factor', 1)

function zoom(amount: number = 0.1) {
	const current = parseFloat(html.style.zoom) || 1
	const next: number = parseFloat((current + amount).toFixed(2))
	if (next <= 0.5) return
	html.style.zoom = String(next)
	html.style.setProperty('--zoom-factor', 1 / next)
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
