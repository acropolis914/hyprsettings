<script lang="ts">
	import MiniChooser from "@scripts/ConfigRenderer/MiniChooser.svelte"
	import { onMount } from "svelte"
	import { BezierModal } from "@scripts/ConfigRenderer/keyEditor_Bezier"

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
	const easingNames: Item[] = [
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

	let chooserProps = $state({
		value: state.name,
		onChange: (v) => {
			if (updating_bezier) return
			updating_choices = true
			state.name = v
			console.warn(state.name)
			console.warn(`Bezier is not updating. Settings its value`)
			bezierEditor.value = easingDict[state.name] ?? `cubic-bezier,${Math.random()},${Math.random()},${Math.random()},${Math.random()}`
			bezierEditor.animatePreview()
			onChange(v)
			setTimeout(() => {
				updating_choices = false
			})
		},
		orientation: "horizontal",
		items: easingNames
	})

	onMount(() => {
		bezierEditor = new BezierModal(easingDict[state.name] ?? "Linear,0.0,0.0,1.0,1.0", true)
		root.appendChild(bezierEditor.return())
		bezierEditor.onChange((v) => {
			if (updating_choices) return
			updating_bezier = true
			// chooserProps.value = v.split(" ")[0].replace(/^["']|["']$/g, "")
			console.warn(v.split(" ")[0] === "\"cubic-bezier\"", v.split(" ")[0])
			if (v.split(" ")[0] === "\"cubic-bezier\"") {
				console.log(`Bezier is cubic`)
				onChange(v)
			} else {
				console.log(`Bezier not cubic`)
				onChange(v.split(" ")[0])

			}
			setTimeout(() => {
				updating_bezier = false
			}, 10)

		})
	})

	$effect(() => {

	})
</script>


<div bind:this={root} id="niri-curve" class="value-editor">
	<MiniChooser {...chooserProps}></MiniChooser>
</div>


<style lang="scss">
	div {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
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