import { parseHyprColor } from "../../hyprland-specific/colorparser.js"
import noUiSlider from "../../jslib/nouislider.min.mjs"
import { getSwatch } from "../setupTheme.js"
import { debounce } from "../utils.js"

export class GradientModal {
	constructor(initialValue = "") {
		this._listeners = []
		this.el = document.createElement("div")
		this.el.classList.add("generic-editor-gradientmodal")

		this.colorContainer = document.createElement("div")
		this.colorContainer.classList.add("color-container")
		this.angleContainer = document.createElement("div")
		this.angleContainer.classList.add("angle-container")

		this.el.appendChild(this.angleContainer)
		this.el.appendChild(this.colorContainer)

		// Slider setup
		this.angleEl = document.createElement("div")
		this.angleEl.classList.add("slider-styled")
		this.angleEl.id = "slider-square"
		this.angleContainer.appendChild(this.angleEl)

		this.slider = noUiSlider.create(this.angleEl, {
			start: 0,
			step: 1,
			range: { min: 0, max: 360 }
		})

		// Angle text input
		this.textEditor = document.createElement("input")
		this.textEditor.type = "text"
		this.textEditor.size = 3
		this.angleContainer.appendChild(this.textEditor)

		let updating = false

		// Sync from text input to slider
		this.textEditor.addEventListener("input", () => {
			if (updating) return
			updating = true
			const val = parseInt(this.textEditor.value)
			if (!isNaN(val)) this.angleEl.noUiSlider.set(val)
			updating = false
			this._emit()
			this._notifyInputListeners()
		})

		// Prevent Enter from propagating
		this.textEditor.addEventListener("keydown", (e) => {
			if (e.key === "Enter") e.stopPropagation()
		})

		// Sync from slider to text input
		this.angleEl.noUiSlider.on("update", (values) => {
			if (updating) return
			updating = true
			this.textEditor.value = parseInt(values[0])
			updating = false
			this._emit()
			this._notifyInputListeners()
		})

		Object.defineProperty(this.el, "value", {
			get: () => this.value,
			set: (val) => { this.value = val }
		})

		// Initialize values if provided
		if (initialValue) this.setValue(initialValue)
	}

	_notifyInputListeners() {
		const inputEvent = new Event("input", { bubbles: true })
		this.el.dispatchEvent(inputEvent)
	}

	_emit() {
		for (const fn of this._listeners) fn(this.value)
	}

	onChange(fn) {
		this._listeners.push(fn)
	}

	// Reusable parser for colors + angle
	parseValue(value) {
		const parts = value.trim().split(" ")
		if (parts.length < 2) return { colors: parts, angle: 0 }

		const anglePart = parts[parts.length - 1]
		const angle = parseInt(anglePart.replace("deg", ""))
		const colors = parts.slice(0, parts.length - 1)

		return { colors, angle: isNaN(angle) ? 0 : angle }
	}

	get value() {
		const colors = Array.from(this.colorContainer.children).map(c => c.value)
		const angle = parseInt(this.angleEl.noUiSlider.get())
		return `${colors.join(" ")}${angle}deg`
	}

	set value(val) {
		this.setValue(val)
	}

	setValue(val) {
		// Clear previous colors
		this.colorContainer.innerHTML = ""

		const { colors, angle } = this.parseValue(val)

		// Set slider & text
		this.angleEl.noUiSlider.set(angle)
		this.textEditor.value = angle

		// Create color inputs
		colors.forEach(item => {
			let colordiv = this.createColorPreview(item)
			this.colorContainer.appendChild(colordiv)

		})
		const button = document.createElement("button")
		button.textContent = ""
		button.addEventListener("click", () => {
			if (this.colorContainer.children.length == 11) {
				return
			}
			const itemIndex = Math.round(Math.random() * getSwatch().length)
			const item = getSwatch()[itemIndex]
			let colordiv = this.createColorPreview(item)
			button.before(colordiv)
			this._emit()
			this._notifyInputListeners()
		})
		this.colorContainer.append(button)
	}

	createColorPreview(item) {
		let colorText = isNaN(parseInt(item)) ? item : parseInt(item)
		if (item.startsWith("#")) {
			if (item.split("").length == 7) {
				colorText = `0x${item.replace("#", "")}`
			} else {
				colorText = `0x${item.replace("#", "")}`
			}
		}
		// console.log(colorText)
		const rgba = parseHyprColor(colorText)
		// console.log(rgba)
		const colordiv = document.createElement("input")
		colordiv.type = "text"
		colordiv.dataset.coloris = ""
		colordiv.value = rgba
		colordiv.style.backgroundColor = rgba
		colordiv.size = 1

		colordiv.addEventListener("change", () => {
			colordiv.style.backgroundColor = colordiv.value
		})
		colordiv.addEventListener("input", () => {
			colordiv.style.backgroundColor = colordiv.value
			this._emit()
			this._notifyInputListeners()
		})
		colordiv.addEventListener("contextmenu", (e) => {
			e.preventDefault()
			if (this.colorContainer.children.length < 3) {
				return
			}

			colordiv.remove()
			this._emit()
			this._notifyInputListeners()
		})
		return colordiv
	}


	replaceElement(target) {
		if (!target) return
		target.replaceWith(this.el)
	}
}

// document.addEventListener("DOMContentLoaded", () => {
// 	const testingScreen = document.querySelector(".testing-screen>#main-part")
// 	const gradient = new GradientModal("111111 rgba(1,178,7,1) 20deg")
// 	gradient.el.style.width = "500px"
// 	testingScreen.appendChild(gradient.el)

// 	gradient.el.addEventListener("input", () => {
// 		console.log(gradient.el.value)
// 	})
// })
