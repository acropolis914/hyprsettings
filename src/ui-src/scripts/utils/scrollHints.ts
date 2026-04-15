export function implementScrollHints(el: HTMLDivElement | HTMLUListElement, threshold: number = 1) {
	if (!el) return

	el.classList.add('scroll-container')

	const TOP_CLASS = 'scroll-hint-top'
	const BOTTOM_CLASS = 'scroll-hint-bottom'

	const update = () => {
		const { scrollTop, scrollHeight, clientHeight } = el

		if (scrollTop > 0) {
			el.classList.add(TOP_CLASS)
		} else {
			el.classList.remove(TOP_CLASS)
		}

		const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1

		if (isAtBottom) {
			el.classList.remove(BOTTOM_CLASS)
		} else {
			el.classList.add(BOTTOM_CLASS)
		}
	}

	// Passive listener for better performance
	el.addEventListener('scroll', update, { passive: true })

	// Initial check (use requestAnimationFrame to ensure layout is ready)
	window.requestAnimationFrame(update)

	// Cleanup helper
	return () => el.removeEventListener('scroll', update)
}
