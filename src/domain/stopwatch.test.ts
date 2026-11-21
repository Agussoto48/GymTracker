import { describe, expect, test } from 'vitest'
import {
  IDLE_STOPWATCH,
  formatStopwatch,
  parseStopwatch,
  startStopwatch,
  stopStopwatch,
  stopwatchElapsed,
  stopwatchParts,
  stopwatchStatus,
} from './stopwatch.ts'

describe('stopwatch', () => {
  test('starts idle at zero', () => {
    expect(stopwatchStatus(IDLE_STOPWATCH)).toBe('idle')
    expect(stopwatchElapsed(IDLE_STOPWATCH, 5_000)).toBe(0)
  })

  test('counts from the start time while running', () => {
    const running = startStopwatch(IDLE_STOPWATCH, 1_000)
    expect(stopwatchStatus(running)).toBe('running')
    expect(stopwatchElapsed(running, 84_000)).toBe(83_000)
  })

  test('stop freezes the time and start resumes from it', () => {
    const stopped = stopStopwatch(startStopwatch(IDLE_STOPWATCH, 0), 10_000)
    expect(stopwatchStatus(stopped)).toBe('stopped')
    expect(stopwatchElapsed(stopped, 999_000)).toBe(10_000)
    const resumed = startStopwatch(stopped, 50_000)
    expect(stopwatchElapsed(resumed, 55_000)).toBe(15_000)
  })

  test('starting while running or stopping while not running changes nothing', () => {
    const running = startStopwatch(IDLE_STOPWATCH, 1_000)
    expect(startStopwatch(running, 9_000)).toBe(running)
    expect(stopStopwatch(IDLE_STOPWATCH, 9_000)).toBe(IDLE_STOPWATCH)
  })

  test('never goes negative if the clock moved back', () => {
    expect(stopwatchElapsed(startStopwatch(IDLE_STOPWATCH, 10_000), 4_000)).toBe(0)
  })
})

describe('formatStopwatch', () => {
  test.each([
    [0, '00:00,00'],
    [9, '00:00,00'],
    [10, '00:00,01'],
    [999, '00:00,99'],
    [83_420, '01:23,42'],
    [3_599_999, '59:59,99'],
    [3_600_000, '1:00:00,00'],
    [36_061_050, '10:01:01,05'],
    [-5, '00:00,00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatStopwatch(ms)).toBe(text)
  })

  test('splits the hundredths from the rest', () => {
    expect(stopwatchParts(83_420)).toEqual({ whole: '01:23', hundredths: '42' })
  })
})

describe('parseStopwatch', () => {
  test('accepts idle, running and stopped values', () => {
    expect(parseStopwatch({ startedAt: null, accumulatedMs: 0 })).toEqual(IDLE_STOPWATCH)
    expect(parseStopwatch({ startedAt: 1_000, accumulatedMs: 500 })).toEqual({ startedAt: 1_000, accumulatedMs: 500 })
  })

  test.each([
    ['null', null],
    ['a string', 'x'],
    ['missing time', { startedAt: null }],
    ['negative time', { startedAt: null, accumulatedMs: -1 }],
    ['text start', { startedAt: '1', accumulatedMs: 0 }],
    ['infinite start', { startedAt: Infinity, accumulatedMs: 0 }],
  ])('rejects %s', (_label, value) => {
    expect(parseStopwatch(value)).toBeNull()
  })
})
