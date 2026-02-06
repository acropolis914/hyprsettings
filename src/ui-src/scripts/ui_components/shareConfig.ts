import { compress, decompress } from '../utils/settings_compressor.ts'
import { render, html } from 'lit'
import { GLOBAL } from '../GLOBAL'

// --- DOM References ---
const testingScreen = document.getElementById('compressor_screen')
let compressed_data: string = ''
let interleaveText: string = ''
let interleaveSliderValue: number = 100

// --- Template ---
const templateString = html`
	<div class="share-config">
		<div class="toolbar">
			<button id="share-button">Share</button>
			<button id="copy-button">Copy</button>
			<button id="decode-button">Decode</button>
			<input type="text" name="interleave" id="interleave-text" placeholder="type,words,here" />
			<input type="range" name="frequency" min="0" max="200" id="interleave-slider" />
			<span class="file-size" id="file-size">Size: 0 KB</span>
		</div>
		<textarea name="config-text" wrap="soft" id="config-textarea"></textarea>
	</div>
`

// --- Create the share screen ---
function createShareScreen() {
	render(templateString, testingScreen)

	const textArea = testingScreen.querySelector<HTMLTextAreaElement>('#config-textarea')
	const shareButton = testingScreen.querySelector<HTMLButtonElement>('#share-button')
	const copyButton = testingScreen.querySelector<HTMLButtonElement>('#copy-button')
	const interleaveInput = testingScreen.querySelector<HTMLInputElement>('#interleave-text')
	const interleaveSlider = testingScreen.querySelector<HTMLInputElement>('#interleave-slider')
	const fileSizeEl = testingScreen.querySelector<HTMLSpanElement>('#file-size')
	const decodeButtonEl = testingScreen.querySelector<HTMLButtonElement>('#decode-button')
	function updateTextarea() {
		if (!textArea) return
		compressed_data = compressData()
		textArea.value = compressed_data.replace(/\r/g, '') // Remove only carriage returns
		// Update file size display in KB
		textArea.classList.remove('decompressed')
		fileSizeEl.textContent = `Size: ${(textArea.value.length / 1024).toFixed(2)} KB`
	}

	// --- Input handlers ---
	interleaveInput.addEventListener('input', () => {
		interleaveText = interleaveInput.value
		updateTextarea()
	})

	interleaveSlider.addEventListener('input', () => {
		interleaveSliderValue = Number(interleaveSlider.value)
		updateTextarea()
	})

	decodeButtonEl.addEventListener('click', () => {
		let decompressed_data = decompress(compressed_data)
		textArea.value = JSON.stringify(decompressed_data, null, 2)
		textArea.classList.add('decompressed')
		console.log(decompressed_data)
	})

	copyButton.addEventListener('click', () => {
		if (textArea) {
			textArea.select()
			navigator.clipboard
				.writeText(textArea.value)
				.then(() => {
					copyButton.textContent = 'Copied'
				})
				.then(() => {
					setTimeout(() => {
						copyButton.textContent = 'Copy'
					}, 2000)
				})
		}
	})

	shareButton.addEventListener('click', async () => {
		shareButton.textContent = 'Sharing...'
		updateTextarea()
		await shareTextHeadless()
		shareButton.textContent = 'Share'
	})
}

// --- Keyboard shortcut F6 ---
document.addEventListener('keydown', (event) => {
	if (event.key === 'F6') {
		event.preventDefault()
		if (testingScreen.classList.contains('hidden')) {
			const textArea = testingScreen.querySelector<HTMLTextAreaElement>('#config-textarea')
			if (textArea) {
				compressed_data = compressData()
				textArea.value = compressed_data.replace(/\r/g, '')
				const fileSizeEl = testingScreen.querySelector<HTMLSpanElement>('#file-size')
				fileSizeEl.textContent = `Size: ${(textArea.value.length / 1024).toFixed(2)} KB`
			}
		}
		testingScreen.classList.toggle('hidden')
	}
})

// --- Compress function ---
function compressData() {
	return compress(GLOBAL.data, {
		algorithm: 'pako',
		minify: true,
		braille: true,
		brailleMeta: true,
		interleaveText: `hyprsettings,${interleaveText}`,
		interleaveFreq: interleaveSliderValue,
	})
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', createShareScreen)

async function shareTextHeadless(text = compressed_data) {
	try {
		const res = await fetch('/api/share', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text }),
		})

		const data = await res.json()
		if (data.url) {
			console.log('Paste URL:', data.url)
		} else {
			console.error('Error from backend:', data.error)
		}
	} catch (err) {
		console.error('Fetch error:', err)
	}
}
