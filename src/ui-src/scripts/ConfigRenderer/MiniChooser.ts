export interface Item {
	name: string
	description: string
}

export type Orientation = 'horizontal' | 'vertical'

export class MiniChooserTS {
	public target: HTMLElement
	public items: Item[]
	public orientation: Orientation
	public onChange?: (value: string) => void

	private _value: string = ''
	private _buttons: Map<string, HTMLButtonElement> = new Map()

	constructor(
		target: HTMLElement,
		items: Item[],
		initialValue: string = '',
		onChange?: (value: string) => void,
		orientation: Orientation = 'horizontal',
	) {
		this.target = target
		this.items = items
		this.onChange = onChange
		this.orientation = orientation

		this.render()
		this.set(initialValue, false)
	}

	get value(): string {
		return this._value
	}

	set value(newValue: string) {
		this.set(newValue, true)
	}

	/**
	 * Sets the value, validates it, updates the UI, and optionally emits the change.
	 */
	public set(newValue: string, emit: boolean = true): void {
		if (this.isValidItem(newValue)) {
			this._value = newValue
			this.updateUI()

			if (emit && this.onChange) {
				this.onChange(this._value)
			}
		} else if (newValue !== '') {
			console.warn(`[MiniChooserTS]: Value '${newValue}' is not in the items list.`)
		}
	}

	private isValidItem(name: string): boolean {
		return this.items.some((item) => item.name === name)
	}

	/**
	 * Builds the DOM structure and attaches it to the target parent.
	 */
	private render(): void {
		const container = document.createElement('div')
		container.id = 'generic-key'
		container.className = 'chooser-modal'

		const choicesDiv = document.createElement('div')
		choicesDiv.id = 'choices'
		choicesDiv.style.flexDirection = this.orientation === 'horizontal' ? 'row' : 'column'

		this.items.forEach((item) => {
			const btn = document.createElement('button')
			btn.className = 'choice'
			btn.title = item.description
			btn.textContent = item.name

			btn.onclick = () => {
				this.set(item.name, true)
			}

			this._buttons.set(item.name, btn)
			choicesDiv.appendChild(btn)
		})

		container.appendChild(choicesDiv)
		this.target.appendChild(container)
	}

	/**
	 * Updates the 'selected' class on the rendered buttons based on the current value.
	 */
	private updateUI(): void {
		this._buttons.forEach((btn, name) => {
			if (name === this._value) {
				btn.classList.add('selected')
			} else {
				btn.classList.remove('selected')
			}
		})
	}
}
