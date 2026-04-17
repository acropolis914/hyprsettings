<script>
	let { initial_value, onChange } = $props()
	let state = $state({ value: initial_value })
	$effect(() => {
		onChange(state.value)
	})


</script>

<div id="color-editor" tabIndex="0">
	<img src="/assets/transparent.png" alt="">
	<input type="text" data-coloris bind:value={state.value} tabindex="-1" />
</div>

<style lang="scss">
	#color-editor {
		display: grid;
		grid-template-columns:1fr;

		> * {
			grid-area: 1/1;
		}
	}
</style>