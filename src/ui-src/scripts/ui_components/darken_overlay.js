export function createOverlay() {
	const overlay = document.createElement('div')
	overlay.id = 'dmenu-overlay'
	overlay.className = 'darken-overlay'
	document.getElementById('content-area').appendChild(overlay)
}

export function destroyOverlay() {
	let overlays = document.querySelectorAll('.darken-overlay')
	try {
		overlays.forEach((overlay) => {
			overlay.parentNode.removeChild(overlay)
		})
	} catch (err) {}
}

export function createLoadingOverlay(message = 'Loading your Hyprland config') {
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
	document.getElementById('content-area').appendChild(overlay)
	let dots = 0
	const intervalId = setInterval(() => {
		dots = (dots + 1) % 4
		loadingText.textContent = message + '.'.repeat(dots)
	}, 200)

	// 🔑 return a cleanup function
	return () => {
		clearInterval(intervalId)
		overlay.remove()
	}
}
