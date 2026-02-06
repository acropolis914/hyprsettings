import { compress as cJsonCompress, decompress as cJsonDecompress } from 'compress-json'
import pako from 'pako'

export interface CompressorOptions {
	algorithm?: 'combo' | 'pako' | 'compress-json'
	minify?: boolean
	braille?: boolean
	brailleMeta?: boolean

	// Custom Metadata
	metaHeader?: string // e.g. "hyprsettings by acropolis"
	algoLabel?: string // e.g. "algo"

	// Interleaving
	interleaveFreq?: number
	interleaveText?: string
}

const DEFAULTS = {
	header: 'hyprsettings by acropolis',
	label: 'algo',
}

// --- Pure Helpers ---

function bytesToBase64(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
	const binStr = atob(base64.replace(/\s/g, '')) // simple strip whitespace
	const bytes = new Uint8Array(binStr.length)
	for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
	return bytes
}

// Fixed: Shift by 0x2801 to avoid 0x2800 (Blank)
function toBraille(bytes: Uint8Array): string {
	let res = ''
	for (let i = 0; i < bytes.length; i++)
		// 0x2801 avoids the blank '⠀' char.
		// Range becomes U+2801 (⠁) to U+2900 (⤀)
		res += String.fromCharCode(0x2801 + bytes[i])
	return res
}

function fromBrailleToBytes(str: string): Uint8Array {
	const bytes: number[] = []
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i)
		// Fixed: Updated detection range to match the new shift (0x2801 - 0x2900)
		// This automatically ignores interleaved text which is outside this range.
		if (code >= 0x2801 && code <= 0x2900) {
			bytes.push(code - 0x2801)
		}
	}
	return new Uint8Array(bytes)
}

export function cleanObject(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(cleanObject).filter((v) => v !== null && v !== undefined)
	} else if (typeof obj === 'object' && obj !== null) {
		const newObj: any = {}
		for (const key in obj) {
			// Nuclear cleanup list
			const blocklist = [
				'uuid',
				'tbs',
				'line',
				'lines',
				'line_number',
				'lineNumber',
				'lineno',
				'startLine',
				'endLine',
				'loc',
				'range',
			]
			if (blocklist.includes(key)) continue
			if (obj[key] === null) continue

			// Path Replacement Logic
			if (key === 'value' && obj.type === 'FILE' && typeof obj[key] === 'string') {
				// Replaces /home/<username>/ with ~/
				newObj[key] = obj[key].replace(/^\/home\/[^/]+\//, '~/')
			} else {
				newObj[key] = cleanObject(obj[key])
			}
		}
		return newObj
	}
	return obj
}

// --- Main API ---

export function compress(inputData: any, options: CompressorOptions = {}): string {
	const algo = options.algorithm || 'combo'
	const metaHeader = options.metaHeader || DEFAULTS.header
	const algoLabel = options.algoLabel || DEFAULTS.label

	// 1. Prepare Input
	let json = inputData
	if (options.minify) {
		json = cleanObject(json)
	}
	const minifiedStr = JSON.stringify(json)

	// 2. Compress to Bytes
	let outputBytes: Uint8Array

	if (algo === 'compress-json') {
		const compressedObj = cJsonCompress(json)
		outputBytes = new TextEncoder().encode(JSON.stringify(compressedObj))
	} else if (algo === 'pako') {
		outputBytes = pako.deflate(minifiedStr)
	} else {
		// Default: combo
		const compressedObj = cJsonCompress(json)
		outputBytes = pako.deflate(JSON.stringify(compressedObj))
	}

	// 3. Construct Header
	const headerStr = `${metaHeader}\n${algoLabel}: ${algo}\n`

	// 4. Format Output (Text vs Braille)
	if (!options.braille) {
		let textBody = ''
		// If it's pure text algo, keep it readable, otherwise Base64
		if (algo === 'compress-json') {
			textBody = new TextDecoder().decode(outputBytes)
		} else {
			textBody = bytesToBase64(outputBytes)
		}
		return headerStr + textBody
	}

	// Braille Mode
	let bodyBraille = toBraille(outputBytes)
	let finalStr = ''

	if (options.brailleMeta) {
		const headerBytes = new TextEncoder().encode(headerStr)
		finalStr = toBraille(headerBytes) + bodyBraille
	} else {
		finalStr = headerStr + bodyBraille
	}

	// 5. Interleaving
	const freq = options.interleaveFreq || 0
	const txt = options.interleaveText || ''
	const parts = txt.split(/[ ,]+/).filter((x) => x.length > 0)

	if (freq > 0 && parts.length > 0) {
		let interleaved = ''
		let partIdx = 0
		for (let i = 0; i < finalStr.length; i++) {
			interleaved += finalStr[i]
			if ((i + 1) % freq === 0) {
				interleaved += parts[partIdx]
				partIdx = (partIdx + 1) % parts.length
			}
		}
		return interleaved
	}

	return finalStr
}

