import { debounce } from '../utils.js'

export class BezierModal {
	constructor(initialValue) {
		this._listeners = []
		this._updating = false

		let [name, points] = this.parseValue(initialValue)

		this.el = document.createElement('div')
		this.el.classList.add('generic-editor-beziermodal')

		// Debounced emit for performance
		this._debouncedEmit = debounce(() => this._emit(), 300)
		this._debouncedNotifyInputListeners = debounce(() => this._notifyInputListeners(), 300)

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
		this.curveEditorEl.classList.add('curve-editor')
		this.el.appendChild(this.curveEditorEl)

		this.curveEditor = new BezierEditor({
			parent: this.curveEditorEl,
			width: 200,
			height: 200,
			grid: { major: 0.25, minor: 0.05 }
		})

		this.curveEditor.points = points

		this.curveEditor.onchange = (pts) => {
			if (this._updating) return
			this._updating = true
			// this.textEditor.value = this.textEditor.value // keep name as is
			this._debouncedEmit()
			this._debouncedNotifyInputListeners()
			this._updating = false
		}

		// ---- Initialize value ----
		this.value = initialValue

		// Expose value on the element
		Object.defineProperty(this.el, 'value', {
			get: () => this.value,
			set: (val) => (this.value = val)
		})
	}

	parseValue(value) {
		const [name, ...rest] = value.split(',').map(m => m.trim())
		const points = rest.map(n => Math.round(Number(n) * 100) / 100)
		return [name, points]
	}

	_notifyInputListeners() {
		const event = new Event('input', { bubbles: true })
		this.el.dispatchEvent(event)
	}

	_emit() {
		for (const fn of this._listeners) fn(this.value)
	}

	onChange(fn) {
		this._listeners.push(fn)
	}

	get value() {
		const name = this.textEditor.value
		const points = this.curveEditor.points.map(p => Math.round(p * 100) / 100).join(',')
		return `${name}, ${points}`
	}

	set value(val) {
		const [name, points] = this.parseValue(val)
		if (this._updating) return

		this._updating = true
		this.textEditor.value = name
		this.curveEditor.points = points.map(p => Math.round(p * 100) / 100)
		this._debouncedEmit()
		this._debouncedNotifyInputListeners()
		this._updating = false
	}

	replaceElement(element) {
		if (!element) return
		element.replaceWith(this.el)
	}
}




class BezierEditor {
	constructor({ parent, width = 400, height = 400, onchange = null, grid = {} }) {
		this.parent = parent;
		this.width = width;
		this.height = height;
		this.onchange = onchange;

		// CSS vars
		this.colors = {
			handle1: "var(--accent, red)",
			handle2: "var(--accent-success, blue)",
			path: "var(--text-0, black)",
			border: "var(--surface-1, #ccc)",
			gridMajor: "rgba(0,0,0,0.2)",
			gridMinor: "rgba(0,0,0,0.1)",
			unitSquare: "rgba(0,0,0,0.05)"
		};

		this.BBOX_THICKNESS = 3
		// Control points in 0..1
		this._cp1 = { x: 0.25, y: 0.25 };
		this._cp2 = { x: 0.75, y: 0.75 };
		this.dragging = null;

		// Grid options
		this.gridMajor = grid.major || 0.25; // default major every 0.25
		this.gridMinor = grid.minor || 0.05; // default minor every 0.05

		// Coordinate range
		this.range = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
		this.extended = false;

		// Create SVG
		this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		this.svg.classList.add("curve-editor");
		this.svg.setAttribute("width", this.width);
		this.svg.setAttribute("height", this.height);
		this.svg.style.border = `1px solid ${this.colors.border}`;
		this.parent.appendChild(this.svg);

		// Unit square background
		this.unitSquare = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		this.unitSquare.setAttribute("fill", this.colors.unitSquare);
		this.svg.appendChild(this.unitSquare);

		// Grid lines
		this.gridLines = [];
		this._createGridLines();

		// Path
		this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		this.path.setAttribute("stroke", this.colors.path);
		this.path.setAttribute("fill", "none");
		this.path.setAttribute("stroke-width", "2");
		this.svg.appendChild(this.path);

		// Handles
		this.handle1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		this.handle1.setAttribute("r", 8);
		this.handle1.setAttribute("fill", this.colors.handle1);
		this.svg.appendChild(this.handle1);

		this.handle2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		this.handle2.setAttribute("r", 8);
		this.handle2.setAttribute("fill", this.colors.handle2);
		this.svg.appendChild(this.handle2);

		this._draw();
		this._setupEvents();
	}

