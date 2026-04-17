<script lang="ts">
	import { onMount } from "svelte"
	import { parseHyprColor } from "@scripts/HyprlandSpecific/colorparser"

	let { initial_value, onChange } = $props()
	const num = Number(initial_value)
	let parsedColor = Number.isNaN(num) ? parseHyprColor(initial_value) : parseHyprColor(initial_value)
	let state = $state({ value: parsedColor })
	let modal: HTMLDivElement = null
	let colorPreview: HTMLDivElement = null
	let initialLoad = true
	$effect(() => {
		onChange(state.value)
		colorPreview.style.backgroundColor = state.value
	})
	onMount(() => {
		setTimeout(() => {
			initialLoad = false
		}, 10)
	})

</script>

<div id="color-editor" tabIndex="0" bind:this={modal} data-value={state.value}>
	<div id="background-wrapper"><img src="/assets/transparent.png" alt="" /></div>
	<div id="color-preview" bind:this={colorPreview}></div>
	<input type="text" data-coloris bind:value={state.value} tabindex="-1" />
</div>

<style lang="scss">
	#color-editor {
		flex: 1;
		display: grid;
		grid-template-columns:1fr;
		height: 20px;
		//overflow: hidden;
		#background-wrapper {
			overflow: hidden;

			img {
				max-width: 100%;
				height: auto;
			}
		}

		[data-coloris] {
			opacity: 0;
		}

		> * {
			grid-area: 1/1;
		}
	}
</style>