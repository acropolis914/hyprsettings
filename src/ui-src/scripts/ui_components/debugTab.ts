import { GLOBAL } from '../GLOBAL.ts'
import { updateJsonViewerTheme } from '../utils/setupTheme.js'
let debugWindow = document.querySelector('.config-set#debug')

export default function initializeDebugTab() {
	debugWindow = document.querySelector('.config-set#debug')
	debugWindow.innerHTML = ''
	GLOBAL.onChange('data', () => {
		console.log('Global data changed. Rerendering debug tab')
		jsViewerInit()
		initGlobalDebugger()
	})
	GLOBAL.onChange('config', () => {
		console.log('Global config changed. Rerendering debug tab')
		initGlobalDebugger()
	})
	GLOBAL.onChange('persistence', () => {
		initGlobalDebugger()
	})
	initRE2Tester()
}

export function jsViewerInit() {
	let label = document.createElement('p')
	label.innerHTML = 'Data rendered by the UI'

	// Try to find existing viewer
	let viewer = debugWindow.querySelector('andypf-json-viewer')
	let viewerContainer = document.querySelector(
		'.config-set#debug>#json-viewer',
	)

	if (!viewer) {
		viewer = document.createElement('andypf-json-viewer')
		viewer.setAttribute('show-toolbar', 'true')
		viewerContainer = document.createElement('div')
		viewerContainer.setAttribute('id', 'json-viewer')
		viewerContainer.classList.add('editor-item')
		viewerContainer.tabIndex = 0
		viewerContainer.appendChild(label)
		viewerContainer.appendChild(viewer)
		debugWindow.appendChild(viewerContainer)
	}

	// Always update data
	viewer.data = GLOBAL.data

	// Keep global reference in sync
	window.jsViewer = viewer

	updateJsonViewerTheme(window.themeVariant)
}

function initGlobalDebugger() {
	const debugRoot = debugWindow
	function render() {
		// Reuse container if it exists
		let container = debugRoot.querySelector('#global-debugger')

		if (!container) {
			container = document.createElement('section')
			container.id = 'global-debugger'
			container.dataset.uuid = 'xxyyzz'
			container.tabIndex = 0
			container.classList.add('debug-panel')
			container.classList.add('editor-item')

			const selector = document.createElement('div')
			selector.classList.add('debug-selector')

			const viewer = document.createElement('pre')
			viewer.classList.add('debug-output')

			container.appendChild(selector)
			container.appendChild(viewer)
			debugRoot.appendChild(container)
		}

		const selector = container.querySelector('.debug-selector')
		const viewer = container.querySelector('.debug-output')

		// Clear old buttons to avoid duplicates
		selector.innerHTML = ''

		const globalKeys = Object.getOwnPropertyNames(GLOBAL)

		globalKeys.forEach((key) => {
			let hiddenkeys = [
				'length',
				'name',
				'prototype',
				'onChange',
				'setKey',
				'configText',
				'wikiEntry',
			]
			if (hiddenkeys.includes(key)) return
			const button = document.createElement('button')
			button.classList.add('debug-key-btn')
			button.textContent = key

			button.onclick = () => {
				const value = GLOBAL[key]

				// Clear previous viewer content
				viewer.innerHTML = ''

				if (
					typeof value === 'object' &&
					value !== null &&
					key !== '_listeners'
				) {
					let jsonviewer =
						document.createElement('andypf-json-viewer')
					jsonviewer.setAttribute('show-toolbar', 'true')
					jsonviewer.setAttribute(
						'theme',
						`default-${GLOBAL.themeVariant.toLowerCase()}`,
					)
					jsonviewer.data = JSON.stringify(value, null, 2)
					viewer.appendChild(jsonviewer)
				} else if (key === '_listeners') {
					for (const [
						listenerKey,
						callbacks,
					] of GLOBAL._listeners) {
						const section = document.createElement('div')
						section.style.marginBottom = '0.5rem'

						const header = document.createElement('strong')
						header.textContent = `Listeners for key: ${listenerKey}`
						section.appendChild(header)

						callbacks.forEach((cb, i) => {
							const cbButton =
								document.createElement('button')
							cbButton.textContent = `Callback ${i + 1}`
							cbButton.style.marginLeft = '0.5rem'

							// Create dialog
							const dialog =
								document.createElement('dialog')
							dialog.style.width = '400px'
							dialog.style.padding = '1rem'
							dialog.style.borderRadius = '0.4rem'
							dialog.style.border = '1px solid #666'
							dialog.style.whiteSpace = 'pre-wrap'
							dialog.textContent = cb.toString()

							// Add a close button inside dialog
							const closeBtn =
								document.createElement('button')
							closeBtn.textContent = 'Close'
							closeBtn.style.display = 'block'
							closeBtn.style.marginTop = '0.5rem'
							closeBtn.onclick = () => dialog.close()

							dialog.appendChild(closeBtn)
							document.body.appendChild(dialog)

							cbButton.onclick = (e) => {
								e.stopPropagation()
								dialog.showModal()
							}

							section.appendChild(cbButton)
						})

						viewer.appendChild(section)
					}
				} else {
					viewer.textContent = String(value)
				}
			}

			selector.appendChild(button)
		})

		const button = document.createElement('button')
		button.classList.add('debug-key-btn')
		button.textContent = 'Reload This'
		button.onclick = () => {
			render()
		}
		selector.appendChild(button)
	}
	;['config', 'persistence'].forEach((key) => {
		GLOBAL.onChange(key, () => {
			console.log('potaa')
			render()
		})
	})
	render()
}

