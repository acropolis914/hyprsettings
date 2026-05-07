// import { debounce } from '../utils.js';
import { debounce } from '../utils/helpers.js'
import { GLOBAL } from '@scripts/GLOBAL.ts'

export class BezierModal {
	constructor(initialValue, hideName = false) {
		this.initialLoad = true
		this._listeners = []
		this._updating = false

		const [name, points] = this.parseValue(initialValue)

		// Main container
		this.el = document.createElement('div')
		this.el.id = 'generic-value'
		this.el.classList.add('generic-editor-beziermodal')

		// Debounced emit for performance
		this._debouncedEmit = debounce(() => this._emit(), 5)
		this._debouncedNotifyInputListeners = debounce(() => this._notifyInputListeners(), 5)

		// ---- Text editor ----
		this.textEditor = document.createElement('input')
		this.textEditor.type = 'text'
		this.textEditor.className = 'bezier-name-input'
		this.textEditor.value = name
		if (hideName) {
			this.textEditor.classList.add('hidden')
		}
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

		this.value = initialValue
		// Expose value on the element
		Object.defineProperty(this.el, 'value', {
			get: () => this.value,
			set: (val) => (this.value = val),
		})
		this.initialLoad = false
	}

	parseValue(value) {
		if (value.trim().includes('"') && value.trim().includes(' ') && !value.trim().includes(',')) {
			let [name, ...rest] = value
				.trim()
				.split(' ')
				.map((i) => i.trim())
			name = name.replace('"', '')
			const points = rest.map((n) => Math.round(Number(n) * 100) / 100)
			return [name, points]
		} else {
			const [name, ...rest] = value.split(',').map((m) => m.trim())
			const points = rest.map((n) => Math.round(Number(n) * 100) / 100)
			return [name, points]
		}
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
		if (GLOBAL.mode === 'hyprland') {
			const name = this.textEditor.value
			const points = this.curveEditor.points.map((p) => Math.round(p * 100) / 100).join(',')
			return `${name}, ${points}`
		}
		if (GLOBAL.mode === 'niri') {
			const name_ = this.textEditor.value
			const points = this.curveEditor.points.map((p) => Math.round(p * 100) / 100).join(' ')
			return `"${name_}" ${points}`
		}
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

	return() {
		return this.el
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
		this.svg.style.transform = 'translateZ(0)'

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
		this._cp1 = { x: 0.25, y: 0.25 }
		this._cp2 = { x: 0.75, y: 0.75 }
		this.dragging = null

		this.gridMajor = grid.major || 0.5
		this.gridMinor = grid.minor || 0.1
		this.range = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
		this.extended = true
		this.onchange = null

		this.colors = {
			handle1: 'var(--accent, red)',
			handle2: 'var(--accent-success, blue)',
			path: 'var(--text-0, black)',
			border: 'var(--surface-1, #ccc)',
			gridMajor: 'rgba(0,0,0,0.2)',
			gridMinor: 'rgba(0,0,0,0.1)',
			unitSquare: 'rgba(0,0,0,0.2)',
		}

		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		this.svg.classList.add('curve-editor')
		// this.svg.style.height = '100%'
		// this.svg.style.display = 'block'
		this.svg.style.border = `1px solid ${this.colors.border}`

		// WebKit optimization: promote to layer
		this.svg.style.transform = 'translateZ(0)'

		this.parent.appendChild(this.svg)

		// --- NEW: Grid Pattern Setup ---
		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
		defs.innerHTML = `
            <pattern id="gridMinorPattern" width="${this.gridMinor}" height="${this.gridMinor}" patternContentUnits="objectBoundingBox">
                <path d="M ${this.gridMinor} 0 L 0 0 0 ${this.gridMinor}" fill="none" stroke="${this.colors.gridMinor}" stroke-width="0.01"/>
            </pattern>
            <pattern id="gridMajorPattern" width="${this.gridMajor}" height="${this.gridMajor}" patternContentUnits="objectBoundingBox">
                <rect width="1" height="1" fill="url(#gridMinorPattern)"/>
                <path d="M ${this.gridMajor} 0 L 0 0 0 ${this.gridMajor}" fill="none" stroke="${this.colors.gridMajor}" stroke-width="0.015"/>
            </pattern>
        `
		this.svg.appendChild(defs)

		this.unitSquare = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		this.unitSquare.setAttribute('fill', this.colors.unitSquare)
		this.unitSquare.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)')
		this.unitSquare.setAttribute('stroke-width', '1')
		this.svg.appendChild(this.unitSquare)

		// Grid Background Rect
		this.gridRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		this.gridRect.setAttribute('fill', 'url(#gridMajorPattern)')
		this.gridRect.setAttribute('width', '100%')
		this.gridRect.setAttribute('height', '100%')
		this.svg.appendChild(this.gridRect)

		this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		this.path.setAttribute('stroke', this.colors.path)
		this.path.setAttribute('fill', 'none')
		this.path.setAttribute('stroke-width', '2')
		this.svg.appendChild(this.path)

		this.line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
		this.line1.setAttribute('stroke', this.colors.handle1)
		this.line1.setAttribute('stroke-width', '2')
		this.line1.setAttribute('stroke-dasharray', '4,4')
		this.svg.appendChild(this.line1)

		this.line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
		this.line2.setAttribute('stroke', this.colors.handle2)
		this.line2.setAttribute('stroke-width', '1')
		this.line2.setAttribute('stroke-dasharray', '4,4')
		this.svg.appendChild(this.line2)

		this.handle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
		this.handle1.setAttribute('r', 6)
		this.handle1.setAttribute('fill', this.colors.handle1)
		this.svg.appendChild(this.handle1)

		this.handle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
		this.handle2.setAttribute('r', 6)
		this.handle2.setAttribute('fill', this.colors.handle2)
		this.svg.appendChild(this.handle2)

		this.gridLines = [] // Kept for legacy parity, but unused
		this._ticking = false

		this._setupEvents()
		this._draw()

		this._resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				this.width = entry.contentRect.width
				this.height = entry.contentRect.height
				this._draw()
			}
		})
		this._resizeObserver.observe(this.svg)
	}

	_draw() {
		if (!this.width || !this.height || this._ticking) return

		this._ticking = true
		requestAnimationFrame(() => {
			const W = this.width
			const H = this.height

			if (this.extended) {
				const EXTENSION = 0.25
				const xMax = Math.max(1, this._cp1.x, this._cp2.x, 1 + EXTENSION)
				const xMin = Math.min(0, this._cp1.x, this._cp2.x, -EXTENSION)
				const yMax = Math.max(1, this._cp1.y, this._cp2.y, 1 + EXTENSION)
				const yMin = Math.min(0, this._cp1.y, this._cp2.y, -EXTENSION)
				this.range = { xMin, xMax, yMin, yMax }
			} else {
				this.range = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
			}

			const scaleX = W / (this.range.xMax - this.range.xMin)
			const scaleY = H / (this.range.yMax - this.range.yMin)
			const tx = (x) => (x - this.range.xMin) * scaleX
			const ty = (y) => H - (y - this.range.yMin) * scaleY

			// Update Unit Square
			this.unitSquare.setAttribute('x', tx(0))
			this.unitSquare.setAttribute('y', ty(1))
			this.unitSquare.setAttribute('width', 1 * scaleX)
			this.unitSquare.setAttribute('height', 1 * scaleY)

			// Update Handle Lines
			this.line1.setAttribute('x1', tx(0))
			this.line1.setAttribute('y1', ty(0))
			this.line1.setAttribute('x2', tx(this._cp1.x))
			this.line1.setAttribute('y2', ty(this._cp1.y))

			this.line2.setAttribute('x1', tx(1))
			this.line2.setAttribute('y1', ty(1))
			this.line2.setAttribute('x2', tx(this._cp2.x))
			this.line2.setAttribute('y2', ty(this._cp2.y))

			// Update Bezier Path
			this.path.setAttribute(
				'd',
				`M${tx(0)},${ty(0)} C ${tx(this._cp1.x)},${ty(this._cp1.y)} ${tx(this._cp2.x)},${ty(this._cp2.y)} ${tx(1)},${ty(1)}`,
			)

			// Update Handles
			this.handle1.setAttribute('cx', tx(this._cp1.x))
			this.handle1.setAttribute('cy', ty(this._cp1.y))
			this.handle2.setAttribute('cx', tx(this._cp2.x))
			this.handle2.setAttribute('cy', ty(this._cp2.y))

			this._ticking = false
		})
	}

	_setupEvents() {
		const svg = this.svg
		const getCoords = (e) => {
			const rect = svg.getBoundingClientRect()
			let pctX = (e.clientX - rect.left) / rect.width
			let pctY = (e.clientY - rect.top) / rect.height
			pctX = Math.max(0, Math.min(1, pctX))
			pctY = Math.max(0, Math.min(1, 1 - pctY))
			return {
				x: this.range.xMin + pctX * (this.range.xMax - this.range.xMin),
				y: this.range.yMin + pctY * (this.range.yMax - this.range.yMin),
			}
		}

		const setupHandle = (handle, pointReference) => {
			handle.style.cursor = 'grab'
			handle.style.touchAction = 'none'
			handle.addEventListener('pointerdown', (e) => {
				this.dragging = pointReference
				handle.setPointerCapture(e.pointerId)
				handle.style.cursor = 'grabbing'
				const coords = getCoords(e)
				this.dragging.x = coords.x
				this.dragging.y = coords.y
				this._draw()
				e.preventDefault()
				e.stopPropagation()
			})

			handle.addEventListener('pointermove', (e) => {
				if (this.dragging !== pointReference) return
				const coords = getCoords(e)
				this.dragging.x = coords.x
				this.dragging.y = coords.y
				this._draw()
				if (this.onchange) this.onchange(this.points)
			})

			const endDrag = (e) => {
				if (this.dragging === pointReference) {
					this.dragging = null
					handle.releasePointerCapture(e.pointerId)
					handle.style.cursor = 'grab'
				}
			}
			handle.addEventListener('pointerup', endDrag)
			handle.addEventListener('pointercancel', endDrag)
		}

		setupHandle(this.handle1, this._cp1)
		setupHandle(this.handle2, this._cp2)
		svg.addEventListener('dragstart', (e) => e.preventDefault())
	}

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

	getYvals(steps = 60) {
		if (steps <= 0) return []
		const yVals = []
		for (let i = 0; i <= steps; i++) {
			const t = i / steps
			const y =
				Math.pow(1 - t, 3) * 0 +
				3 * Math.pow(1 - t, 2) * t * this._cp1.y +
				3 * (1 - t) * Math.pow(t, 2) * this._cp2.y +
				Math.pow(t, 3) * 1
			yVals.push(y)
		}
		return yVals
	}

	extend(bool) {
		this.extended = !!bool
		this._draw()
	}
}
