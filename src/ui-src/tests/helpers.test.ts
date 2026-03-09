/**
 * Unit tests for scripts/utils/helpers.js
 *
 * Covers:
 *   - debounce: calls the wrapped function only after the wait period elapses
 *   - waitFor: resolves once a condition becomes truthy; rejects on timeout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce, waitFor } from '../scripts/utils/helpers.js'

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

describe('debounce', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.useRealTimers()
	})

	it('does not call the function immediately', () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		debounced()
		expect(fn).not.toHaveBeenCalled()
	})

	it('calls the function after the wait period', () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		debounced()
		vi.advanceTimersByTime(100)
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('resets the timer on each call', () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		debounced()
		vi.advanceTimersByTime(50)
		debounced()           // reset
		vi.advanceTimersByTime(50) // only 50ms since last call
		expect(fn).not.toHaveBeenCalled()
		vi.advanceTimersByTime(50) // now 100ms since last call
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('calls the function only once for rapid successive calls', () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 200)
		for (let i = 0; i < 10; i++) debounced()
		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('passes arguments to the wrapped function', () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		debounced('hello', 42)
		vi.advanceTimersByTime(100)
		expect(fn).toHaveBeenCalledWith('hello', 42)
	})

	it('uses the default wait of 100ms when not specified', () => {
		const fn = vi.fn()
		const debounced = debounce(fn) // default wait
		debounced()
		vi.advanceTimersByTime(99)
		expect(fn).not.toHaveBeenCalled()
		vi.advanceTimersByTime(1)
		expect(fn).toHaveBeenCalledTimes(1)
	})
})

// ---------------------------------------------------------------------------
// waitFor
// ---------------------------------------------------------------------------

describe('waitFor', () => {
	it('resolves immediately when condition is already true', async () => {
		await expect(waitFor(() => true)).resolves.toBeUndefined()
	})

	it('resolves once the condition becomes true', async () => {
		let flag = false
		setTimeout(() => { flag = true }, 60)
		await expect(waitFor(() => flag, { interval: 20, timeout: 500 })).resolves.toBeUndefined()
	})

	it('rejects with Timeout error when condition never becomes true', async () => {
		await expect(
			waitFor(() => false, { interval: 10, timeout: 50 })
		).rejects.toThrow('Timeout')
	})
})
