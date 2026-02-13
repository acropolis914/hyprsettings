export function rgbaStringToHex(rgba: string): string {
	const values = rgba.match(/[\d.]+/g)

	if (!values || values.length < 3) {
		console.error(`Invalid rgba string: ${rgba}`)
		return rgba
	}

	const [r, g, b, a = 1] = values.map(Number)
	const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')

	// Returns format: 0xAARRGGBB
	return `0x${toHex(a * 255)}${toHex(r)}${toHex(g)}${toHex(b)}`
}
