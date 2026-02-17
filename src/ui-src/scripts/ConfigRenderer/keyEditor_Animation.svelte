<script lang="ts">
	import { onMount } from "svelte"
	import { animationsDefinitions } from "@scripts/HyprlandSpecific/animationDefinitions.ts"
	import { selectFrom } from "@scripts/ui_components/dmenu.ts" // optional scss import method


	type Props = {
		inputValue: string,
		onChange: (value: string) => void,
	}
	let { inputValue, onChange }: Props = $props()
	let derivedValue = $derived(inputValue)
	let parts = derivedValue.split(",").map((i: string) => i.trim())
	let state = $state({
		name: parts[0] ?? "",
		enabled: parts[1] === "1",
		speed: Number(parts[2]),
		curve: parts[3],
		style: parts[4]
	})
	let value = $derived(`${state.name}, ${state.enabled ? "1" : "0"}, ${state.speed}, ${state.curve}${state.style ? `, ${state.style}` : ""}`)


	function toggleEnabled() {
		state.enabled = !state.enabled
	}

	let hasStyles = $derived(animationsDefinitions[state.name] && animationsDefinitions[state.name].styles &&
		animationsDefinitions[state.name].styles.length > 0)
	let styles = $derived(animationsDefinitions[state.name].styles)

	async function selectAnimation(){
		let animationOptions = Object.entries(animationsDefinitions).map(
			([key, value]) => ({
				name:key,
				description: value.description,
				value: key,
				type: "animation"
			})
		)
		let selected = await selectFrom(animationOptions,  false)
		if (selected) {
			state.name = selected.name
		}
	}

	let root: HTMLElement
	onMount(() => {

			root.querySelector(".field[role=checkbox]").addEventListener("keydown", (e: Event) => {
				if (e.key === "Enter" || e.key === "Space") {
					e.stopPropagation()
					e.stopImmediatePropagation()
					e.preventDefault()
					toggleEnabled()
					// console.log(e.key)
				}

			})

			let animationNameSelector:HTMLDivElement = root.querySelector(".field:has(#anim-name)")
			animationNameSelector.addEventListener("click", async (e: Event) => {
				e.stopPropagation();
				selectAnimation()
			})
			animationNameSelector.addEventListener("keydown", (e: Event) => {
				if (e.key === "Enter" || e.key === "Space") {
					e.stopPropagation()
					e.stopImmediatePropagation()
					selectAnimation()
				}

			})

		}
	)

	$effect(() => {
		hasStyles = (animationsDefinitions[state.name] && animationsDefinitions[state.name].styles &&
			animationsDefinitions[state.name].styles.length > 0 && state.style)
		if (hasStyles && state.style != undefined &&styles.includes(state.style.split(" ")[0])){
			// console.log(state.style)
		} else{
			// console.log("Style", state.style , "is not in styles for" , value)
			// return
		}
		if (!hasStyles) {
			state.style = ""
		}
		onChange(value)
	})

</script>

<div id="animation-modal" class="" data-value={value} bind:this={root}>
	<div class="field" tabindex="0" role="checkbox" aria-checked="{state.enabled}" onclick={toggleEnabled}>
		<label for="anim-enabled">On</label>
		<input id="anim-enabled" class="checkbox" type="checkbox" bind:checked={state.enabled}
			 data-checked={state.enabled} tabindex="-1" />
	</div>
	<div id="textarea-items">
		<div class="field" tabindex="0"  >
			<label for="anim-name">Name</label>
			<!--			<input id="anim-name" type="text" bind:value={state.name}>-->
<!--			<select id="anim-name" bind:value={state.name}>-->
<!--				{#each Object.keys(animationsDefinitions) as animName}-->
<!--					<option value={animName} id="anim-name-option">{animName}</option>-->
<!--				{/each}-->
<!--			</select>-->
			<div id="anim-name">{state.name}</div>
		</div>


		<div class="field">
			<label for="anim-speed">Speed(ds)</label>
			<input id="anim-speed" type="number" step="any" bind:value={state.speed}>
		</div>

		<div class="field">
			<label for="anim-curve">Curve</label>
			<input id="anim-curve" type="text" bind:value={state.curve}>
		</div>
		{#if hasStyles}
			<div class="field">
				<label for="anim-style">Style</label>
				<input id="anim-style" type="text" bind:value={state.style} list="anim-style-options">
				<datalist id="anim-style-options">
					{#each styles as style}
						<option value={style}>{style}</option>
					{/each}
				</datalist>
			</div>
		{/if}
	</div>

</div>


<style lang="scss">
	#animation-modal {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		align-items: center;
		margin-inline: auto;
	}



	#textarea-items {
		display: flex;
		flex: 1;
		flex-direction: row;
		gap: 2rem;
		/*column-count: 2;*/
		/*column-gap: 10px;*/
		flex-wrap: wrap;
	}

	.field {
		font-size: 1.4rem;
		label {

			font-weight: bold;
		}

		box-sizing:border-box;
		flex: 0 1 auto;
		display: flex;
		gap: 0.5rem;
		max-width: 32%%;
		break-inside: avoid;
		align-items: center;
		/*display: inline-block;*/
		padding: calc(var(--spacing-unit) / 3);
		/*overflow: auto;*/

		> input, select , div{
			min-width: 5ch;
			max-width: 12ch;
			font-size: 1.4rem;
			text-align: center;
			color: var(--accent);

			&:is(:focus, :focus-within) {
				outline: none !important;
			}
		}

		> select {
			min-width: 5ch;
			font-size: 1.4rem;
			text-align: center;
		}

		&:has(#anim-enabled) {
			padding-right: 1rem;
		}

		&:is(:focus, :focus-within) {
			outline: none;
			border: 1px solid var(--accent);
		}

		&:has(input[type="checkbox"]) {
			position: relative;

			&::after {
				position: absolute;
				content: "";
				font-size: 3rem;
				right: 0rem;
			}
		}

		&:has(input:checked) {
			&::after {
				content: "󰸞";
				color: var(--accent);
			}
		}
	}

	[type="checkbox"] {
		color: var(--accent);
		max-height: 1.6rem;
		font-size: 1.2rem;
		opacity: 0;
		min-width: 1ch !important;
		width: 1ch;
		margin: 0;
		position: relative;

		&::before {
			position: absolute;
			top: 50%;
			right: 0;
			content: "";
			border-radius: 0;
			background-color: var(--surface-0) !important;
			color: var(--accent);
			transform: translateY(-50%);

		}

	}
</style>