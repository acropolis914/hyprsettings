window.ctx_label_hidden = true
export class ContextMenu {
	constructor(items = []) {
		this.el = document.createElement("div")
		this.el.classList.add("context-menu", "hidden")

		for (const { label, icon, action } of items) {
			const btnEl = document.createElement("div")
			btnEl.classList.add("ctx-button")
			const iconEl = document.createElement("div")
			iconEl.classList.add("ctx-button-icon")
			iconEl.textContent = icon
			const labelEl = document.createElement("div")
			labelEl.classList.add("ctx-button-label")
			if (window.ctx_label_hidden) {
				labelEl.classList.add("hidden")
			}
			labelEl.textContent = label

			btnEl.addEventListener("click", (e) => {
				e.stopPropagation()
				action?.()
			})

			btnEl.appendChild(iconEl)
			btnEl.appendChild(labelEl)
			this.el.appendChild(btnEl)

		}
	}

	show() {
		this.el.classList.remove("hidden")
	}
	hide() {
		this.el.classList.add("hidden")
	}

}