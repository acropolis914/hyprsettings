<!--A selector for when there are only few choices-->
<script lang="ts">
	interface item {
		name: string,
		description: string,
	}
	type orientation = "horizontal" | "vertical"
	interface Props {
		value: string,
		onChange: (value: string) => void
		orientation?: orientation
		items: item[] | any[]
	}

	let { value=$bindable(), items, orientation, onChange }: Props = $props()
	// console.log(items)
	function handleChoiceClick(name: string) {
		onChange(name)
		value = name
	}
	$effect(()=>{
		console.log(value)
	})

</script>


<div id="generic-key" class="chooser-modal">
	<div id="choices" style="flex-direction:{orientation=== 'horizontal' ? 'row' : 'column'}">
		{#each items as item}
			<button class="choice {item.name === value ? 'selected': '' }" title={item.description} onclick={()=> handleChoiceClick(item.name)}>{item.name}</button>
		{/each}

	</div>

</div>

<style>
	.chooser-modal {
		/*flex:100;*/
		/*flex-basis: 100%;*/
		display: flex;
		flex-direction: row;
		gap: 1rem;
		margin-inline: auto;
		height:30px;
	}

	#choices {
		display: flex;
		border-radius: var(--border-rad);
		overflow: hidden;
		flex-direction: column;
		background-color: var(--surface-0);

		/*flex-direction here is temporary;*/
	}
	.choice {
		box-sizing: border-box;
		white-space: pre;
		text-wrap: nowrap;
		border-radius: 0;
		background-color: var(--surface-1);
		font-size: 1.3rem;
		color: var(--text-0);
		border: 1px solid transparent;
		height:100%;
		&:is(:focus, :focus-visible) {
			/*outline: none;*/
			outline: 1px solid var(--surface-0);
			transform: none !important;
		}
		&:is(:active, :hover) {
			transform: none !important;

		}
		&.selected{
			background-color: var(--accent);
			color:var(--text-contrast);
			transform: none !important;
		}
	}
</style>
