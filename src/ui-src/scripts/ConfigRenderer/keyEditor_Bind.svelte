<script lang="ts">
	import { bindFlags, modkeys, dispatchers } from "@scripts/HyprlandSpecific/bindDefinitions.js"
	import { selectFrom } from "@scripts/ui_components/dmenu.ts"
	import { onMount } from "svelte"

	let root: HTMLDivElement = null

	type SelectOption = {
		name: string,
		value: string,
		description?: string,
	}

	type BindState = {
		modkeys: string[],
		keypress: string,
		description: string,
		dispatcher: string,
		params: string,
	}

	function parseFlags(name: string): string[] {
		return name.startsWith("bind") ? name.substring(4).split("").filter(Boolean) : []
	}

	function parseValue(value: string, withDescription: boolean): BindState {
		const split = value.split(",")
		const mod = split[0]?.trim() ?? ""
		const key = split[1]?.trim() ?? ""
		if (withDescription) {
			return {
				modkeys: mod ? mod.split(" ").filter(Boolean) : [],
				keypress: key,
				description: split[2]?.trim() ?? "",
				dispatcher: split[3]?.trim() ?? "",
				params: split.slice(4).join(",").trim()
			}
		}
		return {
			modkeys: mod ? mod.split(" ").filter(Boolean) : [],
			keypress: key,
			description: "",
			dispatcher: split[2]?.trim() ?? "",
			params: split.slice(3).join(",").trim()
		}
	}

	type Props = {
		inputValue: string,
		bindName: string,
		onChange?: (value: string) => void,
		onNameChange?: (name: string) => void,
	}

	let {
		inputValue,
		bindName,
		onChange = () => {
		},
		onNameChange = () => {
		}
	}: Props = $props()

	const initialFlags = parseFlags(bindName ?? "bind")
	const initialState = parseValue(inputValue ?? "", initialFlags.includes("d"))

	let flags = $state(initialFlags)
	let state = $state(initialState)

	let hasDescription = $derived(flags.includes("d"))
	let fullValue = $derived.by(() => {
		const parts = [state.modkeys.join(" "), state.keypress]
		if (hasDescription) parts.push(state.description)
		parts.push(state.dispatcher, state.params)
		return parts.join(", ")
	})
	let bindKeyword = $derived(`bind${flags.join("")}`)

	// onMount(() => (
	// 	root.querySelectorAll("textarea").forEach(el => {
	// 		el.addEventListener("keydown", e => {
	// 			if (e.key === "Enter") {
	// 				console.log("Pressed enter inside a textarea")
	// 				e.preventDefault()
	// 			}
	// 		})
	// 	}))
	// )
	$effect(() => {
		onChange(fullValue)
	})

	$effect(() => {
		onNameChange(bindKeyword)
	})

	function removeModKey(index: number) {
		state.modkeys.splice(index, 1)
		state.modkeys = [...state.modkeys]
	}

	async function selectModKey() {
		const options: SelectOption[] = modkeys.map((m) => ({
			name: m.value,
			description: m.description,
			value: m.value
		}))
		let selected: SelectOption | null = null
		try {
			selected = (await selectFrom(options, false)) as SelectOption
		} catch {
			return
		}
		if (selected && !state.modkeys.includes(selected.name)) {
			state.modkeys = [...state.modkeys, selected.name]
		}
	}

	function removeFlag(flag: string) {
		flags = flags.filter(f => f !== flag)
	}

	async function selectFlag() {
		const options: SelectOption[] = bindFlags.filter((f) =>
			f.value !== ""
		).map((f) => ({
			name: `${f.text}  (${f.value}) `,
			description: f.description,
			value: f.value
		}))
		let selected: SelectOption | null = null
		try {
			selected = (await selectFrom(options, false)) as SelectOption
		} catch {
			return
		}
		if (selected && !flags.includes(selected.value)) {
			flags = [...flags, selected.value]
		}
	}

	async function selectDispatcher() {
		const options: SelectOption[] = dispatchers.map((d) => ({
			name: d.value,
			description: d.description,
			value: d.value
		}))
		let selected: SelectOption | null = null
		try {
			selected = (await selectFrom(options, false)) as SelectOption
		} catch {
			return
		}
		if (selected) {
			state.dispatcher = selected.name
		}
	}

	function updateKeypress(event: Event) {
		const target = event.target as HTMLTextAreaElement
		state.keypress = target.value
	}

	function updateDescription(event: Event) {
		const target = event.target as HTMLTextAreaElement
		state.description = target.value
	}

	function updateParams(event: Event) {
		const target = event.target as HTMLTextAreaElement
		state.params = target.value
	}

	function updateDispatcher(event: Event) {
		const target = event.target as HTMLTextAreaElement
		state.dispatcher = target.value
	}

	function preventIllegalKeys(event: KeyboardEvent) {
		if (event.key === "Enter") event.preventDefault()
		if (event.key === ",") event.preventDefault()
	}

	function enterKeySelectDispatcher(event: KeyboardEvent) {
		console.log("enterKeySelectDispatcher", event)
		if (event.key === "Enter") {
			event.preventDefault()
			selectDispatcher()
		}

	}
