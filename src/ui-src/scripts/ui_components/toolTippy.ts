import tippy, { followCursor, hideAll, roundArrow } from 'tippy.js'

export default function createToolTippy(options: { target: HTMLElement; content: string }) {
	tippy(options.target, {
		content: options.content,
		allowHTML: true,
		followCursor: false,
		plugins: [followCursor],
		delay: [500, 200],
		// interactive: true,
		animation: 'fade',
		arrow: roundArrow,
		onShow(instance) {
			hideAll({ exclude: this.el })
		},
	})
}
