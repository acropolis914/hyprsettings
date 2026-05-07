<script lang="ts">
	import MiniChooser from "@scripts/ConfigRenderer/MiniChooser.svelte"
	import { onMount } from "svelte"
	import { BezierModal } from "@scripts/ConfigRenderer/keyEditor_Bezier"
	import { MiniChooserTS } from "@scripts/ConfigRenderer/MiniChooser.ts"

	let { initialValue, onChange } = $props()
	let name = initialValue.trim().split(" ")[0].replace(/^["']|["']$/g, "")
	console.log(name)
	let state = $state({ name: name })

	let root
	let bezierEditor
	let updating_bezier: boolean = false
	let updating_choices: boolean = false

	const easingDict = {
		"ease-out-quad": "ease-out-quad,0.25,0.46,0.45,0.94",
		"ease-out-cubic": "ease-out-cubic,0.22,0.61,0.36,1.0",
		"ease-out-expo": "ease-out-expo,0.16,1,0.3,1",
		"linear": "linear,0.0,0.0,1.0,1.0"
	}

	interface item {
		name: string,
		description: string,
	}

	const easingNames: item[] = [
		{
			name: "ease-out-quad",
			description: "Decelerating to zero velocity (quadratic easing)"
		},
		{
			name: "ease-out-cubic",
			description: "Smooth deceleration with a cubic curve"
		},
		{
			name: "ease-out-expo",
			description: "Fast start with exponential slowdown"
		},
		{
			name: "linear",
			description: "Constant speed with no easing"
		},
		{
			name: "cubic-bezier",
			description: "Custom easing defined by control points"
		}

	]
	let lastCubicBezier = `cubic-bezier,0.0,${Math.random()},1.0,${Math.random()}`
	let chooserProps = $state({
		value: state.name,
		onChange: (v) => {
			updating_choices = true
			state.name = v
			if (!updating_bezier) {
				console.log("Choices updated, updating bezier")
				bezierEditor.value = easingDict[state.name] ?? lastCubicBezier
			}
			bezierEditor.animatePreview()
			onChange(v)
			setTimeout(() => {
				updating_choices = false
			}, 10)

		},
		orientation: "horizontal",
		items: easingNames
	})

	onMount(() => {
		const miniChooser = new MiniChooserTS(root, chooserProps.items, state.name, chooserProps.onChange, "horizontal")

		bezierEditor = new BezierModal(easingDict[state.name] ?? "cubic-bezier,0.0,0.0,1.0,1.0", true)
		root.appendChild(bezierEditor.return())
		bezierEditor.onChange((v) => {
			updating_bezier = true
			const val = v.split(/[, ]/)[0].replace(/^["']|["']$/g, "")
			state.name = val
			if (!updating_choices) {
				console.log("Bezier updated, updating choices")
				lastCubicBezier = v
				miniChooser.set("cubic-bezier")
			}

			if (v.split(/[, ]/)[0] === "\"cubic-bezier\"") {
				onChange(v)
			} else {
				onChange(v.split(/[, ]/)[0])
			}
			setTimeout(() => {
				updating_bezier = false
			})

		})
	})

</script>


<div bind:this={root} id="niri-curve" class="value-editor">
</div>


<style lang="scss">
	div {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		height: 100%;
		//flex-direction: row;
	}

	.chooser-modal {
		height: 100px !important;
		min-height: 100px !important;
	}

	.generic-editor-beziermodal {
		width: 100%;
	}
</style>