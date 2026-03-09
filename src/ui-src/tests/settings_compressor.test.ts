/**
 * Unit tests for scripts/utils/settings_compressor.ts
 *
 * Covers the public API:
 *   - cleanObject    – strips internal fields, normalises home paths
 *   - compress       – serialises + deflates a config object to a string
 *   - decompress     – restores the original object from a compressed string
 *
 * All tests are algorithm-agnostic where possible so they remain valid if
 * the default algorithm changes.
 */

import { describe, it, expect } from 'vitest'
import {
	cleanObject,
	compress,
	decompress,
} from '../scripts/utils/settings_compressor.ts'

// ---------------------------------------------------------------------------
// cleanObject
// ---------------------------------------------------------------------------

describe('cleanObject', () => {
	it('removes blocked internal keys', () => {
		const input = { name: 'general', uuid: 'abc12345', value: '2', line_number: 3 }
		const result = cleanObject(input)
		expect(result).not.toHaveProperty('uuid')
		expect(result).not.toHaveProperty('line_number')
		expect(result).toHaveProperty('name', 'general')
		expect(result).toHaveProperty('value', '2')
	})

	it('cleans recursively into nested objects', () => {
		const input = { outer: { uuid: 'x', data: 42 } }
		const result = cleanObject(input)
		expect(result.outer).not.toHaveProperty('uuid')
		expect(result.outer).toHaveProperty('data', 42)
	})

	it('cleans array elements', () => {
		const input = [{ uuid: 'x', value: 1 }, { uuid: 'y', value: 2 }]
		const result = cleanObject(input)
		expect(result[0]).not.toHaveProperty('uuid')
		expect(result[0]).toHaveProperty('value', 1)
	})

	it('replaces /home/<user>/ with ~/ in FILE node values', () => {
		const input = { type: 'FILE', value: '/home/alice/hyprland.conf' }
		const result = cleanObject(input)
		expect(result.value).toBe('~/hyprland.conf')
	})

	it('does not alter non-home-path FILE values', () => {
		const input = { type: 'FILE', value: '/etc/hyprland.conf' }
		const result = cleanObject(input)
		expect(result.value).toBe('/etc/hyprland.conf')
	})

	it('returns primitives unchanged', () => {
		expect(cleanObject(42)).toBe(42)
		expect(cleanObject('hello')).toBe('hello')
		expect(cleanObject(true)).toBe(true)
	})

	it('removes null values from objects', () => {
		const input = { a: 1, b: null }
		const result = cleanObject(input)
		expect(result).not.toHaveProperty('b')
	})

	it('removes null values from arrays', () => {
		const result = cleanObject([1, null, 3])
		expect(result).toEqual([1, 3])
	})
})

// ---------------------------------------------------------------------------
// compress / decompress round-trips
// ---------------------------------------------------------------------------

const SAMPLE = { type: 'GROUP', name: 'general', children: [{ type: 'KEY', name: 'border_size', value: '2' }] }

describe('compress + decompress (combo algorithm)', () => {
	it('produces a non-empty string', () => {
		const out = compress(SAMPLE)
		expect(typeof out).toBe('string')
		expect(out.length).toBeGreaterThan(0)
	})

	it('round-trips the original object', () => {
		const compressed = compress(SAMPLE)
		const restored = decompress(compressed)
		expect(restored).toEqual(SAMPLE)
	})

	it('includes the header line', () => {
		const compressed = compress(SAMPLE)
		expect(compressed.startsWith('hyprsettings by acropolis')).toBe(true)
	})

	it('includes the algo label', () => {
		const compressed = compress(SAMPLE)
		expect(compressed).toContain('algo: combo')
	})
})

describe('compress + decompress (pako algorithm)', () => {
	it('round-trips with pako', () => {
		const compressed = compress(SAMPLE, { algorithm: 'pako' })
		const restored = decompress(compressed)
		expect(restored).toEqual(SAMPLE)
	})
})

describe('compress + decompress (compress-json algorithm)', () => {
	it('round-trips with compress-json', () => {
		const compressed = compress(SAMPLE, { algorithm: 'compress-json' })
		const restored = decompress(compressed)
		expect(restored).toEqual(SAMPLE)
	})
})

describe('compress with minify', () => {
	it('round-trips when minify=true (uuid stripped from output)', () => {
		const withUUID = { ...SAMPLE, uuid: 'deadbeef' }
		const compressed = compress(withUUID, { minify: true })
		const restored = decompress(compressed)
		// uuid should be stripped by cleanObject during minification
		expect(restored).not.toHaveProperty('uuid')
		expect(restored.name).toBe('general')
	})
})

describe('decompress error handling', () => {
	it('throws on empty input', () => {
		expect(() => decompress('')).toThrow()
	})

	it('throws on completely invalid input', () => {
		expect(() => decompress('not-valid-at-all')).toThrow()
	})
})
