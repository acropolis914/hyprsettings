/**
 * Unit tests for scripts/utils/rgbaToHex.ts
 *
 * rgbaStringToHex converts a CSS `rgba(r, g, b, a)` string to
 * Hyprland's `0xAARRGGBB` hex format.
 */

import { describe, it, expect } from 'vitest'
import { rgbaStringToHex } from '../scripts/utils/rgbaToHex.ts'

describe('rgbaStringToHex', () => {
	it('converts opaque white rgba to 0xFFFFFFFF', () => {
		expect(rgbaStringToHex('rgba(255, 255, 255, 1)')).toBe('0xffffffff')
	})

	it('converts opaque black rgba to 0xFF000000', () => {
		expect(rgbaStringToHex('rgba(0, 0, 0, 1)')).toBe('0xff000000')
	})

	it('handles semi-transparent alpha', () => {
		// alpha = 0.5 → Math.round(0.5*255) = 128 → 0x80
		const result = rgbaStringToHex('rgba(255, 0, 0, 0.5)')
		expect(result).toBe('0x80ff0000')
	})

	it('handles fully transparent (alpha = 0)', () => {
		const result = rgbaStringToHex('rgba(0, 0, 255, 0)')
		expect(result).toBe('0x000000ff')
	})

	it('defaults alpha to 1 when only rgb values are given', () => {
		// Three components — alpha defaults to 1 → 0xFF
		const result = rgbaStringToHex('rgba(100, 150, 200)')
		expect(result).toBe('0xff6496c8')
	})

	it('returns the input unchanged for an invalid string', () => {
		const bad = 'not-a-color'
		expect(rgbaStringToHex(bad)).toBe(bad)
	})

	it('pads single-digit hex components to two digits', () => {
		// r=0, g=0, b=0, a=1 → all components are '00'
		expect(rgbaStringToHex('rgba(0, 0, 0, 1)')).toMatch(/^0x[0-9a-f]{8}$/)
	})

	it('produces exactly 10 characters (0x + 8 hex digits)', () => {
		const result = rgbaStringToHex('rgba(255, 128, 64, 1)')
		expect(result).toHaveLength(10)
		expect(result.startsWith('0x')).toBe(true)
	})
})
