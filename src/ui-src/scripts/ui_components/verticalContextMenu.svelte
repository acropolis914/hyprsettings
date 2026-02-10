<script lang="ts">
	import { tick } from 'svelte';

	export let items: Object[] = [];        // array of { label, action?, submenu?, icon? }
	export let visible: boolean = false;
	export let x = 0;
	export let y = 0;

	function select(item) {
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
	}

	// New: adjust position to stay inside viewport
	async function clampPosition() {
		await tick(); // wait until the menu is rendered
		const menuEl = document.querySelector('.context-menu-sv') as HTMLElement;
		if (!menuEl) return;

		const rect = menuEl.getBoundingClientRect();

		if (rect.right > window.innerWidth) x -= rect.right - window.innerWidth;
		if (rect.bottom > window.innerHeight) y -= rect.bottom - window.innerHeight;
		if (rect.left < 0) x = 0;
		if (rect.top < 0) y = 0;
	}

	$: if (visible) clampPosition();
</script>

{#if visible}
	<ul class="context-menu-sv" style="top:{y}px; left:{x}px;">
		{#each items as item}
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
		{/each}
	</ul>
{/if}

<style>
	.context-menu-sv {
		position: absolute;
		background: var(--surface-1);
		/*color: #000;*/
		/*border: 1px solid #ccc;*/
		border: 1px solid var(--accent);
		border-radius: var(--border-rad);
		color: var(--text-0);
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
		width: clamp(160px, 180px, 200px);
		font-family: sans-serif;
		z-index: 1000;
	}

	.context-menu-sv li {
		position: relative;
	}

	.context-menu-sv li > div {
		padding: 0.5rem 1rem;
		cursor: pointer;
		display: flex;
	}

	.context-menu-sv li:hover > div {
		color: var(--surface-0);
		background: var(--accent);
	}

	.icon{
		color: var(--accent);
		margin-right: 0.5rem;
	}

	.submenu-arrow{
		/*color: var(--red);*/
		margin-left: auto ;
		align-self: flex-end;
	}

	/* Submenu */
	.submenu {
		display: none;
		position: absolute;
		top: 0;
		left: 100%;
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
