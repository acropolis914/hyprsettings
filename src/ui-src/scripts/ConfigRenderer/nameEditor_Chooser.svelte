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
		items: item[]
	}


	let { value, items, orientation, onChange } = $props() as Props
	let state = $state({ selected: value })


	function handleChoiceClick(name: string) {
		state.selected = name
	}

	$effect(()=>{
		onChange(state.selected)
	})

</script>


<div id="generic-key" class="chooser-modal">
	<div id="choices" style="flex-direction:{orientation=== 'horizontal' ? 'row' : 'column'}">
		{#each items as item}
			<button class="choice {item.name=== state.selected ? 'selected': '' }" title={item.description} onclick={()=> handleChoiceClick(item.name)}>{item.name}</button>
		{/each}
	</div>
<!--	<button type="button" id="cycler">-->
<!--		-->
<!--	</button>-->

</div>


<style>
	.chooser-modal {
		/*flex:100;*/
		/*flex-basis: 100%;*/
		display: flex;
		flex-direction: row;
		gap: 1rem;
	}

	#choices {
		display: flex;
		border-radius: var(--border-rad);
		overflow: hidden;
		flex-direction: column !important;
		/*flex-direction here is temporary;*/
	}
	.choice {
		box-sizing: border-box;
		white-space: pre;
		text-wrap: nowrap;
		border-radius: 0;
		background-color: var(--surface-1);
		font-size: 1.3rem;
		color:var(--text-0);
		&.selected{
			background-color: var(--accent);
		}
	}
</style>




