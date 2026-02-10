export const counter = $state({
	count: 0,
})

export const menuState = $state({
	visible: false,
	x: 0,
	y: 0,
	items: [
		{
			label: 'Reload window',
			icon: '󱄋',
			action: () => {
				location.reload()
			},
		},
		{
			label: 'Reload hyprland configs',
			icon: '',
			action: () => {
				window.reinitialize()
			},
		},
		// { label: 'Copy', icon: '󰆏', action: () => console.log('Copy') }, // nf-md-content_copy
		// { label: 'Paste', icon: '󰆒', action: () => console.log('Paste') }, // nf-md-content_paste
		// {
		// 	label: 'More',
		// 	icon: '󰁍', // nf-md-dots_horizontal
		// 	submenu: [
		// 		{ label: 'Option 1', icon: '󰐊', action: () => console.log('Option 1') }, // nf-md-checkbox_blank_circle
		// 		{ label: 'Option 2', icon: '󰐊', action: () => console.log('Option 2') },
		// 	],
		// },
		// { label: 'Delete', icon: '󰆴', action: () => console.log('Delete') }, // nf-md-delete
	],
})
