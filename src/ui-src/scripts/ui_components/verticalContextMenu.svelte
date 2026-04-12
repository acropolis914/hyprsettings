



<script lang="ts">
	import { tick } from 'svelte';
	import { getNormalizedRect } from "@scripts/utils/utils.ts"
	interface item {
		label: string;
		action?: ()=> void;
		submenu?: object;
		icon?: string;
	}

	interface Props {
		items?: Item[];
		visible?: boolean;
		x?: number;
		y?: number;
		submenu?: Item[];
	}

	let {items, visible, x, y, submenu} = $props() as Props;


	function select(item:item) {
		item.action?.();
		visible = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (!event.target.closest('.context-menu-sv')) {
			visible = false;
		}
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('click', handleClickOutside);
		window.addEventListener('mousemove',()=>{
			setTimeout(()=>{
				handleClickOutside
			}, 100)
		});
	}

	// New: adjust position to stay inside viewport
	async function clampPosition() {
		await tick(); // wait until the menu is rendered
		const menuEl = document.querySelector('.context-menu-sv') as HTMLElement;
		if (!menuEl) return;

		const rect = getNormalizedRect(menuEl)

		if (rect.right > window.innerWidth) x -= rect.right - window.innerWidth;
		if (rect.bottom > window.innerHeight) y -= rect.bottom - window.innerHeight;
		if (rect.left < 0) x = 0;
		if (rect.top < 0) y = 0;
	}


	// $: if (visible) clampPosition();
	$effect(()=>{
		if (visible) clampPosition();
	})
</script>

{#if visible}
	<ul class="context-menu-sv" style="top:{y}px; left:{x}px;">
		{#each items as item}
			{#if !(item.label === "separator")}
			<li>
				<div on:click={() => item.submenu ? null : select(item)}>
					<span class="icon">{item.icon}</span> {item.label} <span class="submenu-arrow">{item.submenu ? '▶' : ''}</span>
				</div>

				{#if item.submenu}
					<ul class="context-menu-sv submenu">
						{#each item.submenu as sub}
							<li on:click={() => select(sub)}>{sub.label}</li>
						{/each}
					</ul>
				{/if}
			</li>
			{:else}
				<hr>
			{/if}
		{/each}
	</ul>
{/if}

<style lang="scss">
	.context-menu-sv {
		position: absolute;
		background: var(--surface-0);
		/*color: #000;*/
		/*border: 1px solid #ccc;*/
		border: 1px solid var(--surface-border);
		border-radius: var(--border-rad);
		color: var(--text-0);
		list-style: none;
		margin: 0;
		/*padding: 0.25rem 0;*/
		padding-block: 0.1rem;
		width: 15rem;
		/*font-family: sans-serif;*/
		font-size: 1.2rem;
		z-index: 300;


	}

	hr{
		margin-inline: 1.5rem;
		margin-block: .3rem;
		//border-width: 5px;
		color: color-mix(in srgb, var(--surface-2) 40%, transparent);
	}

	.context-menu-sv li {
		position: relative;
		align-items: center;
	}

	.context-menu-sv li > div {
		padding: 0.5rem 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	.context-menu-sv li:hover > div {
		color: var(--surface-0);
		background: var(--accent);
	}

	.icon{
		font-size: 2rem;
		line-height: 2rem;
		//font-family: v.$font-nerd;
		margin-right: 0.5rem;
		min-width: 1.3rem;
		min-height: 2rem;
	}

	.submenu-arrow{
		/*color: var(--red);*/
		margin-left: auto ;
		//align-self: flex-end;
	}

	/* Submenu */
	.submenu {
		display: none;
		position: absolute;
		top: 0;
		left: 101%;
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		width: 150px;
		z-index: 1000;
	}

	li:hover > .submenu {
		display: block;
	}

	.submenu li {
		padding: 0.5rem 1rem;
	}

	.submenu li:hover {
		/*background: #eee;*/
		background: var(--surface-1);
	}
</style>
