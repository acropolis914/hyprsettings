// import { debounce } from '../utils.js';
import { debounce } from '../helpers.js'

export class BezierModal {
	constructor(initialValue) {
		this.initialLoad = true
		this._listeners = []
		this._updating = false

		const [name, points] = this.parseValue(initialValue)

		// Main container
		this.el = document.createElement('div')
		this.el.classList.add('generic-editor-beziermodal')

		// Debounced emit for performance
		this._debouncedEmit = debounce(() => this._emit(), 5)
		this._debouncedNotifyInputListeners = debounce(() => this._notifyInputListeners(), 5)

		// ---- Text editor ----
		this.textEditor = document.createElement('input')
		this.textEditor.type = 'text'
		this.textEditor.className = 'bezier-name-input'
		this.textEditor.value = name
		this.el.appendChild(this.textEditor)

		this.textEditor.addEventListener('input', () => {
			if (this._updating) return
			this._debouncedEmit()
			this._debouncedNotifyInputListeners()
		})

		this.textEditor.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') e.stopPropagation()
		})

		// ---- Curve editor ----
		this.curveEditorEl = document.createElement('div')
		this.curveEditorEl.classList.add('curve-editor-el')
		this.el.appendChild(this.curveEditorEl)

		this.curveEditorControls = document.createElement('div')
		this.curveEditorControls.classList.add('controls')
		this.curveEditorEl.appendChild(this.curveEditorControls)

		this.resetButton = document.createElement('button')
		this.resetButton.textContent = 'Reset'
		this.resetButton.addEventListener('click', (e) => {
			this.value = `${this.textEditor.value}, 0.25,0.25,0.75,0.75`
		})
		this.curveEditorControls.appendChild(this.resetButton)

		this.curveEditor = new BezierEditor({
			parent: this.curveEditorEl,
			grid: { major: 0.5, minor: 0.1 },
		})

		this.curveEditor.points = points
		this.curveEditorPreview = new BezierPreview(this.curveEditorEl)
		this._debouncedAnimatePreview = debounce(() => {
			this.animatePreview()
		}, 200)
		this._debouncedAnimatePreview()

		this.curveEditor.onchange = (pts) => {
			if (this._updating) return
			if (this.initialLoad) return
			this._updating = true
			this._debouncedAnimatePreview()
			this._debouncedEmit()
			this._debouncedNotifyInputListeners()
			this._updating = false
		}

		// ---- Initialize value ----
		this.value = initialValue

		// Expose value on the element
		Object.defineProperty(this.el, 'value', {
			get: () => this.value,
			set: (val) => (this.value = val),
		})
		this.initialLoad = false
	}

	parseValue(value) {
		const [name, ...rest] = value.split(',').map((m) => m.trim())
		const points = rest.map((n) => Math.round(Number(n) * 100) / 100)
		return [name, points]
	}

	animatePreview() {
		let curvepoints = this.curveEditor.getYvals(60)
		this.curveEditorPreview.animate(curvepoints, 1000, 2000)
	}
	_notifyInputListeners() {
		if (this.initialLoad) return
		const event = new Event('input', { bubbles: true })
		this.el.dispatchEvent(event)
	}

	_emit() {
		if (this.initialLoad) return
		for (const fn of this._listeners) fn(this.value)
	}

	onChange(fn) {
		this._listeners.push(fn)
	}

	get value() {
		const name = this.textEditor.value
		const points = this.curveEditor.points.map((p) => Math.round(p * 100) / 100).join(',')
		return `${name}, ${points}`
	}

	set value(val) {
		const [name, points] = this.parseValue(val)
		if (this._updating) return
		this._updating = true
		this.textEditor.value = name
		this.curveEditor.points = points.map((p) => Math.round(p * 100) / 100)
		if (!this.initialLoad) {
			this._debouncedEmit()
			this._debouncedNotifyInputListeners()
		}
		this._updating = false
	}

	replaceElement(element) {
		if (!element) return
		element.replaceWith(this.el)
	}
}

// -------------------- BezierEditor --------------------

// Global coordinator singleton (attached to window)
if (!window.__bezierPreviewCoordinator) {
	class BezierPreviewCoordinator {
		constructor() {
			this.instances = new Set()
			this.globalStartTime = null
			this.isRunning = false
		}

		register(instance) {
			this.instances.add(instance)
		}

		unregister(instance) {
			this.instances.delete(instance)
		}

		startAll() {
			this.globalStartTime = performance.now()
			this.isRunning = true
			this.instances.forEach((instance) => instance._startSync())
		}

		resetAll() {
			this.globalStartTime = null
			this.isRunning = false
			this.instances.forEach((instance) => instance._reset())
			requestAnimationFrame(() => this.startAll())
		}

		getGlobalTime() {
			return this.globalStartTime
		}
	}

	window.__bezierPreviewCoordinator = new BezierPreviewCoordinator()
}

