export function remarkHugoTabsToDirectives() {
	return (tree) => {
		const children = tree.children
		let i = 0

		while (i < children.length) {
			const node = children[i]
			const text = getRawText(node)

			if (text && text.includes('{{< tabs')) {
				const itemsMatch = text.match(/items="([^"]+)"/)
				const globalLabels = itemsMatch ? itemsMatch[1].split(',').map((s) => s.trim()) : []

				let endIdx = i
				while (endIdx < children.length && !getRawText(children[endIdx])?.includes('{{< /tabs >}}')) {
					endIdx++
				}

				if (endIdx < children.length) {
					const innerNodes = children.slice(i + 1, endIdx)
					const tabPanels = []
					const labelsFound = []
					let tabCounter = 0
					let currentTab = null

					innerNodes.forEach((innerNode) => {
						const innerText = getRawText(innerNode)
						if (innerText && innerText.includes('{{< tab')) {
							const labelMatch = innerText.match(/{{<\s*tab\s*(?:"([^"]+)")?\s*>\}}/)
							const label = labelMatch && labelMatch[1] ? labelMatch[1] : globalLabels[tabCounter]
							const id = `tab-${Math.random().toString(36).substr(2, 6)}`

							labelsFound.push({ label, id })
							currentTab = {
								type: 'containerDirective',
								name: 'tab',
								children: [],
								data: {
									hName: 'div',
									hProperties: {
										className: ['tab-panel'],
										id: id,
										// Hide all but the first tab initially
										style: tabCounter === 0 ? 'display: block;' : 'display: none;',
									},
								},
							}
							tabCounter++
							return
						}
						if (innerText && innerText.includes('{{< /tab >}}')) {
							if (currentTab) tabPanels.push(currentTab)
							currentTab = null
							return
						}
						if (currentTab) currentTab.children.push(innerNode)
					})

					// --- Direct Onclick Logic ---
					const tabSelector = {
						type: 'containerDirective',
						name: 'tab-selector',
						children: labelsFound.map((item, idx) => ({
							type: 'text',
							value: item.label,
							data: {
								hName: 'button',
								hProperties: {
									className: ['tab-btn', idx === 0 ? 'active' : ''],
									type: 'button',
									// The "One-Liner" Logic
									onclick: `(function(el){
                    const con = el.closest('.tabs-container');
                    con.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
                    con.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.getElementById('${item.id}').style.display = 'block';
                    el.classList.add('active');
                  })(this)`,
								},
							},
						})),
						data: {
							hName: 'div',
							hProperties: { className: ['tab-nav'] },
						},
					}

					const tabsContainer = {
						type: 'containerDirective',
						name: 'tabs',
						children: [tabSelector, ...tabPanels],
						data: {
							hName: 'div',
							hProperties: {
								className: ['tabs-container'],
							},
						},
					}

					children.splice(i, endIdx - i + 1, tabsContainer)
				}
			}
			i++
		}
	}
}

function getRawText(node) {
	if (node.type === 'paragraph') return node.children.map((c) => c.value || '').join('')
	if (node.type === 'html' || node.type === 'text') return node.value
	return null
}