	// Internal draw
	_draw() {
		const W = this.width;
		const H = this.height;

		// Extend range if any control point is out of [0,1] and extend flag is true
		if (this.extended) {
			const xMax = Math.max(1, this._cp1.x, this._cp2.x, 1.5);
			const xMin = Math.min(0, this._cp1.x, this._cp2.x, -0.5);
			const yMax = Math.max(1, this._cp1.y, this._cp2.y, 1.5);
			const yMin = Math.min(0, this._cp1.y, this._cp2.y, -0.5);
			this.range = { xMin, xMax, yMin, yMax };
		} else {
			this.range = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
		}

		const scaleX = W / (this.range.xMax - this.range.xMin);
		const scaleY = H / (this.range.yMax - this.range.yMin);

		// Draw unit square [0,0]-[1,1]
		this.unitSquare.setAttribute("x", (0 - this.range.xMin) * scaleX);
		this.unitSquare.setAttribute("y", H - (1 - this.range.yMin) * scaleY);
		this.unitSquare.setAttribute("width", 1 * scaleX);
		this.unitSquare.setAttribute("height", 1 * scaleY);

		// Draw grid lines
		this.gridLines.forEach(line => this.svg.removeChild(line));
		this.gridLines = [];

		const addLine = (x1, y1, x2, y2, color, width = 1, dash = null) => {
			const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
			l.setAttribute("x1", x1);
			l.setAttribute("y1", y1);
			l.setAttribute("x2", x2);
			l.setAttribute("y2", y2);
			l.setAttribute("stroke", color);
			l.setAttribute("stroke-width", width);
			if (dash) l.setAttribute("stroke-dasharray", dash);
			this.svg.appendChild(l);
			this.gridLines.push(l);
		};

		for (let gx = Math.ceil(this.range.xMin / this.gridMinor) * this.gridMinor; gx <= this.range.xMax; gx += this.gridMinor) {
			const color = (Math.abs(gx % this.gridMajor) < 1e-6) ? this.colors.gridMajor : this.colors.gridMinor;
			addLine((gx - this.range.xMin) * scaleX, 0, (gx - this.range.xMin) * scaleX, H, color);
		}
		for (let gy = Math.ceil(this.range.yMin / this.gridMinor) * this.gridMinor; gy <= this.range.yMax; gy += this.gridMinor) {
			const color = (Math.abs(gy % this.gridMajor) < 1e-6) ? this.colors.gridMajor : this.colors.gridMinor;
			addLine(0, H - (gy - this.range.yMin) * scaleY, W, H - (gy - this.range.yMin) * scaleY, color);
		}

		// Draw Bézier curve
		this.path.setAttribute(
			"d",
			`M${(0 - this.range.xMin) * scaleX},${H - (0 - this.range.yMin) * scaleY} 
       C ${(this._cp1.x - this.range.xMin) * scaleX},${H - (this._cp1.y - this.range.yMin) * scaleY} 
         ${(this._cp2.x - this.range.xMin) * scaleX},${H - (this._cp2.y - this.range.yMin) * scaleY} 
         ${(1 - this.range.xMin) * scaleX},${H - (1 - this.range.yMin) * scaleY}`
		);

		// Draw handles
		this.handle1.setAttribute("cx", (this._cp1.x - this.range.xMin) * scaleX);
		this.handle1.setAttribute("cy", H - (this._cp1.y - this.range.yMin) * scaleY);
		this.handle2.setAttribute("cx", (this._cp2.x - this.range.xMin) * scaleX);
		this.handle2.setAttribute("cy", H - (this._cp2.y - this.range.yMin) * scaleY);

		// Draw dotted lines from 0,0 → cp1 and 1,1 → cp2
		addLine((0 - this.range.xMin) * scaleX, H - (0 - this.range.yMin) * scaleY,
			(this._cp1.x - this.range.xMin) * scaleX, H - (this._cp1.y - this.range.yMin) * scaleY,
			"gray", 1, "4,4");
		addLine((1 - this.range.xMin) * scaleX, H - (1 - this.range.yMin) * scaleY,
			(this._cp2.x - this.range.xMin) * scaleX, H - (this._cp2.y - this.range.yMin) * scaleY,
			"gray", 1, "4,4");

		// Draw thicker bounding box for [0,0]-[1,1] if range is not [0,1]
		if (this.range.xMin < 0 || this.range.xMax > 1 || this.range.yMin < 0 || this.range.yMax > 1) {
			addLine((0 - this.range.xMin) * scaleX, H - (0 - this.range.yMin) * scaleY,
				(1 - this.range.xMin) * scaleX, H - (0 - this.range.yMin) * scaleY,
				"black", this.BBOX_THICKNESS);
			addLine((1 - this.range.xMin) * scaleX, H - (0 - this.range.yMin) * scaleY,
				(1 - this.range.xMin) * scaleX, H - (1 - this.range.yMin) * scaleY,
				"black", this.BBOX_THICKNESS);
			addLine((1 - this.range.xMin) * scaleX, H - (1 - this.range.yMin) * scaleY,
				(0 - this.range.xMin) * scaleX, H - (1 - this.range.yMin) * scaleY,
				"black", this.BBOX_THICKNESS);
			addLine((0 - this.range.xMin) * scaleX, H - (1 - this.range.yMin) * scaleY,
				(0 - this.range.xMin) * scaleX, H - (0 - this.range.yMin) * scaleY,
				"black", this.BBOX_THICKNESS);
		}
	}


