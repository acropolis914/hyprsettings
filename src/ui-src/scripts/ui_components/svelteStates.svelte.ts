import { addKeys } from '@scripts/HyprlandSpecific/editorItem_newKey.ts'
export const counter = $state({
	count: 0,
})

export const menuState = $state({
	visible: false,
	closestConfigSet: null,
	x: 0,
	y: 0,
	items: [
		{
			label: 'Add new item',
			icon: '',
			action: async () => {
				await addKeys('', menuState.closestConfigSet)
			},
		},
		{ label: 'separator' },
		{
			label: 'Expand',
			icon: '󰡏',
			submenu: [
				{
					label: 'All Items',
					action: () => {
						document.querySelectorAll('.editor-item').forEach((item) => {
							item.classList.remove('compact')
						})
					}
				},
				{
					label: 'Keys Only',
					action: () => {
						document.querySelectorAll('.editor-item:not(.config-group)').forEach((item) => {
							item.classList.remove('compact')
						})
					}
				},
				{
					label: 'Groups Only',
					action: () => {
						document.querySelectorAll('.config-group').forEach((item) => {
							item.classList.remove('compact')
						})
					}
				}
			]
		},
		{
			label: 'Collapse',
			icon: '󰘕',
			submenu: [
				{
					label: 'All Items',
					action: () => {
						document.querySelectorAll('.editor-item').forEach((item) => {
							item.classList.add('compact')
						})
					}
				},
				{
					label: 'Keys Only',
					action: () => {
						document.querySelectorAll('.editor-item:not(.config-group)').forEach((item) => {
							item.classList.add('compact')
						})
					}
				},
				{
					label: 'Groups Only',
					action: () => {
						document.querySelectorAll('.config-group').forEach((item) => {
							item.classList.add('compact')
						})
					}
				}
			]
		},

		{
			label: 'separator',
		},
		{
			label: 'Reload window',
			icon: '󱄋',
			action: () => {
				location.reload()
			},
		},
		{
			label: 'Reload configs',
			icon: '',
			action: () => {
				window.reinitialize()
			},
		},

		// { label: 'Copy', icon: '󰆏', action: () => console.log('Copy') }, // nf-md-content_copy
		// // { label: 'Paste', icon: '󰆒', action: () => console.log('Paste') }, // nf-md-content_paste
		// {
		// 	label: 'More',
		// 	icon: '', // nf-md-dots_horizontal
		// 	submenu: [
		// 		{ label: 'Option 1', icon: '󰐊', action: () => console.log('Option 1') }, // nf-md-checkbox_blank_circle
		// 		{ label: 'Option 2', icon: '󰐊', action: () => console.log('Option 2') },
		// 	],
		// },
		// { label: 'Delete', icon: '󰆴', action: () => console.log('Delete') }, // nf-md-delete
	],
})
