import { visit } from 'unist-util-visit'
// import { h } from 'hastscript'

export function remarkObsidianAdmonitions() {
	return (tree) => {
		visit(tree, (node) => {
			// Only handle blockquotes
			if (node.type === 'blockquote' && node.children.length > 0) {
				const first = node.children[0]
				if (
					first.type === 'paragraph' &&
					first.children.length > 0 &&
					first.children[0].type === 'text'
				) {
					const text = first.children[0].value.trim()
					// Check for [!TYPE]
					const match = text.match(
						/^\[!(NOTE|TIP|WARNING|CAUTION)]/i,
					)
					if (match) {
						const type = match[1].toLowerCase()
						const data = node.data || (node.data = {})
						data.hName = 'div'
						data.hProperties = {
							className: [
								'admonition',
								type,
								'blockquote',
							],
						}

						// Remove the [!TYPE] marker from the first paragraph
						first.children[0].value =
							first.children[0].value.replace(
								/^\[!(NOTE|TIP|WARNING|CAUTION)]\s*/,
								'',
							)
					}
				}
			}
		})
	}
}
