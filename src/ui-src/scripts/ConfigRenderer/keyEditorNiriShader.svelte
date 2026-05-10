<script lang="ts">
	import Prism from "prismjs"
	import { onMount } from "svelte"

	let { initialValue, onChange } = $props()
	import NiriShaderPreview from "@scripts/NiriSpecific/NiriShaderPreview.ts"

	let container = $state()
	let codeElement = $state()
	let shaderContainer = $state()
	let shaderStatusText = $state()
	let shaderErrorText = $state()
	let niri

	function dedent(str) {
		const lines = str.replace(/^\n/, "").split("\n")

		// find minimum indentation (ignore empty lines)
		const indent = lines
			.filter((line) => line.trim())
			.reduce((min, line) => {
				const match = line.match(/^(\s*)/)
				return Math.min(min, match ? match[1].length : 0)
			}, Infinity)

		return lines.map((line) => line.slice(indent)).join("\n")
	}

	const cleanValue = initialValue
		.replace(/^r"\s*\n/, "").replace(/\n.*"$/, "")


	onMount(() => {
		// Initialize Niri
		niri = new NiriShaderPreview()
		niri.mount(shaderContainer)
		// niri.onError = (err) => {
		// 	if (err) console.error(err)
		// }

		niri.onSequenceUpdate = (seq) => {
			shaderStatusText.textContent =
				"Mode: " + seq.map((s) => s.toUpperCase()).join(" → ")
		}

		niri.onError = (err) => {
			shaderErrorText.textContent = err
			// if (err) console.error(err)
		}

		const content = dedent(cleanValue)
		codeElement.textContent = content

		niri.setShader(content)
		niri.play()
		Prism.highlightElement(codeElement)
	})

	function handleInput(e) {
		const el = e.target

		// 1. Save cursor position BEFORE highlighting modifies the DOM
		const offset = getCaretCharacterOffsetWithin(el)
		const text = el.textContent

		// 2. Update shader preview
		if (niri) {
			niri.setShader(text)
		}

		// 3. Highlight (This destroys the current selection/cursor)
		Prism.highlightElement(el)

		// 4. Restore cursor position
		setCaretPosition(el, offset)

		// 5. Notify parent/state
		const formattedValue = `r"\n${text}\n"`
		onChange(formattedValue) // Or however you are handling the update in Svelte 5
	}

	// Helper 1: Find exactly where the cursor is in terms of total text length
	function getCaretCharacterOffsetWithin(element) {
		let caretOffset = 0
		const selection = window.getSelection()
		if (selection.rangeCount > 0) {
			const range = selection.getRangeAt(0)
			const preCaretRange = range.cloneRange()
			preCaretRange.selectNodeContents(element)
			preCaretRange.setEnd(range.endContainer, range.endOffset)
			caretOffset = preCaretRange.toString().length
		}
		return caretOffset
	}

	// Helper 2: Restore the cursor to the exact character offset across new span tags
	function setCaretPosition(element, offset) {
		let charCount = 0
		const range = document.createRange()
		range.setStart(element, 0)
		range.collapse(true)

		const nodeStack = [element]
		let node
		let foundStart = false

		// Traverse through all child nodes (including Prism's generated spans)
		while (!foundStart && (node = nodeStack.pop())) {
			if (node.nodeType === 3) { // If it's a Text node
				const nextCharCount = charCount + node.length
				if (offset <= nextCharCount) {
					range.setStart(node, offset - charCount)
					range.collapse(true)
					foundStart = true
				}
				charCount = nextCharCount
			} else {
				// Push children onto the stack in reverse order so they are popped in correct order
				let i = node.childNodes.length
				while (i--) {
					nodeStack.push(node.childNodes[i])
				}
			}
		}

		// Apply the range to the actual browser selection
		const selection = window.getSelection()
		selection.removeAllRanges()
		selection.addRange(range)
	}

</script>

<div bind:this={container} class="wrapper">
    <pre class="generic-value language-glsl">
        <code
		  bind:this={codeElement}
	        class="language-glsl"
	        contenteditable="true"
	        oninput={handleInput}
	        spellcheck="false"
	  ></code>
    </pre>
	<div id="shader-parent">
		<div id="shader-container" bind:this={shaderContainer}>
		</div>
		<div id="shader-status-text" bind:this={shaderStatusText}></div>
		<div id="shader-error-text" bind:this={shaderErrorText}></div>

	</div>

</div>
<style>
	* {
		/*border: 1px solid red;*/
	}

	.wrapper {
		max-width: 100%;
		overflow: scroll;
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 0;
		gap: var(--spacing-unit, 1rem);
		border: none;
	}

	pre {
		flex: 1 1 auto;
		max-width: 100%;
		width: 100%;
		/*min-width: 50%;*/
		overflow-x: auto;
		box-sizing: border-box;
		margin: 0;
		display: flex;
		align-items: baseline;

		code {
			max-width: 100%;
			width: 100%;
			/*min-width: 0;*/
			display: block;
			outline: none;
		}
	}


	#shader-parent {
		flex: 1 1 auto;
		height: 100%;
		/*outline: green 5px solid;*/
		width: 50%;
		margin: 0;
		padding: 0;
		border: none;

		#shader-container {
			border-radius: var(--border-rad);
			overflow: hidden;
		}

		#shader-status-text {

			font-size: 1rem;
			color: var(--text-2)
		}

		#shader-error-text {
			font-size: 1rem;
		}

		* {
			border: none
		}

	}
</style>
