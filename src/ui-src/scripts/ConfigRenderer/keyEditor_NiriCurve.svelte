<script lang="ts">
	import nameEditor_Chooser from "@scripts/ConfigRenderer/nameEditor_Chooser.svelte"
	import { onMount } from "svelte"

	let { initialValue, onChange } = $props()
	let name = initialValue.trim().split()[0]
	let state = $state({ name: name })

	let root
	const easingNames = [
		"ease-out-quad",
		"ease-out-cubic",
		"ease-out-expo",
		"linear",
		"cubic-bezier"
	]
	onMount(() => {
		mount(nameEditor_Chooser, {
			target: root,
			props: {
				value: name,
				onChange: (v) => {
					state.name = `"${v}"`
				},
				orientation: "vertical",
				items: easingNames
			}
		})
	})
</script>


<div bind:this={root} id="niri-curve" class="value-editor">

</div>