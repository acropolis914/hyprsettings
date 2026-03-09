/**
 * Unit tests for scripts/utils/utils.ts
 *
 * Covers:
 *   - splitWithRemainder: splits a string at `sep` up to `limit` times, then
 *     appends all remaining pieces joined back with `sep` as a final element.
 *   - makeUUID: returns a hex string of the requested length, unique each call.
 *
 * Note: utils.ts transitively imports modules (backendAPI, _configRenderer,
 * setupTheme) that have DOM side-effects at module-initialisation time.
 * We mock those imports so the pure utility functions can be tested headlessly.
 */

import { describe, it, expect, vi } from 'vitest'

// Mock modules with DOM side-effects before importing the module under test
vi.mock('../scripts/utils/backendAPI.js', () => ({ Backend: {}, saveConfigDebounced: vi.fn() }))
vi.mock('../scripts/GLOBAL.ts', () => ({ GLOBAL: { groupsave: false, config: { dryrun: true } } }))
vi.mock('../scripts/GLOBAL.js', () => ({ GLOBAL: { groupsave: false, config: { dryrun: true } } }))
vi.mock('../scripts/ConfigRenderer/_configRenderer.ts', () => ({ _configRenderer: vi.fn() }))

import { splitWithRemainder, makeUUID } from '../scripts/utils/utils.ts'

// ---------------------------------------------------------------------------
// splitWithRemainder
// ---------------------------------------------------------------------------

describe('splitWithRemainder', () => {
it('returns all parts when count <= limit', () => {
expect(splitWithRemainder('a:b:c', ':', 5)).toEqual(['a', 'b', 'c'])
})

it('returns first limit parts + remainder as the last element', () => {
// 'a:b:c:d' split at ':' limit=2 → ['a', 'b'] + remainder 'c:d'
expect(splitWithRemainder('a:b:c:d', ':', 2)).toEqual(['a', 'b', 'c:d'])
})

it('handles exactly limit parts (no remainder)', () => {
expect(splitWithRemainder('a:b', ':', 2)).toEqual(['a', 'b'])
})

it('handles a single part (no separator present)', () => {
expect(splitWithRemainder('hello', ':', 3)).toEqual(['hello'])
})

it('works with limit=1 (appends all remaining joined parts)', () => {
// ['a'] + remainder 'b:c'
expect(splitWithRemainder('a:b:c', ':', 1)).toEqual(['a', 'b:c'])
})

it('works with slash separator', () => {
// ['root', 'file', 'conf'] + remainder 'hyprland.conf'
expect(splitWithRemainder('root/file/conf/hyprland.conf', '/', 3)).toEqual([
'root',
'file',
'conf',
'hyprland.conf',
])
})

it('handles an empty string', () => {
expect(splitWithRemainder('', ':', 2)).toEqual([''])
})
})

// ---------------------------------------------------------------------------
// makeUUID
// ---------------------------------------------------------------------------

describe('makeUUID', () => {
it('returns a string', () => {
expect(typeof makeUUID()).toBe('string')
})

it('returns a string of the default length (8)', () => {
expect(makeUUID()).toHaveLength(8)
})

it('returns a string of a custom length', () => {
expect(makeUUID(16)).toHaveLength(16)
expect(makeUUID(4)).toHaveLength(4)
})

it('contains only hexadecimal characters', () => {
for (let i = 0; i < 20; i++) {
expect(makeUUID(32)).toMatch(/^[0-9a-f]+$/)
}
})

it('generates unique values on successive calls', () => {
const ids = new Set(Array.from({ length: 200 }, () => makeUUID()))
expect(ids.size).toBeGreaterThan(190)
})
})
