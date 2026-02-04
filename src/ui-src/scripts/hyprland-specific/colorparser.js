function hyprIntToRGBAString(colorInt) {
	const hex = colorInt >>> 0 // ensure unsigned
	let r, g, b, a

	if (hex > 0xffffff) {
		// 8-digit hex with alpha
		a = ((hex >> 24) & 0xff) / 255
		r = (hex >> 16) & 0xff
		g = (hex >> 8) & 0xff
		b = hex & 0xff
	} else {
		// 6-digit hex, fully opaque
		a = 1
		r = (hex >> 16) & 0xff
		g = (hex >> 8) & 0xff
		b = hex & 0xff
	}

	return `rgba(${r},${g},${b},${a})`
}

function parseHex6(hex6) {
	hex6 = hex6.replace(/^0x/i, '')
	if (!/^[0-9a-fA-F]{6}$/.test(hex6)) throw new Error('Invalid 6-digit hex')
	const intVal = parseInt(hex6, 16)
	return hyprIntToRGBAString(intVal)
}

function parseHex8(hex8) {
	hex8 = hex8.replace(/^0x/i, '')
	if (!/^[0-9a-fA-F]{8}$/.test(hex8)) throw new Error('Invalid 8-digit hex')
	const intVal = parseInt(hex8, 16)
	return hyprIntToRGBAString(intVal)
}

function parseRGBHex(rgbHex) {
	const m = rgbHex.match(/^rgb\(([0-9a-fA-F]{6})\)$/i)
	if (!m) throw new Error('Invalid rgb() hex')
	const intVal = parseInt(m[1], 16)
	return hyprIntToRGBAString(intVal)
}

function parseRGBAHex(rgbaHex) {
	const m = rgbaHex.match(/^rgba\(([0-9a-fA-F]{8})\)$/i)
	if (!m) throw new Error('Invalid rgba() hex')
	const intVal = parseInt(m[1], 16)
	return hyprIntToRGBAString(intVal)
}

function parseRGBFunc(rgbStr) {
	const m = rgbStr.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i)
	if (!m) throw new Error('Invalid rgb(r,g,b)')
	return `rgba(${m[1]},${m[2]},${m[3]},1)`
}

function parseRGBAFunc(rgbaStr) {
	// match rgba(r,g,b,a) with optional spaces, a = 0-1
	const m = rgbaStr.match(
		/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0|1|0?\.\d+)\s*\)$/i,
	)
	if (!m) throw new Error('Invalid rgba(r,g,b,a)')
	return `rgba(${m[1]},${m[2]},${m[3]},${m[4]})`
}

export function parseHyprColor(val) {
	if (typeof val === 'number') return hyprIntToRGBAString(val)
	if (/^0x[0-9a-fA-F]{6}$/.test(val)) return parseHex6(val)
	if (/^0x[0-9a-fA-F]{8}$/.test(val)) return parseHex8(val)
	if (/^rgb\([0-9a-fA-F]{6}\)$/i.test(val)) return parseRGBHex(val)
	if (/^rgba\([0-9a-fA-F]{8}\)$/i.test(val)) return parseRGBAHex(val)
	if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(val))
		return parseRGBFunc(val)
	if (
		/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/i.test(
			val,
		)
	)
		return parseRGBAFunc(val)
	throw new Error('Unsupported color format: ' + val)
}

// // --- Tests ---
// console.log(parseHyprColor(0x112233));           // rgba(17,34,51,0)
// console.log(parseHyprColor(0xFF112233));         // rgba(17,34,51,1)
// console.log(parseHyprColor("0x112233"));         // rgba(17,34,51,0)
// console.log(parseHyprColor("0xFF112233"));       // rgba(17,34,51,1)
// console.log(parseHyprColor("rgb(112233)"));      // rgba(17,34,51,0)
// console.log(parseHyprColor("rgba(FF112233)"));   // rgba(17,34,51,1)
// console.log(parseHyprColor("rgb(10,20,30)"));    // rgba(10,20,30,1)
// console.log(parseHyprColor("rgba(10,20,30, 0.5)"));// rgba(10,20,30,0.5)
