// run this in the hyprland wiki page console to extract headers from the sidebar
(() => {
	const seen = new Set()
	const result = []

	for (const li of document.querySelectorAll("li")) {
		const isParent = li.querySelector("li")

		const text = isParent
			? [...li.childNodes]
				.filter(n =>
					n.nodeType === Node.TEXT_NODE ||
					(n.nodeType === Node.ELEMENT_NODE && !n.querySelector("li"))
				)
				.map(n => n.textContent)
				.join(" ")
			: li.textContent

		const clean = (isParent ? "▸ " : "") + text.replace(/\s+/g, " ").trim()

		if (seen.has(clean)) break   // STOP immediately at second instance
		seen.add(clean)
		result.push(clean)
	}

	return result.join("\n")
})()
