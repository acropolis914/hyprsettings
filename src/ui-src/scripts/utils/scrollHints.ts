export function implementScrollHints(el: HTMLDivElement | HTMLUListElement, threshold: number = 1) {
	if (!el) return

	el.classList.add('scroll-container')

	const TOP_CLASS = 'scroll-hint-top'
	const BOTTOM_CLASS = 'scroll-hint-bottom'

	const update = () => {
		const { scrollTop, scrollHeight, clientHeight } = el
		if (scrollTop > threshold) {
			el.classList.add(TOP_CLASS)
		} else {
			el.classList.remove(TOP_CLASS)
		}

		const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= threshold

		if (isAtBottom) {
			el.classList.remove(BOTTOM_CLASS)
		} else {
			el.classList.add(BOTTOM_CLASS)
		}
	}

	const observer = new MutationObserver(() => {
		update()
	})

	observer.observe(el, {
		childList: true,
		subtree: false,
	})


	window.addEventListener('resize', update)
	el.addEventListener('scroll', update, { passive: true })
	window.requestAnimationFrame(update)
	return () => {
		observer.disconnect()
		window.removeEventListener('resize', update)
		el.removeEventListener('scroll', update)
	}
}
