<script lang="ts">
	let ButtonInc
	let ButtonDec
	import { onMount } from "svelte"

	type OptionProps = {
		min?: number,
		max?: number,
		step?: number,
	}
	let { initialValue, options, onChange }: {
		initialValue: number,
		options: OptionProps,
		onChange: (val: number) => void
	} = $props()
	let state = $state({ value: parseInt(initialValue) })
	let last_allowed_value: number
	$effect(() => {
		if (state.value || state.value === 0) {
			onChange(state.value)
			last_allowed_value = state.value
		} else {
			setTimeout(() => {
				state.value = last_allowed_value
			}, 3000)
			// state.value = last_allowed_value
		}

	})

	onMount(() => {
		if (ButtonDec) {
			ButtonDec.addEventListener("click", (e) => {
				e.stopPropagation()
				state.value -= (options.step || 1)
			})
			ButtonDec.addEventListener("dblclick", (e) => {
				e.stopPropagation()
			})
		}
		if (ButtonInc) {
			ButtonInc.addEventListener("click", (e) => {
				e.stopPropagation()
				state.value += (options.step || 1)
			})
			ButtonInc.addEventListener("dblclick", (e) => {
				e.stopPropagation()
			})
		}
	})

</script>

<div id="" class="generic-key key-editor-inline">
	<input type="number" bind:value={state.value}>
	<button id="dec" bind:this={ButtonDec}>
		
	</button>
	<button id="inc" bind:this={ButtonInc}>
		
	</button>
</div>

<style>
	div {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex: 1;
		height: 2rem;
		transition: opacity 500ms ease;
	}

	input {
		border-top-left-radius: var(--border-rad);
		border-bottom-left-radius: var(--border-rad);
		border-top-right-radius: 0 !important;
		border-bottom-right-radius: 0 !important;
		flex: 1 0 auto;
		text-align: center;
		-moz-appearance: textfield;
		height: 100%;
		max-width: 5ch;
		border: none;
		/*background-color: transparent;*/
		background-color: var(--surface-1);
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	button {
		border-radius: 0px;
		height: 100%;
		aspect-ratio: 1/1;
		background-color: var(--surface-1);
		padding: 0;
		color: var(--text-2);

		&:focus {
			outline: 2px solid var(--text-1);
			z-index: 10;
		}

		&:hover {

			background-color: var(--accent-hover);
			color: var(--text-contrast);
		}

		&:active {
			transform: scale(0.95);
		}
	}

	button#inc {
		border-top-right-radius: var(--border-rad);
		border-bottom-right-radius: var(--border-rad);
	}
</style>