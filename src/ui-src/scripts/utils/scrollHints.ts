export function implementScrollHints(el: HTMLDivElement | HTMLUListElement) {
	if (!el || !el.firstElementChild || !el.lastElementChild) {
		console.error(`${el} has problems.`)
		return
	}

	const first = el.firstElementChild as HTMLElement
	const last = el.lastElementChild as HTMLElement

	// classes you can style (e.g. shadows / fades)
	const FIRST_HIDDEN_CLASS = 'scroll-hint-top'
	const LAST_HIDDEN_CLASS = 'scroll-hint-bottom'

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const isFullyVisible = entry.intersectionRatio === 1

				if (entry.target === first) {
					el.classList.toggle(FIRST_HIDDEN_CLASS, !isFullyVisible)
				}

				if (entry.target === last) {
					el.classList.toggle(LAST_HIDDEN_CLASS, !isFullyVisible)
				}
			}
		},
		{
			root: el,
			threshold: [1], // only consider "visible" if fully in view
		},
	)

	observer.observe(first)
	observer.observe(last)

	return () => observer.disconnect() // cleanup helper
}