	// Dragging setup
	_setupEvents() {
		const svg = this.svg;
		const isNear = (mx, my, cp) => {
			const scaleX = this.width / (this.range.xMax - this.range.xMin);
			const scaleY = this.height / (this.range.yMax - this.range.yMin);
			return Math.hypot(mx - (cp.x - this.range.xMin) * scaleX, my - (this.height - (cp.y - this.range.yMin) * scaleY)) < 10;
		};

		svg.addEventListener("mousedown", e => {
			const rect = svg.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			if (isNear(mx, my, this._cp1)) this.dragging = this._cp1;
			else if (isNear(mx, my, this._cp2)) this.dragging = this._cp2;
		});

		svg.addEventListener("mousemove", e => {
			if (!this.dragging) return;
			const rect = svg.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			const scaleX = this.width / (this.range.xMax - this.range.xMin);
			const scaleY = this.height / (this.range.yMax - this.range.yMin);

			this.dragging.x = Math.max(this.range.xMin, Math.min(this.range.xMax, mx / scaleX + this.range.xMin));
			this.dragging.y = Math.max(this.range.yMin, Math.min(this.range.yMax, (this.height - my) / scaleY + this.range.yMin));

			this._draw();
			if (this.onchange) this.onchange(this.points);
		});

		svg.addEventListener("mouseup", () => (this.dragging = null));
		svg.addEventListener("mouseleave", () => (this.dragging = null));
	}

	// Getter / setter [x0,y0,x1,y1]
	get points() {
		return [this._cp1.x, this._cp1.y, this._cp2.x, this._cp2.y];
	}

	set points([x0, y0, x1, y1]) {
		this._cp1.x = x0; this._cp1.y = y0;
		this._cp2.x = x1; this._cp2.y = y1;
		this._draw();
		if (this.onchange) this.onchange(this.points);
	}
	_createGridLines() {
		// placeholder, does nothing because _draw handles grid dynamically
		this.gridLines = [];
	}


	// Extend range toggle
	extend(bool) {
		this.extended = !!bool;
		this._draw();
	}
}