export function decompress(rawString: string, options: { metaHeader?: string; algoLabel?: string } = {}): any {
	const raw = rawString.trim()
	if (!raw) throw new Error('Empty input')

	const metaHeader = options.metaHeader || DEFAULTS.header
	const algoLabel = options.algoLabel || DEFAULTS.label
	const labelPrefix = `${algoLabel}:`

	let algo = ''
	let bodyBytes: Uint8Array

	// 1. Detect Mode
	// If it starts with the readable header, it's Text Mode (Base64 or Raw)
	if (raw.startsWith(metaHeader)) {
		const lines = raw.split('\n')
		let contentStartLine = 0

		// Iterate to find the algo line
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith(labelPrefix)) {
				// Found it: "algo: combo"
				const parts = lines[i].split(':')
				if (parts.length > 1) {
					algo = parts[1].trim()
					contentStartLine = i + 1
					break
				}
			}
		}

		if (!algo) throw new Error(`Could not find '${labelPrefix}' line in header.`)

		const content = lines.slice(contentStartLine).join('\n')

		// Check if content part is Braille (Edge case: Header plain, Body braille)
		// We check first few chars
		// Fix: Check for new Braille range AND U+2900 (⤀)
		const hasBraille = /[\u2801-\u2900]/.test(content.substring(0, 100))

		if (hasBraille) {
			bodyBytes = fromBrailleToBytes(content)
		} else {
			const isBinary = algo.includes('pako') || algo.includes('combo')
			bodyBytes = isBinary ? base64ToBytes(content) : new TextEncoder().encode(content)
		}
	} else {
		// Braille Header Mode (or fully interleaved)
		// Decode EVERYTHING first. `fromBrailleToBytes` strips interleave noise.
		const allBytes = fromBrailleToBytes(raw)
		const fullStr = new TextDecoder().decode(allBytes)

		// Find the Algo Line in the decoded text
		const lines = fullStr.split('\n')
		let bodyStartIndex = -1

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith(labelPrefix)) {
				const parts = lines[i].split(':')
				algo = parts[1].trim()

				// Re-calculate where the body bytes start
				// We find the index of the newline character after this line.
				const algoLineIndex = fullStr.indexOf(lines[i])
				bodyStartIndex = fullStr.indexOf('\n', algoLineIndex) + 1
				break
			}
		}

		if (!algo || bodyStartIndex === -1) {
			throw new Error('Valid header not found in Braille data.')
		}

		bodyBytes = allBytes.slice(bodyStartIndex)
	}

	// 2. Decompress Bytes
	if (algo === 'pako') {
		const str = new TextDecoder().decode(pako.inflate(bodyBytes))
		return JSON.parse(str)
	} else if (algo === 'combo') {
		const str = new TextDecoder().decode(pako.inflate(bodyBytes))
		return cJsonDecompress(JSON.parse(str))
	} else if (algo === 'compress-json') {
		const str = new TextDecoder().decode(bodyBytes)
		return cJsonDecompress(JSON.parse(str))
	}

	throw new Error(`Unknown algorithm: ${algo}`)
}
