import type { ItemProps, ItemPropsGroup } from '@scripts/types/editorItemTypes.ts'

export default function createConfigFragment(data: ItemProps): DocumentFragment {
	const fragment = document.createDocumentFragment()

	if (data['type'] === 'GROUP' && data['name'] === 'root') {
		for (const child of data['children']) {
		}
	}

	return fragment
}
