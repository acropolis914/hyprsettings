<!--const menu = mount(ContextMenu, {-->
<!--target: document.body,-->
<!--props: menuState,-->
<!--})-->

<script lang="ts">
	import { onMount } from "svelte"

	type Props = {
		inputValue: string,
		onChange: (value: string) => void,
	}
	let { inputValue, onChange }: Props = $props()
	let parts = inputValue.split(",").map((i: string) => i.trim())
	let state = $state({
		name: parts[0] ?? "",
		enabled: parts[1] === "1",
		speed: Number(parts[2]),
		curve: parts[3],
		style: parts[4]
	})
	let initialized = false
	onMount(() => {
		initialized = true
	})
	let value = $derived(`${state.name}, ${state.enabled ? "1" : "0"}, ${state.speed}, ${state.curve}${state.style ? `, ${state.style}` : ""}`)
	$effect(() => {
		if (!initialized) {
			return
		}
		onChange(value)
	})
</script>

<div id="animation-modal" class="" data-value={value}>
	<div class="field">
		<label for="anim-enabled">Enabled</label>
		<input id="anim-enabled" class="checkbox" type="checkbox" bind:checked={state.enabled}
			 data-checked={state.enabled} />
	</div>
	<div id="textarea-items">
		<div class="field">
			<label for="anim-name">Name</label>
			<input id="anim-name" type="text" bind:value={state.name}>
		</div>


		<div class="field">
			<label for="anim-speed">Speed</label>
			<input id="anim-speed" type="number" step="any" bind:value={state.speed}>
		</div>

		<div class="field">
			<label for="anim-curve">Curve</label>
			<input id="anim-curve" type="text" bind:value={state.curve}>
		</div>

		<div class="field">
			<label for="anim-style">Style</label>
			<input id="anim-style" type="text" bind:value={state.style}>
		</div>
	</div>

</div>


<style>
	#animation-modal {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		align-items: center;
		margin-inline: auto;
	}

	label {
		font-size: 1.4rem;
		/*flex: 1*/
	}

	#textarea-items {
		display: flex;
		flex: 1;
		flex-direction: row;
		/*column-count: 2;*/
		/*column-gap: 10px;*/
		flex-wrap: wrap;
	}

	.field {
		flex: 0 1 auto;
		display: flex;
		gap: 0.5rem;
		max-width: 25%;
		break-inside: avoid;
		align-items: center;
		/*display: inline-block;*/
		padding: calc(var(--spacing-unit) / 3);
		/*overflow: auto;*/

		> input {
			min-width: 5ch;
			max-width: 12ch;
		}

		&:has(#anim-enabled) {
			width: 12ch;
		}

		&:is(:focus, :focus-within) {
			outline: none;
			border: 1px solid var(--accent);
		}
	}

	[type="checkbox"] {
		color: var(--accent);
		max-height: 1.6rem;
		font-size: 1.2rem;
		/*opacity: 0;*/

		&::before {
			content: "";
			border-radius: 0;
			background-color: var(--surface-0) !important;
			color: var(--accent);


		}

	}
</style>