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
	destroyOverlay(true)
	await new Promise(requestAnimationFrame)
	let contentArea = document.getElementById('content-area')
	const overlay = document.createElement('div')
	overlay.id = 'loading-overlay'
	overlay.className = 'darken-overlay'
	const spinner = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>*{fill:var(--text-0) !important}.spinner_nOfF{animation:spinner_qtyZ 2s cubic-bezier(0.36,.6,.31,1) infinite}.spinner_fVhf{animation-delay:-.5s}.spinner_piVe{animation-delay:-1s}.spinner_MSNs{animation-delay:-1.5s}@keyframes spinner_qtyZ{0%{r:0}25%{r:3px;cx:4px}50%{r:3px;cx:12px}75%{r:3px;cx:20px}100%{r:0;cx:20px}}</style><circle class="spinner_nOfF" cx="4" cy="12" r="3"/><circle class="spinner_nOfF spinner_fVhf" cx="4" cy="12" r="3"/><circle class="spinner_nOfF spinner_piVe" cx="4" cy="12" r="3"/><circle class="spinner_nOfF spinner_MSNs" cx="4" cy="12" r="3"/></svg>`
	const wrapper = document.createElement('div')
	wrapper.innerHTML = spinner.trim()

	const loadingText = document.createElement('div')
	loadingText.className = 'loading-text'
	loadingText.textContent = message
	overlay.appendChild(loadingText)
	overlay.appendChild(wrapper.firstChild)
	contentArea.appendChild(overlay)
	await new Promise(requestAnimationFrame)
}

window.destroyOverlay = destroyOverlay
