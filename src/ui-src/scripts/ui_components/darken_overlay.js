export function createOverlay() {
	destroyOverlay()
	const overlay = document.createElement('div')
	overlay.id = 'dmenu-overlay'
	overlay.className = 'darken-overlay'
	document.getElementById('content-area').appendChild(overlay)
}

export async function destroyOverlay() {
	const overlays = document.querySelectorAll('.darken-overlay')

	for (const overlay of overlays) {
		overlay.remove()
		// let opacity = 1
		// const step = 0.01
		//
		// const interval = setInterval(() => {
		// 	opacity -= step
		// 	overlay.style.opacity = opacity
		//
		// 	if (opacity <= 0) {
		// 		clearInterval(interval)
		// 		overlay.remove()
		// 	}
		// }, 1)
	}
}

export default function createLoadingOverlay(message = 'Loading your Hyprland config') {
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
