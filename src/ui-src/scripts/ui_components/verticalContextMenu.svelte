<script lang="ts">
	import { tick } from 'svelte';
	interface item {
		label: string;
		action?: ()=> void;
		submenu?: item[];
		icon?: string;
	}
	let menuEl: HTMLElement | null = null;

	interface Props {
		items?: Item[];
		visible?: boolean;
		x?: number;
		y?: number;
		submenu?: Item[];
	}

	let {items, visible, x, y, submenu} = $props() as Props;

	items.forEach((item) => {
		if (typeof item.action === "function" && item.submenu) {
			console.log(`${item.label}  both has an action and a submenu. It is recommended to not have both at the same time`);
		}
	})

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
		if (!menuEl) return;

		const rect = menuEl.getBoundingClientRect();

		if (rect.right > window.innerWidth) x -= rect.right - window.innerWidth;
		if (rect.bottom > window.innerHeight) y -= rect.bottom - window.innerHeight;
		if (rect.left < 0) x = 0;
		if (rect.top < 0) y = 0;
	}


	// $: if (visible) clampPosition();
	$effect(()=>{
		if (visible) clampPosition();
		// if (visible) menuEl.focus();
	})
</script>

{#if visible}
	<ul class="context-menu-sv" bind:this={menuEl} style="top:{y}px; left:{x}px;">
		{#each items as item}
			{#if !(item.label === "separator")}
			<li tabindex="0">
				<div onclick={() => item.submenu ? null : select(item)}>
					<span class="icon">{item.icon}</span> {item.label} <span class="submenu-arrow">{item.submenu ? '▶' : ''}</span>
				</div>

				{#if item.submenu}
					<ul class="context-menu-sv submenu">
						{#each item.submenu as sub}
							<li onclick={() => select(sub)}>{sub.label}</li>
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
	@use "../../stylesheets/mixins.scss" as *;

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
		//padding-block: 0.1rem;
		overflow: visible;
		width: 15rem;
		/*font-family: sans-serif;*/
		font-size: 1.2rem;
		z-index: 300;
		@include box-shadow;
		box-shadow:
			  inset 0 1px 0 0 rgba(255,255,255,0.08),
			  inset 0 0 0 1px rgba(255,255,255,0.04),
			  0 0 0 1px rgba(0,0,0,0.16),
			  0 1px 1px -0.5px rgba(0,0,0,0.08),
			  0 3px 3px -1.5px rgba(0,0,0,0.08),
			  0 6px 6px -3px rgba(0,0,0,0.08),
			  0 12px 12px -6px rgba(0,0,0,0.08);
		//mix-blend-mode: multiply;



	}

	hr{
		margin-inline: 1.5rem;
		margin-block: .3rem;
		//border-width: 5px;
		opacity: 0.3;
		color: opacity(var(--surface-0), 0.1);
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

	.context-menu-sv li:is(:hover, :focus, :focus-visible) > div {
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
		left: 99%;
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		width: 150px;
		z-index: 1000;
		border-left: none;
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
