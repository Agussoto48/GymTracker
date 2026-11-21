import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { IDLE_STOPWATCH } from '../domain/stopwatch.ts'
import { loadStopwatch, saveStopwatch } from './stopwatch.ts'

const KEY = 'gymtracker.stopwatch'

describe('stopwatch storage', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('keeps a running stopwatch for its workout across reloads', () => {
    saveStopwatch('s1', { startedAt: 1_000, accumulatedMs: 2_000 })
    expect(loadStopwatch('s1')).toEqual({ startedAt: 1_000, accumulatedMs: 2_000 })
  })

  test('another workout starts idle', () => {
    saveStopwatch('s1', { startedAt: null, accumulatedMs: 5_000 })
    expect(loadStopwatch('s2')).toEqual(IDLE_STOPWATCH)
  })

  test('resetting removes the stored value', () => {
    saveStopwatch('s1', { startedAt: 1_000, accumulatedMs: 0 })
    saveStopwatch('s1', IDLE_STOPWATCH)
    expect(store.has(KEY)).toBe(false)
  })

  test.each([
    ['not JSON', '{'],
    ['invalid time', JSON.stringify({ sessionId: 's1', startedAt: 'x', accumulatedMs: 0 })],
  ])('a corrupt value (%s) reads as idle', (_label, raw) => {
    store.set(KEY, raw)
    expect(loadStopwatch('s1')).toEqual(IDLE_STOPWATCH)
  })

  test('without storage it reads idle and saving does not throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadStopwatch('s1')).toEqual(IDLE_STOPWATCH)
    expect(() => saveStopwatch('s1', { startedAt: 1, accumulatedMs: 0 })).not.toThrow()
  })
})
