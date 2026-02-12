export function remarkHugoDetailsToHTML() {
	return (tree) => {
		const children = tree.children
		let i = 0

		while (i < children.length) {
			const node = children[i]
			const text = getRawText(node)

			if (text && text.includes('{{% details')) {
				const titleMatch = text.match(/title="([^"]+)"/)
				const isClosed = text.includes('closed="true"')
				const title = titleMatch ? titleMatch[1] : 'Details'

				let endIdx = i
				let foundClosing = false

				for (let j = i + 1; j < children.length; j++) {
					const nextText = getRawText(children[j])
					if (
						nextText &&
						nextText.includes('{{% /details %}}')
					) {
						endIdx = j
						foundClosing = true
						break
					}
				}

				if (foundClosing) {
					const innerContent = children.slice(i + 1, endIdx)

					// 1. Header is now a BUTTON (Better for events and accessibility)
					const headerNode = {
						type: 'paragraph',
						children: [{ type: 'text', value: title }],
						data: {
							hName: 'button',
							hProperties: {
								type: 'button',
								className: [
									'details-header',
									isClosed ? '' : 'is-open',
								],
								onclick: `(function(btn){
                  const body = btn.nextElementSibling;
                  btn.classList.toggle('is-open');
                  if (body.style.display === 'none') {
                    body.style.display = 'block';
                  } else {
                    body.style.display = 'none';
                  }
                })(this)`,
							},
						},
					}

					// 2. Body Div
					const bodyNode = {
						type: 'containerDirective',
						children: innerContent,
						data: {
							hName: 'div',
							hProperties: {
								className: ['details-body'],
								style: isClosed
									? 'display: none;'
									: 'display: block;',
							},
						},
					}

					// 3. Wrapper Div
					const wrapperNode = {
						type: 'containerDirective',
						children: [headerNode, bodyNode],
						data: {
							hName: 'div',
							hProperties: {
								className: ['details-wrapper'],
							},
						},
					}

					children.splice(i, endIdx - i + 1, wrapperNode)
				}
			}
			i++
		}
	}
}

function getRawText(node) {
	if (node.value) return node.value
	if (node.children) return node.children.map(getRawText).join('')
	return ''
}
