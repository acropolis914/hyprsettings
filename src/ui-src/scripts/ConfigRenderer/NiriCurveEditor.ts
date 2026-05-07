import { BezierModal } from '@scripts/ConfigRenderer/keyEditor_Bezier'

interface EasingItem {
	name: string
	description: string
}

export class CurveEditor {
	private root: HTMLDivElement
	private select: HTMLSelectElement
	private bezierEditor: any

	private updating_bezier = false
	private updating_choices = false
	private state: { name: string }

	private easingDict: Record<string, string> = {
		'ease-out-quad': 'ease-out-quad,0.25,0.46,0.45,0.94',
		'ease-out-cubic': 'ease-out-cubic,0.22,0.61,0.36,1.0',
		'ease-out-expo': 'ease-out-expo,0.16,1,0.3,1',
		linear: 'linear,0.0,0.0,1.0,1.0',
	}

	private easingNames: EasingItem[] = [
		{ name: 'ease-out-quad', description: 'Decelerating to zero velocity (quadratic easing)' },
		{ name: 'ease-out-cubic', description: 'Smooth deceleration with a cubic curve' },
		{ name: 'ease-out-expo', description: 'Fast start with exponential slowdown' },
		{ name: 'linear', description: 'Constant speed with no easing' },
		{ name: 'cubic-bezier', description: 'Custom easing defined by control points' },
	]

	constructor(
		initialValue: string,
		private onChange: (val: string) => void,
	) {
		const name = initialValue
			.trim()
			.split(' ')[0]
			.replace(/^["']|["']$/g, '')
		this.state = { name }

		// Create Container
		this.root = document.createElement('div')
		this.root.id = 'niri-curve'
		this.root.className = 'value-editor'
		this.applyStyles()

		// Create Select (Replacing MiniChooser)
		this.select = document.createElement('select')
		this.easingNames.forEach((item) => {
			const opt = document.createElement('option')
			opt.value = item.name
			opt.textContent = item.name
			opt.title = item.description
			if (item.name === this.state.name) opt.selected = true
			this.select.appendChild(opt)
		})

		this.select.addEventListener('change', () => this.handleSelectChange())
		this.root.appendChild(this.select)

		// Initialize Bezier Modal
		this.initBezier()
	}

	private initBezier() {
		const initialCurve = this.easingDict[this.state.name] ?? 'cubic-bezier,0.0,0.0,1.0,1.0'
		this.bezierEditor = new BezierModal(initialCurve, true)

		this.root.appendChild(this.bezierEditor.return())

		this.bezierEditor.onChange((v: string) => {
			if (this.updating_choices) return
			this.updating_bezier = true

			const val = v.split(' ')[0].replace(/^["']|["']$/g, '')
			this.state.name = val
			this.select.value = val

			if (v.split(' ')[0] === '"cubic-bezier"') {
				this.onChange(v)
				this.select.value = 'cubic-bezier'
			} else {
				this.onChange(v.split(' ')[0])
			}

			this.updating_bezier = false
		})
	}

	private handleSelectChange() {
		const v = this.select.value
		if (this.updating_bezier || this.state.name === v) return

		this.updating_choices = true
		this.state.name = v

		const curveString = this.easingDict[v] ?? `cubic-bezier,0.5,0.5,0.5,0.5`
		this.bezierEditor.value = curveString
		this.bezierEditor.animatePreview()

		this.onChange(v)
		this.updating_choices = false
	}

	private applyStyles() {
		// Applying the SCSS logic via JS properties
		Object.assign(this.root.style, {
			display: 'flex',
			flexDirection: 'column',
			gap: '10px',
			width: '100%',
			height: '100%',
		})
	}

	public mount(parent: HTMLElement) {
		parent.appendChild(this.root)
	}
}
