import { describe, expect, test } from 'vitest'
import { count, formatDuration, formatMonth, formatSet, formatTarget } from './format.ts'

describe('formatDuration', () => {
  test.each([
    [0, '0 min'],
    [52, '52 min'],
    [60, '1 h'],
    [65, '1 h 5 min'],
    [135, '2 h 15 min'],
  ])('%i minutes → %s', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text)
  })
})

test('formatMonth capitalises and drops "de"', () => {
  expect(formatMonth('2026-11')).toBe('Noviembre 2026')
  expect(formatMonth('2027-01')).toBe('Enero 2027')
})

test('count picks singular or plural', () => {
  expect(count(1, 'serie', 'series')).toBe('1 serie')
  expect(count(0, 'serie', 'series')).toBe('0 series')
})

test('formatSet reads naturally for each kind', () => {
  expect(formatSet({ weight: { value: 62.5, unit: 'kg' }, reps: 10 }, 'weighted')).toBe('62,5 kg × 10')
  expect(formatSet({ weight: null, reps: 8 }, 'bodyweight')).toBe('8 reps')
  expect(formatSet({ weight: { value: 0, unit: 'kg' }, reps: 8 }, 'bodyweight')).toBe('8 reps')
  expect(formatSet({ weight: { value: 10, unit: 'lb' }, reps: 6 }, 'bodyweight')).toBe('+10 lb × 6')
})

test('formatTarget shows only the parts that are set', () => {
  const base = { sets: null, reps: null, weight: null, unit: 'kg' as const, kind: 'weighted' as const }
  expect(formatTarget({ ...base, sets: 3, reps: 10, weight: 40 })).toBe('3 × 10 · 40 kg')
  expect(formatTarget({ ...base, sets: 3 })).toBe('3 series')
  expect(formatTarget({ ...base, reps: 8, weight: 5, kind: 'bodyweight' })).toBe('8 reps · +5 kg')
  expect(formatTarget({ ...base, weight: 0, kind: 'bodyweight' })).toBe('')
})
