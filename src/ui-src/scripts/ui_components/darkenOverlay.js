export function createOverlay() {
	destroyOverlay(true)
	const overlay = document.createElement('div')
	overlay.id = 'dmenu-overlay'
	overlay.className = 'darken-overlay'
	document.getElementById('content-area').appendChild(overlay)
}

export async function destroyOverlay(immediate = false) {
	const overlays = document.querySelectorAll('.darken-overlay')
	for (const overlay of overlays) {
		if (immediate) {
			overlay.remove()
			continue
		}
		overlay.style.transition = 'opacity 0.5s ease-in'
		overlay.style.opacity = '0'
		overlay.addEventListener('transitionend', () => overlay.remove(), { once: true })
	}
}

const nextPaint = () => new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)))

export default async function createLoadingOverlay(message = 'Loading your Hyprland config') {
	await destroyOverlay(true)
	let contentArea = document.getElementById('content-area')
	const overlay = document.createElement('div')
	overlay.id = 'loading-overlay'
	overlay.className = 'darken-overlay'
	const spinner = document.createElement('div')
	spinner.className = 'spinner'
	overlay.appendChild(spinner)
	const loadingText = document.createElement('div')
	loadingText.className = 'loading-text'
	loadingText.textContent = message
	overlay.appendChild(loadingText)
	contentArea.appendChild(overlay)
	//	// overlay.style.opacity = '0'
	// 	// overlay.style.transition = 'opacity 0.7s ease-in'
	// requestAnimationFrame(() => {
	// 	overlay.style.opacity = '1'
	// })

	await nextPaint()

	let braille_animation = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'.split('')
	let idx = 0
	let intervalId
	intervalId = setInterval(() => {
		const frame = braille_animation[idx]
		loadingText.textContent = message + ' ' + frame
		idx = (idx + 1) % braille_animation.length
	}, 50)
	//
	// return () => {
	// 	clearInterval(intervalId)
	// 	destroyOverlay()
	// }
}

window.destroyOverlay = destroyOverlay
