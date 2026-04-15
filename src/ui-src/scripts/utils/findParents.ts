export default function findParentsUntil(el: HTMLElement, selector: string, stopWhen: string): HTMLElement[] {
	const parents = []
	let parent = el.parentElement

	while (parent) {
		if (stopWhen && parent.matches(stopWhen)) {
			break
		}
		if (parent.matches(selector)) {
			parents.push(parent)
		}

		parent = parent.parentElement
	}
	return parents
}
