export function createOverlay() {
	destroyOverlay(true)
	const overlay = document.createElement('div')
	overlay.id = 'dmenu-overlay'
	overlay.className = 'darken-overlay'
	document.getElementById('content-area').appendChild(overlay)
}

export function destroyOverlay(immediate = false) {
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

export default function createLoadingOverlay(message = 'Loading your Hyprland config') {
	destroyOverlay(true)
	const overlay = document.createElement('div')
	overlay.id = 'loading-overlay'
	overlay.className = 'darken-overlay'
	overlay.style.opacity = '0'
	overlay.style.transition = 'opacity 0.7s ease-in'

	const spinner = document.createElement('div')
	spinner.className = 'spinner'
	overlay.appendChild(spinner)

	const loadingText = document.createElement('div')
	loadingText.className = 'loading-text'
	loadingText.textContent = message
	overlay.appendChild(loadingText)

	document.getElementById('content-area').appendChild(overlay)

	requestAnimationFrame(() => {
		// overlay.style.opacity = '1'
		overlay.style.opacity = '1'
	})
	let dots = 0
	const intervalId = setInterval(() => {
		dots = (dots + 1) % 4
		loadingText.textContent = message + '.'.repeat(dots)
	}, 200)

	return () => {
		clearInterval(intervalId)
		destroyOverlay()
	}
}
