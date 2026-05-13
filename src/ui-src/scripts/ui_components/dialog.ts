type DialogProps = {
	title?: string
	okayButton?: boolean
	closeButton?: boolean
	onOkay?: () => void
	onClose?: () => void
	textContent?: string
	maxWidth?: string
}

export default class Dialog {
	private readonly dialog: HTMLDialogElement
	private readonly titleEl: HTMLHeadingElement
	private readonly renderArea: HTMLDivElement
	private readonly okayBtn: HTMLButtonElement
	private readonly closeBtn: HTMLButtonElement
	private readonly props: Required<Pick<DialogProps, 'okayButton' | 'closeButton'>> & DialogProps

	constructor(props: DialogProps = {}) {
		this.props = {
			title: props.title ?? '',
			okayButton: props.okayButton ?? true,
			closeButton: props.closeButton ?? true,
			onOkay: props.onOkay,
			onClose: props.onClose,
			textContent: props.textContent,
			maxWidth: props.maxWidth ?? '45ch',
		}

		this.dialog = document.createElement('dialog')
		this.dialog.classList.add('app-dialog')
		if (this.props.maxWidth !== 'none') {
			this.dialog.style.maxWidth = this.props.maxWidth
		}

		const shell = document.createElement('div')
		shell.classList.add('dialog-shell')

		const titlebar = document.createElement('div')
		titlebar.classList.add('dialog-titlebar')

		this.titleEl = document.createElement('h3')
		this.titleEl.classList.add('dialog-title')
		this.titleEl.textContent = this.props.title ?? ''

		titlebar.appendChild(this.titleEl)

		this.renderArea = document.createElement('div')
		this.renderArea.classList.add('dialog-render-area')
		if (this.props.textContent) {
			this.renderArea.innerHTML = this.props.textContent
		}

		const actions = document.createElement('div')
		actions.classList.add('dialog-actions')

		this.okayBtn = document.createElement('button')
		this.okayBtn.type = 'button'
		this.okayBtn.classList.add('dialog-button', 'button-okay')
		this.okayBtn.textContent = 'Okay'
		this.okayBtn.onclick = () => {
			this.props.onOkay?.()
			this.close()
		}

		this.closeBtn = document.createElement('button')
		this.closeBtn.type = 'button'
		this.closeBtn.classList.add('dialog-button', 'button-close')
		this.closeBtn.textContent = 'Close'
		this.closeBtn.onclick = () => {
			this.close()
		}

		if (this.props.okayButton) {
			actions.appendChild(this.okayBtn)
		}
		if (this.props.closeButton) {
			actions.appendChild(this.closeBtn)
		}

		shell.append(titlebar, this.renderArea, actions)
		this.dialog.appendChild(shell)

		this.dialog.addEventListener('close', () => {
			this.props.onClose?.()
			this.dialog.remove()
		})
	}

	showModal() {
		if (!this.dialog.isConnected) {
			document.body.appendChild(this.dialog)
		}
		this.dialog.showModal()
	}

	close() {
		this.dialog.close()
	}

	setTitle(title: string) {
		this.titleEl.textContent = title
		this.props.title = title
	}

	render(node: HTMLElement) {
		this.renderArea.innerHTML = ''
		this.renderArea.appendChild(node)
	}

	get element() {
		return this.dialog
	}
}