</script>

<div class="bind-editor" bind:this={root}>
	<div class="bind-flags field">
		<label>Flags:</label>
		<div class="flags-list">
			{#each flags as flag}
				<span class="flag-tag" onclick={() => removeFlag(flag)}>{flag} ×</span>
			{/each}
			<button class="add-flag" onclick={selectFlag}>+</button>
		</div>
	</div>

	<div class="modkeys-section field">
		<label>Modifiers:</label>
		<div class="modkeys-list">
			{#each state.modkeys as modkey, i}
				<span class="modkey-tag" onclick={() => removeModKey(i)}>{modkey} ×</span>
			{/each}
			<button class="add-modkey" onclick={selectModKey}>+</button>
		</div>
	</div>

	<div class="keypress-section field">
		<label>Key:</label>
		<textarea
			class="keypress"
			bind:value={state.keypress}
			oninput={updateKeypress}
			onkeydown={preventIllegalKeys}
			placeholder="e.g., F, Return, mouse_left"
			rows="1"
		></textarea>
	</div>


	<div class="dispatcher-section field">
		<label>Dispatcher:</label>
		<div class="dispatcher-input-row">
			<textarea
				class="dispatcher"
				bind:value={state.dispatcher}
				oninput={updateDispatcher}
				onkeydown={(event)=>{preventIllegalKeys(event); enterKeySelectDispatcher(event)}}
				placeholder="e.g., exec, movewindow"
				rows="1"
			></textarea>
			<button class="add-modkey select-dispatcher" title="Select dispatcher" onclick={selectDispatcher}>󰒓
			</button>
		</div>
	</div>
	{#if hasDescription}
		<div class="description-section field">
			<label>Description:</label>
			<textarea
				class="description"
				bind:value={state.description}
				oninput={updateDescription}
				onkeydown={preventIllegalKeys}
				placeholder="Description for this bind"
				rows="1"
			></textarea>
		</div>
	{/if}
	<div class="params-section field">
		<label>Parameters:</label>
		<textarea
			class="params"
			bind:value={state.params}
			oninput={updateParams}
			placeholder="Parameters for the dispatcher"
			rows="1"
		></textarea>
	</div>
</div>

<style>
	.bind-editor {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 0.5rem;
		width: 100%;

		> :last-child, .description-section:nth-last-child(2) {
			flex-basis: 100%;
		}
	}

	.bind-flags {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.flags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		align-items: center;
	}

	.flag-tag {
		background: #444;
		color: #fff;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.9em;
	}

	.flag-tag:hover {
		background: #666;
	}

	.add-flag {
		background: #007acc;
		color: white;
		border: none;
		border-radius: 0.25rem;
		padding: 0.2rem 0.4rem;
		cursor: pointer;
	}

	.add-flag:hover {
		background: #005aa3;
	}

	label {
		font-weight: bold;
		margin-bottom: 0.25rem;
		display: block;
	}

	.modkeys-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		align-items: center;
	}

	.modkey-tag {
		background: #444;
		color: #fff;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.9em;
	}

	.modkey-tag:hover {
		background: #666;
	}

	.add-modkey {
		background: #007acc;
		color: white;
		border: none;
		border-radius: 0.25rem;
		padding: 0.2rem 0.4rem;
		cursor: pointer;
	}

	.add-modkey:hover {
		background: #005aa3;
	}

	textarea {
		width: 100%;
		padding: 0.25rem;
		border: 1px solid #555;
		border-radius: 0.25rem;
		background: #2a2a2a;
		color: #fff;
		font-family: monospace;
		resize: vertical;
	}

	textarea:focus {
		outline: none;
		border-color: #007acc;
	}


	.dispatcher {
		flex: 1;
		padding: 0.25rem;
		border: 1px solid #555;
		border-radius: 0.25rem;
		background: #2a2a2a;
		color: #fff;
		font-family: monospace;
		resize: vertical;
	}

	.dispatcher:focus {
		outline: none;
		border-color: #007acc;
	}

	.dispatcher-input-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.select-dispatcher {
		padding: 0.2rem 0.4rem;
		line-height: 1;
	}

	.select-dispatcher:hover {
		background: #005aa3;
	}

	.field {
		flex: 1;
	}

	.dispatcher-section {
		flex: 1.5
	}
</style>