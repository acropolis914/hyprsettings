/**
 * Unit tests for scripts/utils/normalizeText.ts
 *
 * normalizeText strips spaces, hyphens, and the `.md` extension, then
 * lowercases the result.  It is used to build anchor IDs for wiki entries.
 */

import { describe, it, expect } from 'vitest'
import normalizeText from '../scripts/utils/normalizeText.ts'

describe('normalizeText', () => {
	it('lowercases the string', () => {
		expect(normalizeText('Hello')).toBe('hello')
	})

	it('removes spaces', () => {
		expect(normalizeText('hello world')).toBe('helloworld')
	})

	it('removes hyphens', () => {
		expect(normalizeText('hello-world')).toBe('helloworld')
	})

	it('removes .md extension', () => {
		expect(normalizeText('page.md')).toBe('page')
	})

	it('handles a full wiki-style slug', () => {
		expect(normalizeText('Bind Flags.md')).toBe('bindflags')
	})

	it('handles already-lowercase input', () => {
		expect(normalizeText('general')).toBe('general')
	})

	it('handles empty string', () => {
		expect(normalizeText('')).toBe('')
	})

	it('handles multiple spaces', () => {
		expect(normalizeText('a b c')).toBe('abc')
	})

	it('handles mixed case with hyphens and extension', () => {
		expect(normalizeText('My-Page.md')).toBe('mypage')
	})
})
