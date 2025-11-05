// document.addEventListener("mousedown", (e) => {
// 	allContextMenus.forEach(menu => {
// 	    if (!menu.el.contains(e.target) && !menu.parentEl.contains(e.target)) {
// 		  menu.hide();
// 	    }
// 	});
//   });

export class ContextMenu {
	constructor(items = []) {
		this.el = document.createElement("div")
		this.el.classList.add("context-menu", "hidden")
		this.el.setAttribute("contenteditable", false)
		this.el.addEventListener("transitionend", (e) => {
			if (e.propertyName === "opacity" && getComputedStyle(e.target).opacity === "0") {
				this.el.classList.add("hidden")
			}
		});

		for (const { label, icon, action } of items) {
			const btnEl = document.createElement("div")
			btnEl.classList.add("ctx-button")
			const iconEl = document.createElement("div")
			iconEl.classList.add("ctx-button-icon")
			iconEl.textContent = icon
			const labelEl = document.createElement("div")
			labelEl.classList.add("ctx-button-label")
			if (!window.config["show_contextmenu_label"]) {
				labelEl.classList.add("hidden")
			}
			labelEl.textContent = label

			if (label.toLowerCase().includes("delete")) {
				let clickCount = 0
				btnEl.addEventListener("click", (e) => {
					e.stopPropagation()
					clickCount += 1
					if (clickCount == 1) {
						iconEl.classList.add("warn")
						labelEl.classList.add("warn")
						labelEl.textContent = "You sure?"
						console.log("Are you sure?")
					}
					if (clickCount > 1) {
						action?.()
					}
				})
				btnEl.addEventListener("mouseleave", (e) => {
					setTimeout(() => {
						clickCount = 0
						iconEl.classList.remove("warn")
						labelEl.classList.remove("warn")
						labelEl.textContent = label
					}, 1500)
				})

			} else {
				btnEl.addEventListener("click", (e) => {
					e.stopPropagation()
					action?.()
				})
			}


			btnEl.appendChild(iconEl)
			btnEl.appendChild(labelEl)
			this.el.appendChild(btnEl)

		}
	}
	toggle() {
		this.el.classList.toggle("hidden")
	}

	show() {
		this.el.style.opacity = 1
		this.el.classList.remove("hidden")


	}
	hide() {
		this.el.style.opacity = 0
		setTimeout(() => {
			this.el.classList.add("hidden")
		}, 500)

	}

}