export function createOverlay() {
	destroyOverlay(true)
	const overlay = document.createElement('div')
	overlay.id = 'dmenu-overlay'
	overlay.className = 'darken-overlay'
	document.getElementById('content-area').appendChild(overlay)
}

export async function destroyOverlay(immediate = false) {
	const overlays: NodeListOf<Element> = document.querySelectorAll('.darken-overlay')
	for (const overlay of overlays) {
		if (immediate) {
			overlay.remove()
			continue
		}
		overlay.style.transition = 'opacity 0.5s ease-in'
		overlay.style.opacity = '0'
		overlay.addEventListener('transitionend', () => overlay.remove(), {
			once: true,
		})
	}
}

const nextPaint = () => new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)))

export function logSize(el: Element, label = 'Element') {
	if (!el) return
	const computed = window.getComputedStyle(el)
	console.log(`[${label}] Computations:`, {
		width: computed.width,
		height: computed.height,
		fontSize: computed.fontSize,
		transform: computed.transform,
	})
}

export default async function createLoadingOverlay(message = 'Loading your Hyprland config') {
	performance.mark('overlay:start')

	performance.mark('destroyOverlay:start')
	await destroyOverlay(true)
	performance.mark('destroyOverlay:end')
	performance.measure('destroyOverlay', 'destroyOverlay:start', 'destroyOverlay:end')

	performance.mark('after-destroy:rAF-wait:start')
	await new Promise((resolve) => requestAnimationFrame(resolve))
	performance.mark('after-destroy:rAF-wait:end')
	performance.measure('rAF-after-destroy', 'after-destroy:rAF-wait:start', 'after-destroy:rAF-wait:end')

	const contentArea = document.getElementById('content-area')
	logSize(contentArea, 'contentArea (Start)')

	performance.mark('overlay:create:start')

	const overlay = document.createElement('div')
	overlay.id = 'loading-overlay'
	overlay.className = 'darken-overlay'

	const loadingText = document.createElement('div')
	loadingText.className = 'loading-text'
	loadingText.textContent = message
	overlay.appendChild(loadingText)

	const spinner = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>*{fill:var(--text-0) !important}.spinner_nOfF{animation:spinner_qtyZ 2s cubic-bezier(0.36,.6,.31,1) infinite}.spinner_fVhf{animation-delay:-.5s}.spinner_piVe{animation-delay:-1s}.spinner_MSNs{animation-delay:-1.5s}@keyframes spinner_qtyZ{0%{r:0}25%{r:3px;cx:4px}50%{r:3px;cx:12px}75%{r:3px;cx:20px}100%{r:0;cx:20px}}</style><circle class="spinner_nOfF" cx="4" cy="12" r="3"/><circle class="spinner_nOfF spinner_fVhf" cx="4" cy="12" r="3"/><circle class="spinner_nOfF spinner_piVe" cx="4" cy="12" r="3"/><circle class="spinner_nOfF spinner_MSNs" cx="4" cy="12" r="3"/></svg>`
	// const spinner = '<img src="/assets/loading.gif" alt="loading-animation"/>'
	const wrapper = document.createElement('div')
	wrapper.innerHTML = spinner.trim()
	overlay.appendChild(wrapper.firstChild)

	performance.mark('overlay:create:end')
	performance.measure('overlay-create', 'overlay:create:start', 'overlay:create:end')

	performance.mark('before-append:rAF:start')
	await new Promise((resolve) => requestAnimationFrame(resolve))
	performance.mark('before-append:rAF:end')
	performance.measure('rAF-before-append', 'before-append:rAF:start', 'before-append:rAF:end')

	performance.mark('overlay:append:start')
	console.timeStamp('Appending overlay')
	contentArea.appendChild(overlay)
	performance.mark('overlay:append:end')
	performance.measure('overlay-append', 'overlay:append:start', 'overlay:append:end')

	logSize(overlay, 'overlay (After Append)')
	logSize(loadingText, 'loadingText (After Append)')

	performance.mark('after-append:rAF:start')
	await new Promise(requestAnimationFrame)
	performance.mark('after-append:rAF:end')
	performance.measure('rAF-after-append', 'after-append:rAF:start', 'after-append:rAF:end')

	logSize(overlay, 'overlay (End - after animation frame)')

	performance.mark('overlay:end')
	performance.measure('overlay-total', 'overlay:start', 'overlay:end')
}

window.destroyOverlay = destroyOverlay
