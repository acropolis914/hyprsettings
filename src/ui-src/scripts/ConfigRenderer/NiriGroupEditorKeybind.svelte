<script lang="ts">
	import Dialog from "@scripts/ui_components/dialog.ts"
	import { onMount, tick } from "svelte"
	import { fly, fade } from "svelte/transition"
	import { niriInputOptions, niriKeyOrderMap } from "@scripts/NiriSpecific/niriKeybindOptions.ts"
	import { dmenuWrapper } from "@scripts/ui_components/dmenu.ts"

	type FLAGS = {
		name: string;
		value: string;
	}
	let resetValue
	let { initialValue, onChange } = $props()
	resetValue = initialValue

	// 1. Initialize state with the first value

	let keys = $state<string[]>([])
	let cooldown = $state(0)
	let allowInhibiting = $state(true)
	let repeat = $state(true)
	let hotkeyOverlayTitle = $state("")
	let isCompact = $state(true)

	// 2. Reactive Reset / Initial Parse
	// This runs whenever initialValue changes (including the first time)
	$effect(() => {
		const parts = initialValue.split(" ")
		// Update Keys
		keys = parts[0].split("+")
		// Parse Flags
		const flags = parts.slice(1).map(i => {
			const [name, value] = i.split("=")
			return { name, value }
		})
		// Update individual states
		const rawCooldown = flags.find(i => i.name === "cooldown-ms")?.value
		cooldown = Number(rawCooldown ?? 0)
		allowInhibiting = flags.find(i => i.name === "allow-inhibiting")?.value !== "false"
		repeat = flags.find(i => i.name === "repeat")?.value !== "false"
		const titleRaw = flags.find(i => i.name === "hotkey-overlay-title")?.value
		hotkeyOverlayTitle = titleRaw ? titleRaw.replace(/"/g, "") : ""
	})

	let editorRef: HTMLElement

	onMount(async () => {
		const infoButtons = editorRef.querySelectorAll(".field-info")
		infoButtons.forEach(button => {
			button.addEventListener("click", (e) => {
				const label =
					button.previousElementSibling?.tagName === "LABEL"
						? button.previousElementSibling
						: null
				const title = button.getAttribute("title")
				const dialog = new Dialog({ textContent: title, okayButton: false })
				if (label) {
					dialog.setTitle(label.textContent)
				}
				dialog.showModal()

			})
		})
		editorRef.addEventListener("click", () => {
			editorRef.classList.remove("compact")

		})
		editorRef.addEventListener("dblclick", () => {
			editorRef.classList.add("compact")

		})
		// editorRef.addEventListener("focus", () => {
		// 	editorRef.classList.remove("compact")
		// })

		editorRef.querySelectorAll("input").forEach(el => {
			el.addEventListener("dblclick", (e) => {
				e.stopPropagation()
				e.stopImmediatePropagation()

			})
		})


	})


	let FINAL = $derived.by(() => {
		let keybind = keys.join("+") ?? "Illegal"
		let cooldown_string = ((cooldown && cooldown !== 0) ? `cooldown-ms=${cooldown}` : "")
		let inhibit_string = !allowInhibiting ? "allow-inhibiting=false" : ""
		let hotkey_overlay_string = ""
		if (hotkeyOverlayTitle === "null") {
			hotkey_overlay_string = "hotkey-overlay-title=null"
		} else if (hotkeyOverlayTitle !== null && hotkeyOverlayTitle !== undefined && hotkeyOverlayTitle !== "") {
			hotkey_overlay_string = `hotkey-overlay-title="${hotkeyOverlayTitle}"`
		}
		let repeat_string = !repeat ? "repeat=false" : ""
		return `${keybind} ${cooldown_string} ${inhibit_string} ${repeat_string} ${hotkey_overlay_string}`
	})

	$effect(() => {
		onChange(FINAL)
	})

	//
	// $effect(() => {
	// 	console.log({ keys: keys, cooldown, allowInhibiting, hotkeyOverlayTitle, repeat })
	// })

	function handleKeydown(e) {
		if (e.key === "Enter") {
			e.stopPropagation()
			e.stopImmediatePropagation()
			e.preventDefault()
			editorRef.classList.toggle("compact")
		}
		if (e.key === "d") {
			e.stopPropagation()
			e.stopImmediatePropagation()
			e.preventDefault()
		}

		// alert(e.key)

	}

	function removeKey(key: string) {
		// if (keys.length < 2) return
		keys = keys.filter(i => i !== key)
	}

	async function selectKey() {
		let filtered = niriInputOptions.filter(i => !keys.includes(i.value))
		let options_new = filtered.map(i => {
			// Check if the label is different from the value (case-insensitive or exact)
			const isDifferent = i.label !== i.value

			return {
				...i,
				description: isDifferent
					? `${i.description}<br><strong>[${i.value}]</strong>`
					: i.description
			}
		})
		const selected = await dmenuWrapper({
			items: options_new,
			promptText: "Select Modifier or Special Key",
			addCustom: false, // Turned off as requested
			focused: (item) => item.value === "Mod"
		})
		if (selected) {
			keys.push(selected)
			keys.sort((a, b) => {
				const orderA = niriKeyOrderMap.has(a) ? niriKeyOrderMap.get(a) : 999
				const orderB = niriKeyOrderMap.has(b) ? niriKeyOrderMap.get(b) : 999
				return orderA - orderB
			})
		}
	}

	/**
	 * Normalizes browser key names to Niri/XKB compatible strings.
	 */
	function normalizeKey(key: string): string {
		const map: Record<string, string> = {
			" ": "Space",
			"Control": "Ctrl",
			"ArrowUp": "Up",
			"ArrowDown": "Down",
			"ArrowLeft": "Left",
			"ArrowRight": "Right",
			// Niri specifically looks for 'Print', not 'PrintScreen'
			"PrintScreen": "Print",
			"Meta": "Super"
		}
		return map[key] || key
	}

	function handleKeyContainerInput(e: KeyboardEvent) {
		if (e.key === "Tab") {
			return
		}
		// 1. Stop the browser from doing browser things (Back, Refresh, Tab)
		e.preventDefault()
		e.stopImmediatePropagation()
		e.stopPropagation()

		const normalized = normalizeKey(e.key)

		// 2. Avoid duplicates
		if (!keys.includes(normalized)) {
			keys.push(normalized)

			// 3. Keep the "Archy" sorting order
			keys.sort((a, b) => {
				const orderA = niriKeyOrderMap.get(a) ?? 999
				const orderB = niriKeyOrderMap.get(b) ?? 999
				return orderA - orderB
			})
		}
	}

	function reset() {
		initialValue = resetValue
	}


</script>
<div bind:this={editorRef} id="niri-keybind-editor" class="editor-item editor-item-generic {isCompact} compact"
     tabindex="0"
     data-uuid={crypto.randomUUID()} onkeydown={(e)=>{handleKeydown(e)}}>
	<div id="preview"> Settings for {FINAL}
	</div>
	<div id="body">


		<div class="field keybind">
			<label for="keys">Keys</label>
			<button class="field-info"
			        title="The keys needed to be pressed (Duh!)">
				
			</button>
			<div id="keys-container" contenteditable="true" onkeydown={handleKeyContainerInput}>
				{#each keys as key (key)}
					<div class="key"
					     contenteditable="false"
					     data-value={key} onclick={()=>{removeKey(key)}} aria-role="button"
					     in:fly out:fly={{x:-10,duration:100}}>
						<div class="label">{key}</div>
						<div id="remove">×</div>
						<!--						<button id="remove-key"></button>-->
					</div>
				{/each}
			</div>
			<!--			<input id="keys" type="text" bind:value={keys}>-->
			<button class="key-editor-button"
			        title="Select keys to add" onclick={selectKey}>
				
			</button>
		</div>
		<div class="field hotkey">
			<label for="repeat">Hotkey overlay title</label>
			<button class="field-info"
			        title="Title shown in the Mod+Slash overlay. If null, niri uses the action name. Allows pango formatting. Default: none">
				
			</button>
			<input id="repeat" type="text" bind:value={hotkeyOverlayTitle} />
		</div>
		<!--	<input type="text" bind:value={flags2} />-->
		<div class="field">
			<label for="cooldown-ms">Cooldown MS</label>
			<button class="field-info"
			        title="Rate-limits the bind; essential for high-frequency events like WheelScroll. Default: 0">
				
			</button>
			<input id="cooldown-ms" type="number" bind:value={cooldown} min="0" step="10" />
		</div>


		<div class="field">
			<label for="hotkey-title">Repeat</label>
			<button class="field-info"
			        title="Determines if holding the key triggers the action repeatedly. Default: true">
				
			</button>
			<input id="hotkey-title" type="checkbox" bind:checked={repeat} />
		</div>
		<div class="field">
			<label for="allow-inhibiting">Allow Inhibiting</label>
			<button class="field-info"
			        title="If false, the bind bypasses keyboard inhibitors. Setting this flag to false tells Niri to intercept the key first. (useful for VM escape keys). Default: true">
				
			</button>
			<input id="allow-inhibiting" type="checkbox" bind:checked={allowInhibiting} />
		</div>
	</div>

</div>
<div id="actions-label">Actions</div>
<style lang="scss">
	@use '@stylesheets/mixins' as *;

	#niri-keybind-editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background-color: var(--surface-0);
		margin-bottom: var(--spacing-unit);
		transform-origin: top;
		transition: all 0.2s !important;

	}

	#niri-keybind-editor.compact {
		//border: 10px solid red !important;
		padding-bottom: 0;

		#body {
			transform: scaleY(0) !important;
			height: 0 !important;
			//border: 1px solid red;
			opacity: 0;

		}
	}

	#preview {
		color: var(--accent);
		font-weight: bold;
		font-size: 1.4rem;
		min-height: 1.4rem;
	}

	#body {
		display: flex;
		gap: 0.5rem;
		flex-direction: row;
		flex-wrap: wrap;
		transform-origin: top;
	}

	@starting-style {
		#niri-keybind-editor {
			height: 0;
			opacity: 0;
		}
	}

	.field {
		display: flex;
		flex-basis: 30%;
		align-items: center;
		padding-right: 1rem;

		.field-info {
			font-size: 1rem;
			border-radius: 1000px;
			background-color: var(--surface-1);
			aspect-ratio: 1/1 !important;
			//width: 1rem;
			display: flex;
			justify-content: center;
			align-items: center;
			margin-inline: 0.5rem;
			padding-block: unset;
			opacity: 0.4;
			color: var(--text-1);

			&:hover {
				opacity: 1;
				transform: scale(1.5);
			}
		}

		input, [contenteditable='true'] {
			margin: 0;
			outline: none;
			border: 0;
			background-color: var(--surface-1);
			padding: 2px;
			resize: none;
			color: var(--text-0);
			@include editor-input-reset();
			min-width: 0;
			border-radius: 2px;
		}


		label {
			//flex-basis: 15ch;
			max-width: 15ch;
			color: var(--text-0);
			font-size: 1.4rem;
			margin-right: 0.5rem;
			font-weight: bold;
			text-wrap: nowrap;
		}

	}

	.field:not(.hotkey) {
		input {
			max-width: 10ch;
		}
	}

	.field.hotkey {
		label {
			max-width: 20ch;
		}

		input {
			flex-grow: 1;
		}
	}

	.field.keybind, .field.hotkey {
		flex-basis: 100% !important;
	}

	#keys-container {
		display: flex;
		flex-direction: row;
		//display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		align-items: center;
		background-color: var(--surface-1);
		padding-right: 10px;
		padding-block: 0.2rem;
		flex-grow: 1;
		caret-color: var(--red);
		min-height: 1.2rem;
		caret-shape: underscore;
		position: relative;

		&:empty {
			border: 1px solid var(--accent-warning);
		}

		.key {
			//background-color: var(--surface-1);
			display: inline-flex;
			background: rgb(68 68 68 / 0.43);
			color: #fff;
			padding: 0.1rem 0.4rem;
			border-radius: 0.25rem;
			cursor: pointer;
			//font-size: 0.9em;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;
			font-size: 1.2rem;
			font-weight: bold;

			#remove {
				width: 0;
				opacity: 0;
				display: flex;
				height: 1rem;
				align-items: center;
				justify-content: center;
				transition: all 0.2s ease;
			}

			&:hover {
				background: #666;
				transform: scale(1);

				#remove {
					opacity: 1;
					width: 1ch;
					margin-left: 0.5ch;
					transform: rotate(360deg);
				}
			}


		}

		&:is(:focus, :active) {
			outline: 1px solid var(--accent);
			/* name | duration | timing-function | delay | iteration-count | direction | fill-mode */
			animation: border-color-animation 1s ease-out 0s infinite alternate;

			&::before {
				position: absolute;
				top: -1.2rem;
				right: 0rem;
				font-size: 1rem;
				content: 'Listening to input';
				//color: var(--red);
				animation: color-breathe 1s ease-out 0s infinite alternate;
			}

		}


	}

	#keys-container:has(*) + button.key-editor-button {
		margin-left: 0.5rem;
	}

	button.key-editor-button {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-contrast);
		//border: 1px solid red;
		border-radius: 0.25rem;
		padding: 0.2rem 0.4rem;
		cursor: pointer;
	}

	@keyframes border-color-animation {
		100% {
			outline: 1px solid var(--accent-active);

		}
	}

	@keyframes color-breathe {
		100% {
			color: var(--accent-active);
			//font-weight: bold;
			//content: '';
			//width: 0;
			overflow: hidden;
			text-shadow: 0.1px 0 0 currentColor, -0.5px 0 0 currentColor;
		}
	}

	#actions-label {
		font-size: 1.2rem;
		font-weight: bold;
		opacity: 0.5;
		margin-bottom: 10px;
	}


</style>