// Always use the global instance
const coordinator = window.__bezierPreviewCoordinator

export class BezierPreview {
	constructor(parent) {
		this.parent = parent

		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		this.svg.classList.add('curve-preview')

		this.svg.style.width = '100%'
		this.svg.style.height = '100%'
		this.svg.style.display = 'block'

		this.window = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		this.window.setAttribute('fill', 'var(--accent)')
		this.window.setAttribute('rx', 2)
		this.window.setAttribute('ry', 2)
		this.svg.appendChild(this.window)

		this.parent.appendChild(this.svg)

		this.width = 0
		this.height = 0

		this._resizeTimeout = null
		this._resizeObserver = new ResizeObserver((entries) => {
			clearTimeout(this._resizeTimeout)
			this._resizeTimeout = setTimeout(() => {
				for (const entry of entries) {
					this.width = entry.contentRect.width
					this.height = entry.contentRect.height
				}
			}, 16)
		})
		this._resizeObserver.observe(this.svg)

		this._animationId = null
		this._pauseTimeout = null
		this._yVals = null
		this._duration = 1000
		this._pauseMs = 500
		this._wasHidden = false

		this._intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const isVisible = entry.isIntersecting && this._isParentVisible()

					if (!isVisible && !this._wasHidden) {
						this._wasHidden = true
						this.stopAnimation()
					} else if (isVisible && this._wasHidden) {
						this._wasHidden = false
						coordinator.resetAll()
					}
				})
			},
			{ threshold: 0 },
		)
		this._intersectionObserver.observe(this.svg)

		// Register with global coordinator
		coordinator.register(this)
	}

	_isParentVisible() {
		let el = this.parent
		while (el) {
			const style = window.getComputedStyle(el)
			if (style.display === 'none' || style.visibility === 'hidden') {
				return false
			}
			el = el.parentElement
		}
		return true
	}

	_draw(rectW) {
		const rectH = (rectW * 9) / 16

		const x = (this.width - rectW) / 2
		const y = (this.height - rectH) / 2

		this.window.setAttribute('x', x)
		this.window.setAttribute('y', y)
		this.window.setAttribute('width', rectW)
		this.window.setAttribute('height', rectH)
	}

	_startSync() {
		if (!this._yVals || !this._isParentVisible()) return

		this.stopAnimation()

		const globalStart = coordinator.getGlobalTime()
		let pausedUntil = null

		const loop = (now) => {
			if (!this._isParentVisible()) {
				this._animationId = requestAnimationFrame(loop)
				return
			}

			if (pausedUntil !== null) {
				if (now < pausedUntil) {
					this._animationId = requestAnimationFrame(loop)
					return
				}
				pausedUntil = null
				coordinator.globalStartTime = now
			}

			const elapsed = now - coordinator.getGlobalTime()
			const t = Math.min(elapsed / this._duration, 1)

			const scaled = t * (this._yVals.length - 1)
			const i = Math.floor(scaled)
			const f = scaled - i

			const y0 = this._yVals[i] ?? this._yVals[this._yVals.length - 1]
			const y1 = this._yVals[i + 1] ?? y0
			const y = y0 + (y1 - y0) * f

			const maxW = Math.min(this.width * 0.75, (this.height * 0.75 * 16) / 9)
			this._draw(maxW * y)

			if (t >= 1) {
				pausedUntil = now + this._pauseMs
			}

			this._animationId = requestAnimationFrame(loop)
		}

		this._animationId = requestAnimationFrame(loop)
	}

	_reset() {
		this.stopAnimation()
		if (this._yVals && this._yVals.length > 0) {
			const maxW = Math.min(this.width * 0.75, (this.height * 0.75 * 16) / 9)
			this._draw(maxW * this._yVals[0])
		}
	}

	animate(yVals, duration = 1000, pauseMs = 500) {
		if (!yVals || yVals.length < 2) return

		this._yVals = yVals
		this._duration = duration
		this._pauseMs = pauseMs

		coordinator.startAll()
	}

	stopAnimation() {
		if (this._animationId) {
			cancelAnimationFrame(this._animationId)
			this._animationId = null
		}
		if (this._pauseTimeout) {
			clearTimeout(this._pauseTimeout)
			this._pauseTimeout = null
		}
	}

	destroy() {
		this.stopAnimation()
		this._resizeObserver.disconnect()
		this._intersectionObserver.disconnect()
		clearTimeout(this._resizeTimeout)
		coordinator.unregister(this)
	}
}