function initRE2Tester() {
	const debugRoot =
		document.querySelector<HTMLDivElement>('.config-set#debug')
	if (!debugRoot) {
		console.log('Debug Window not found')
		return
	}

	let existing = debugRoot.querySelector<HTMLDivElement>('#re2-tab')
	if (existing) {
		existing.remove()
	}

	const re2Tab = document.createElement('section')
	re2Tab.id = 're2-tab'
	re2Tab.classList.add('editor-item', 're2-panel')
	re2Tab.tabIndex = 0

	const title = document.createElement('h3')
	title.classList.add('re2-title')
	title.textContent = 'RE2 Tester'

	const patternLabel = document.createElement('label')
	patternLabel.classList.add('re2-label')
	patternLabel.htmlFor = 're2-pattern-input'
	patternLabel.textContent = 'Pattern'

	const patternInput = document.createElement('input')
	patternInput.id = 're2-pattern-input'
	patternInput.type = 'text'
	patternInput.classList.add('re2-pattern-input')
	patternInput.placeholder = 'Example: ^foo.*bar$'

	const status = document.createElement('p')
	status.classList.add('re2-status')
	status.textContent = 'Enter a pattern to start matching.'

	const textLabel = document.createElement('label')
	textLabel.classList.add('re2-label')
	textLabel.htmlFor = 're2-text-input'
	textLabel.textContent = 'Text (one entry per line)'

	const textInput = document.createElement('textarea')
	textInput.id = 're2-text-input'
	textInput.classList.add('re2-text-input')
	textInput.placeholder = 'foo\\nbar\\nfoobar'
	textInput.rows = 8

	const optionsRow = document.createElement('div')
	optionsRow.classList.add('re2-options')

	const highlightLabel = document.createElement('label')
	highlightLabel.classList.add('re2-checkbox-label')

	const highlightToggle = document.createElement('input')
	highlightToggle.type = 'checkbox'
	highlightToggle.checked = true

	const highlightText = document.createElement('span')
	highlightText.textContent = 'Highlight matches when possible'

	highlightLabel.append(highlightToggle, highlightText)
	optionsRow.appendChild(highlightLabel)


	const results = document.createElement('div')
	results.classList.add('re2-results')

	const copyRow = document.createElement('div')
	copyRow.classList.add('re2-copy-row')

	const copyButton = document.createElement('button')
	copyButton.type = 'button'
	copyButton.classList.add('re2-copy-btn')
	copyButton.textContent = 'Copy report'
	copyButton.disabled = true

	const copyFeedback = document.createElement('span')
	copyFeedback.classList.add('re2-copy-feedback')

	copyRow.append(copyButton, copyFeedback)

	re2Tab.append(
		title,
		patternLabel,
		patternInput,
		status,
		textLabel,
		textInput,
		optionsRow,
		results,
	)
	debugRoot.appendChild(re2Tab)

	let re2Promise: Promise<any> | null = null
	let latestCompileRequest = 0
	let latestRenderRequest = 0
	let patternIsValid = false
	let patternError = ''
	let nativeHighlightRegex: RegExp | null = null
	let lastReportText = ''
	let clearCopyFeedbackTimer: number | null = null

	function getRe2() {
		if (!re2Promise) {
			re2Promise = import('re2js')
		}
		return re2Promise
	}

	async function matches(pattern: string, text: string) {
		const { RE2JS } = await getRe2()
		return RE2JS.matches(pattern, text)
	}

	function setStatus(
		kind: 'idle' | 'valid' | 'invalid' | 'working',
		message: string,
	) {
		status.classList.remove('is-valid', 'is-invalid', 'is-working')
		if (kind === 'valid') status.classList.add('is-valid')
		if (kind === 'invalid') status.classList.add('is-invalid')
		if (kind === 'working') status.classList.add('is-working')
		status.textContent = message
	}

	function setCopyFeedback(message: string) {
		copyFeedback.textContent = message
		if (clearCopyFeedbackTimer !== null) {
			window.clearTimeout(clearCopyFeedbackTimer)
		}
		clearCopyFeedbackTimer = window.setTimeout(() => {
			copyFeedback.textContent = ''
			clearCopyFeedbackTimer = null
		}, 2000)
	}

	function setReport(pattern: string, lines: string[], checks: boolean[]) {
		const totalLines = lines.length
		const matchedLines = checks.filter(Boolean).length
		const reportLines = lines.map((line, index) => {
			const state = checks[index] ? 'MATCH' : 'NO MATCH'
			const printableLine = line.length === 0 ? '(empty line)' : line
			return `${String(index + 1).padStart(3, '0')} | ${state.padEnd(8, ' ')} | ${printableLine}`
		})

		const patternState = pattern.trim()
			? patternIsValid
				? 'valid'
				: `invalid (${patternError || 'compile error'})`
			: 'empty'

		lastReportText = [
			'RE2 Pattern Matching Report',
			`Generated: ${new Date().toISOString()}`,
			'',
			`Pattern: ${pattern || '(empty)'}`,
			`Pattern status: ${patternState}`,
			`Highlight requested: ${highlightToggle.checked ? 'yes' : 'no'}`,
			`Matched lines: ${matchedLines}/${totalLines}`,
			'',
			'Line results:',
			reportLines.length > 0 ? reportLines.join('\n') : '(no lines provided)',
		].join('\n')

		copyButton.disabled = false
	}

	function addHighlightedLine(target: HTMLElement, lineText: string) {
		if (!nativeHighlightRegex || !highlightToggle.checked) {
			target.textContent = lineText
			return
		}

		nativeHighlightRegex.lastIndex = 0
		let cursor = 0
		let found = false
		let match = nativeHighlightRegex.exec(lineText)

		while (match) {
			found = true
			const matchText = match[0] ?? ''
			const matchStart = match.index
			const matchEnd = matchStart + matchText.length

			if (matchStart > cursor) {
				target.appendChild(
					document.createTextNode(
						lineText.slice(cursor, matchStart),
					),
				)
			}

			const mark = document.createElement('mark')
			mark.classList.add('re2-highlight')
			mark.textContent = lineText.slice(matchStart, matchEnd)
			target.appendChild(mark)

			cursor = matchEnd

			if (matchText.length === 0) {
				nativeHighlightRegex.lastIndex += 1
			}

			match = nativeHighlightRegex.exec(lineText)
		}

		if (!found) {
			target.textContent = lineText
			return
		}

		if (cursor < lineText.length) {
			target.appendChild(
				document.createTextNode(lineText.slice(cursor)),
			)
		}
	}

	async function renderResults() {
		const renderId = ++latestRenderRequest
		const pattern = patternInput.value
		const lines = textInput.value.split(/\r?\n/)

		results.innerHTML = ''
		results.appendChild(copyRow)
		copyButton.disabled = true
		lastReportText = ''

		if (!pattern.trim()) {
			const placeholder = document.createElement('p')
			placeholder.classList.add('re2-results-meta')
			placeholder.textContent = 'Add a pattern to evaluate lines.'
			results.appendChild(placeholder)
			setReport(pattern, lines, lines.map(() => false))
			return
		}

		if (!patternIsValid) {
			const placeholder = document.createElement('p')
			placeholder.classList.add('re2-results-meta')
			placeholder.textContent = patternError || 'Pattern is invalid.'
			results.appendChild(placeholder)
			setReport(pattern, lines, lines.map(() => false))
			return
		}

		if (lines.length === 0 || (lines.length === 1 && !lines[0])) {
			const placeholder = document.createElement('p')
			placeholder.classList.add('re2-results-meta')
			placeholder.textContent = 'Add lines to test your pattern.'
			results.appendChild(placeholder)
			setReport(pattern, [], [])
			return
		}

		const checks = await Promise.all(
			lines.map(async (line) => {
				try {
					return await matches(pattern, line)
				} catch {
					return false
				}
			}),
		)

		if (renderId !== latestRenderRequest) {
			return
		}

		setReport(pattern, lines, checks)

		let matchedCount = 0
		const list = document.createElement('div')
		list.classList.add('re2-results-list')

		lines.forEach((line, index) => {
			const isMatch = checks[index]
			if (isMatch) matchedCount += 1

			const row = document.createElement('div')
			row.classList.add('re2-result-row')
			if (isMatch) row.classList.add('is-match')

			const lineNumber = document.createElement('span')
			lineNumber.classList.add('re2-result-line')
			lineNumber.textContent = `${index + 1}`

			const lineStatus = document.createElement('span')
			lineStatus.classList.add('re2-result-status')
			lineStatus.textContent = isMatch ? 'match' : 'no match'

			const lineText = document.createElement('code')
			lineText.classList.add('re2-result-text')
			addHighlightedLine(lineText, line)

			row.append(lineNumber, lineStatus, lineText)
			list.appendChild(row)
		})

		const meta = document.createElement('p')
		meta.classList.add('re2-results-meta')
		meta.textContent = `${matchedCount}/${lines.length} line(s) matched`

		results.append(meta, list)
	}

	copyButton.addEventListener('click', async () => {
		if (!lastReportText) {
			setCopyFeedback('Nothing to copy yet.')
			return
		}

		try {
			await navigator.clipboard.writeText(lastReportText)
			setCopyFeedback('Report copied.')
		} catch {
			setCopyFeedback('Clipboard write failed.')
		}
	})

	async function onPatternInput() {
		const requestId = ++latestCompileRequest
		const pattern = patternInput.value

		if (!pattern.trim()) {
			patternIsValid = false
			patternError = ''
			nativeHighlightRegex = null
			setStatus('idle', 'Enter a pattern to start matching.')
			await renderResults()
			return
		}

		setStatus('working', 'Compiling pattern...')

		try {
			await matches(pattern, '')
			if (requestId !== latestCompileRequest) {
				return
			}

			patternIsValid = true
			patternError = ''

			try {
				nativeHighlightRegex = new RegExp(pattern, 'g')
			} catch {
				nativeHighlightRegex = null
			}

			setStatus(
				'valid',
				nativeHighlightRegex
					? 'Pattern compiled. Highlight enabled.'
					: 'Pattern compiled. Highlight unavailable for this pattern.',
			)
		} catch (error) {
			if (requestId !== latestCompileRequest) {
				return
			}

			patternIsValid = false
			patternError =
				error instanceof Error ? error.message : String(error)
			nativeHighlightRegex = null
			setStatus('invalid', `Pattern error: ${patternError}`)
		}

		await renderResults()
	}

	patternInput.addEventListener('input', () => {
		onPatternInput()
	})

	textInput.addEventListener('input', () => {
		renderResults()
	})

	highlightToggle.addEventListener('change', () => {
		renderResults()
	})

	renderResults()
}
