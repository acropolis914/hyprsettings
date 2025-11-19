import noUiSlider from '../jslib/nouislider.min.mjs'
import { debounce } from '../utils.js'
// import wNumb from "../../jslib/wNumb.min.js"
// import "../../jslib/nouislider.css"
export class SliderModal {
	constructor(min, max, float = true) {
		this._listeners = []
		this.float = float
		this.el = document.createElement('div')
		this.el.classList.add('generic-editor-slidermodal')
		this.sliderEl = document.createElement('div')
		this.sliderEl.classList.add('slider-styled')
		this.sliderEl.id = ('slider-square')
		this.el.appendChild(this.sliderEl)

		// this.sliderEl = document.createElement("input")
		// this.sliderEl.setAttribute("type", range)
		let divisor = (max - min) * 2
		let steps = float ? ((max - min) / divisor) : 1
		this.slider = noUiSlider.create(this.sliderEl, {
			start: 0,
			range: {
				'min': min,
				'max': max
			}
		})

		this.textEditor = document.createElement('input')
		this.textEditor.setAttribute('type', 'text')
		this.textEditor.setAttribute('size', float ? '5' : '3')
		this.el.appendChild(this.textEditor)

		const debouncedUpdateSlider = debounce(() => this.updateSlider(), 300)
		const debouncedUpdateTextValue = debounce(() => this.updateSlider(), 50)

		let updating = false
		this.textEditor.addEventListener('input', () => {
			if (updating) return
			updating = true
			this.updateSlider()
			updating = false
			this.updateSlider()
			// debouncedUpdateSlider(); // Call the debounced version of updateSlider
			this._emit() // Continue emitting the event as usual
			this._notifyInputListeners()
		})
		this.textEditor.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.stopPropagation()
			}
		})
		// this.textEditor.addEventListener("focus", () => {
		// 	this.textEditor.select();
		// });
		this.sliderEl.noUiSlider.on('update', () => {
			if (updating) return
			if (!float) {
				this.textEditor.value = Math.round(this.sliderEl.noUiSlider.get())
			} else {
				this.textEditor.value = this.sliderEl.noUiSlider.get()
			}
			updating = false
			this._emit()
			this._notifyInputListeners()
		})

		Object.defineProperty(this.el, 'value', {
			get: () => this.value,
			set: (val) => this.value = val
		})

	}

	_notifyInputListeners() {
		const inputEvent = new Event('input', { bubbles: true })
		this.el.dispatchEvent(inputEvent)
	}

	_emit() {
		for (const fn of this._listeners) {
			fn(this.value)
		}
	}

	onChange(fn) {
		this._listeners.push(fn)
	}

	get value() {
		value = this.float ? this.sliderEl.noUiSlider.get() : Math.round(this.sliderEl.noUiSlider.get())
		return value
	}

	set value(value) {
		this.sliderEl.noUiSlider.set(value)
		this.textEditor.value = value
	}

	updateSlider() {
		this.sliderEl.noUiSlider.set(this.textEditor.value)
	}

	updateTextArea() {
		this.textEditor.value = this.sliderEl.noUiSlider.get()
	}

	replaceElement(element) {
		const target = element
		if (!target) return
		console.log(target)
		target.replaceWith(this.el)
	}
}