export class BezierEditor {
	constructor({ parent, grid = {} }) {
		this.parent = parent

		// Default points
		this._cp1 = { x: 0.25, y: 0.25 }
		this._cp2 = { x: 0.75, y: 0.75 }
		this.dragging = null

		// Grid settings
		this.gridMajor = grid.major || 0.25
		this.gridMinor = grid.minor || 0.05

		// Range
		this.range = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
		this.extended = false

		this.onchange = null

		// Colors
		this.colors = {
			handle1: 'var(--accent, red)',
			handle2: 'var(--accent-success, blue)',
			path: 'var(--text-0, black)',
			border: 'var(--surface-1, #ccc)',
			gridMajor: 'rgba(0,0,0,0.2)',
			gridMinor: 'rgba(0,0,0,0.1)',
			unitSquare: 'rgba(0,0,0,0.05)',
		}

		// Create SVG
		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		this.svg.classList.add('curve-editor')

		// Make SVG fill the flex-allocated space
		this.svg.style.width = '100%'
		this.svg.style.height = '100%'
		this.svg.style.display = 'block'
		this.svg.style.border = `1px solid ${this.colors.border}`
		this.parent.appendChild(this.svg)

		// Unit square
		this.unitSquare = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		this.unitSquare.setAttribute('fill', this.colors.unitSquare)
		this.svg.appendChild(this.unitSquare)

		// Path
		this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		this.path.setAttribute('stroke', this.colors.path)
		this.path.setAttribute('fill', 'none')
		this.path.setAttribute('stroke-width', '2')
		this.svg.appendChild(this.path)

		// Handles
		this.handle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
		this.handle1.setAttribute('r', 8)
		this.handle1.setAttribute('fill', this.colors.handle1)
		this.svg.appendChild(this.handle1)

		this.handle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
		this.handle2.setAttribute('r', 8)
		this.handle2.setAttribute('fill', this.colors.handle2)
		this.svg.appendChild(this.handle2)

		// Grid lines array
		this.gridLines = []

		// Setup drag events
		this._setupEvents()

		// Draw initially
		this._draw()

		// ---------------- ResizeObserver ----------------
		// Watches the SVG's flex-allocated size
		this._resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				const { width, height } = entry.contentRect
				this.width = width
				this.height = height
				this._draw()
			}
		})
		this._resizeObserver.observe(this.svg) // observe the SVG itself
	}

	_draw() {
		if (!this.width || !this.height) return

		const W = this.width
		const H = this.height

		// Extend range if enabled
		if (this.extended) {
			const xMax = Math.max(1, this._cp1.x, this._cp2.x, 1.5)
			const xMin = Math.min(0, this._cp1.x, this._cp2.x, -0.5)
			const yMax = Math.max(1, this._cp1.y, this._cp2.y, 1.5)
			const yMin = Math.min(0, this._cp1.y, this._cp2.y, -0.5)
			this.range = { xMin, xMax, yMin, yMax }
		} else {
			this.range = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
		}

		const scaleX = W / (this.range.xMax - this.range.xMin)
		const scaleY = H / (this.range.yMax - this.range.yMin)

		// Draw unit square
		this.unitSquare.setAttribute('x', (0 - this.range.xMin) * scaleX)
		this.unitSquare.setAttribute('y', H - (1 - this.range.yMin) * scaleY)
		this.unitSquare.setAttribute('width', 1 * scaleX)
		this.unitSquare.setAttribute('height', 1 * scaleY)

		// Remove old grid lines
		this.gridLines.forEach((line) => this.svg.removeChild(line))
		this.gridLines = []

		const addLine = (x1, y1, x2, y2, color, width = 1, dash = null) => {
			const l = document.createElementNS('http://www.w3.org/2000/svg', 'line')
			l.setAttribute('x1', x1)
			l.setAttribute('y1', y1)
			l.setAttribute('x2', x2)
			l.setAttribute('y2', y2)
			l.setAttribute('stroke', color)
			l.setAttribute('stroke-width', width)
			if (dash) l.setAttribute('stroke-dasharray', dash)
			this.svg.appendChild(l)
			this.gridLines.push(l)
		}

		// Draw vertical grid
		for (let gx = Math.ceil(this.range.xMin / this.gridMinor) * this.gridMinor; gx <= this.range.xMax; gx += this.gridMinor) {
			const color = Math.abs(gx % this.gridMajor) < 1e-6 ? this.colors.gridMajor : this.colors.gridMinor
			addLine((gx - this.range.xMin) * scaleX, 0, (gx - this.range.xMin) * scaleX, H, color)
		}

		// Draw horizontal grid
		for (let gy = Math.ceil(this.range.yMin / this.gridMinor) * this.gridMinor; gy <= this.range.yMax; gy += this.gridMinor) {
			const color = Math.abs(gy % this.gridMajor) < 1e-6 ? this.colors.gridMajor : this.colors.gridMinor
			addLine(0, H - (gy - this.range.yMin) * scaleY, W, H - (gy - this.range.yMin) * scaleY, color)
		}

		// Draw Bézier curve
		this.path.setAttribute(
			'd',
			`M${(0 - this.range.xMin) * scaleX},${H - (0 - this.range.yMin) * scaleY} 
			 C ${(this._cp1.x - this.range.xMin) * scaleX},${H - (this._cp1.y - this.range.yMin) * scaleY} 
			   ${(this._cp2.x - this.range.xMin) * scaleX},${H - (this._cp2.y - this.range.yMin) * scaleY} 
			   ${(1 - this.range.xMin) * scaleX},${H - (1 - this.range.yMin) * scaleY}`,
		)

		// Draw handles
		this.handle1.setAttribute('cx', (this._cp1.x - this.range.xMin) * scaleX)
		this.handle1.setAttribute('cy', H - (this._cp1.y - this.range.yMin) * scaleY)
		this.handle2.setAttribute('cx', (this._cp2.x - this.range.xMin) * scaleX)
		this.handle2.setAttribute('cy', H - (this._cp2.y - this.range.yMin) * scaleY)
	}

	_setupEvents() {
		const svg = this.svg
		const isNear = (mx, my, cp) => {
			const scaleX = this.width / (this.range.xMax - this.range.xMin)
			const scaleY = this.height / (this.range.yMax - this.range.yMin)
			return Math.hypot(mx - (cp.x - this.range.xMin) * scaleX, my - (this.height - (cp.y - this.range.yMin) * scaleY)) < 10
		}

		svg.addEventListener('pointerdown', (e) => {
			const rect = svg.getBoundingClientRect()
			const mx = e.clientX - rect.left
			const my = e.clientY - rect.top

			if (isNear(mx, my, this._cp1)) this.dragging = this._cp1
			else if (isNear(mx, my, this._cp2)) this.dragging = this._cp2
		})

		svg.addEventListener('pointermove', (e) => {
			if (!this.dragging) return
			const rect = svg.getBoundingClientRect()
			const mx = e.clientX - rect.left
			const my = e.clientY - rect.top

			const scaleX = this.width / (this.range.xMax - this.range.xMin)
			const scaleY = this.height / (this.range.yMax - this.range.yMin)

			this.dragging.x = Math.max(this.range.xMin, Math.min(this.range.xMax, mx / scaleX + this.range.xMin))
			this.dragging.y = Math.max(this.range.yMin, Math.min(this.range.yMax, (this.height - my) / scaleY + this.range.yMin))

			this._draw()
			if (this.onchange) this.onchange(this.points)
		})

		svg.addEventListener('pointerup', () => (this.dragging = null))
		// svg.addEventListener("pointerleave", () => (this.dragging = null));
	}

	// Getter / setter
	get points() {
		return [this._cp1.x, this._cp1.y, this._cp2.x, this._cp2.y]
	}

	set points([x0, y0, x1, y1]) {
		this._cp1.x = x0
		this._cp1.y = y0
		this._cp2.x = x1
		this._cp2.y = y1
		this._draw()
		if (this.onchange) this.onchange(this.points)
	}

	/**
	 * Returns an array of Y values for evenly spaced X samples along the curve.
	 * @param {number} steps - how many samples you want (integer)
	 * @returns {number[]} - array of Y values, length = steps + 1
	 */
	getYvals(steps = 20) {
		if (steps <= 0) return []

		const yVals = []
		for (let i = 0; i <= steps; i++) {
			const t = i / steps
			const y =
				Math.pow(1 - t, 3) * 0 + // P0.y
				3 * Math.pow(1 - t, 2) * t * this._cp1.y + // P1.y
				3 * (1 - t) * Math.pow(t, 2) * this._cp2.y + // P2.y
				Math.pow(t, 3) * 1 // P3.y
			yVals.push(y)
		}
		return yVals
	}

	extend(bool) {
		this.extended = !!bool
		this._draw()
	}
}
