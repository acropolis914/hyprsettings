type DialogProps = {
	title?: string
	okayButton?: boolean
	closeButton?: boolean
	onOkay?: () => void
	onClose?: () => void
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
		}

		this.dialog = document.createElement('dialog')
		this.dialog.classList.add('app-dialog')
		this.dialog.style.position = 'absolute'
		this.dialog.style.transform = 'translate(-50%, -50%)'
		this.dialog.style.top = '50%'
		this.dialog.style.left = '50%'
		this.dialog.style.padding = '1rem'
		this.dialog.style.borderRadius = '0.4rem'
		this.dialog.style.border = '1px solid #666'
		this.dialog.style.width = '90%'
		this.dialog.style.maxWidth = '60rem'

		const shell = document.createElement('div')
		shell.classList.add('app-dialog__shell')
		shell.style.display = 'flex'
		shell.style.flexDirection = 'column'
		shell.style.gap = '0.75rem'

		const titlebar = document.createElement('div')
		titlebar.classList.add('app-dialog__titlebar')
		titlebar.style.display = 'flex'
		titlebar.style.alignItems = 'center'
		titlebar.style.justifyContent = 'space-between'
		titlebar.style.gap = '1rem'

		this.titleEl = document.createElement('h3')
		this.titleEl.classList.add('app-dialog__title')
		this.titleEl.style.margin = '0'
		this.titleEl.textContent = this.props.title ?? ''

		titlebar.appendChild(this.titleEl)

		this.renderArea = document.createElement('div')
		this.renderArea.classList.add('app-dialog__render-area')
		this.renderArea.style.display = 'block'

		const actions = document.createElement('div')
		actions.classList.add('app-dialog__actions')
		actions.style.display = 'flex'
		actions.style.justifyContent = 'flex-end'
		actions.style.gap = '0.5rem'

		this.okayBtn = document.createElement('button')
		this.okayBtn.type = 'button'
		this.okayBtn.textContent = 'Okay'
		this.okayBtn.onclick = () => {
			this.props.onOkay?.()
			this.close()
		}

		this.closeBtn = document.createElement('button')
		this.closeBtn.type = 'button'
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
