import { describe, expect, test } from 'vitest'
import type { WorkoutSession, WorkoutSet } from './types.ts'
import {
  findLastPerformance,
  isValidRpe,
  parseDecimal,
  stepWeight,
  suggestNextSet,
  validateSet,
  withDerivedExerciseIds,
} from './workout.ts'

const set = (value: number | null, reps: number, unit: 'kg' | 'lb' = 'kg'): WorkoutSet => ({
  id: `${value}-${reps}`,
  weight: value === null ? null : { value, unit },
  reps,
  rpe: null,
  completedAt: '2026-11-10T18:00:00.000Z',
})

function session(id: string, startedAt: string, finished: boolean, sets: WorkoutSet[], exerciseId = 'pec'): WorkoutSession {
  return withDerivedExerciseIds({
    id,
    routineId: null,
    startedAt,
    finishedAt: finished ? startedAt : null,
    exercises: [{ exerciseId, notes: '', sets }],
    exerciseIds: [],
  })
}

describe('validateSet', () => {
  test('accepts a weighted set', () => {
    expect(validateSet({ weight: 62.5, unit: 'kg', reps: 8, rpe: 8.5 }, 'weighted')).toEqual({
      ok: true,
      value: { weight: { value: 62.5, unit: 'kg' }, reps: 8, rpe: 8.5 },
    })
  })

  test('zero is a real measurement, not "missing"', () => {
    const result = validateSet({ weight: 0, unit: 'kg', reps: 0, rpe: null }, 'weighted')
    expect(result.ok && result.value).toEqual({ weight: { value: 0, unit: 'kg' }, reps: 0, rpe: null })
  })

  test('requires weight for weighted exercises only', () => {
    expect(validateSet({ weight: null, unit: 'kg', reps: 10, rpe: null }, 'weighted').ok).toBe(false)
    const bodyweight = validateSet({ weight: null, unit: 'kg', reps: 10, rpe: null }, 'bodyweight')
    expect(bodyweight.ok && bodyweight.value.weight).toBeNull()
  })

  test('keeps added load for bodyweight exercises', () => {
    const result = validateSet({ weight: 10, unit: 'lb', reps: 6, rpe: null }, 'bodyweight')
    expect(result.ok && result.value.weight).toEqual({ value: 10, unit: 'lb' })
  })

  test.each([
    ['negative weight', { weight: -5 }, 'weight'],
    ['NaN weight', { weight: Number.NaN }, 'weight'],
    ['weight over max', { weight: 2000.5 }, 'weight'],
    ['three decimals', { weight: 62.125 }, 'weight'],
    ['missing reps', { reps: null }, 'reps'],
    ['fractional reps', { reps: 8.5 }, 'reps'],
    ['too many reps', { reps: 201 }, 'reps'],
    ['rpe not in 0.5 steps', { rpe: 8.3 }, 'rpe'],
    ['rpe over 10', { rpe: 11 }, 'rpe'],
  ])('rejects %s', (_label, patch, field) => {
    const result = validateSet({ weight: 60, unit: 'kg', reps: 8, rpe: null, ...patch }, 'weighted')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual([field])
  })
})

test('isValidRpe accepts 1–10 in half steps', () => {
  expect([1, 6.5, 10].every(isValidRpe)).toBe(true)
  expect([0.5, 10.5, 7.25].some(isValidRpe)).toBe(false)
})

describe('parseDecimal', () => {
  test.each([
    ['62,5', 62.5],
    ['62.5', 62.5],
    [' 80 ', 80],
    ['.5', 0.5],
    ['', null],
  ])('parses %j', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected)
  })

  test('returns NaN for garbage', () => {
    expect(parseDecimal('6o')).toBeNaN()
    expect(parseDecimal('1,2,3')).toBeNaN()
  })
})

describe('stepWeight', () => {
  test('uses 2.5 kg and 5 lb steps', () => {
    expect(stepWeight(60, 'kg', 1)).toBe(62.5)
    expect(stepWeight(135, 'lb', -1)).toBe(130)
  })

  test('never goes below zero', () => {
    expect(stepWeight(1, 'kg', -1)).toBe(0)
  })
})

describe('findLastPerformance', () => {
  const older = session('a', '2026-11-03T18:00:00.000Z', true, [set(55, 10)])
  const newer = session('b', '2026-11-06T18:00:00.000Z', true, [set(60, 10), set(60, 9)])
  const active = session('c', '2026-11-10T18:00:00.000Z', false, [set(65, 8)])

  test('picks the newest finished session regardless of order', () => {
    expect(findLastPerformance([newer, older, active], 'pec')?.sessionId).toBe('b')
  })

  test('ignores the current session and sessions without sets for the exercise', () => {
    const empty = session('d', '2026-11-08T18:00:00.000Z', true, [])
    expect(findLastPerformance([older, empty], 'pec', 'b')?.sessionId).toBe('a')
  })

  test('returns null without history', () => {
    expect(findLastPerformance([older], 'squat')).toBeNull()
  })
})

describe('suggestNextSet', () => {
  const last = [set(60, 10), set(60, 9)]

  test('uses the same set number from last time', () => {
    expect(suggestNextSet(last, [])).toMatchObject({ weight: { value: 60 }, reps: 10, source: 'last-time' })
    expect(suggestNextSet(last, [set(65, 8)])).toMatchObject({ reps: 9, source: 'last-time' })
  })

  test('falls back to the previous set of this session', () => {
    expect(suggestNextSet(last, [set(60, 10), set(60, 9), set(62.5, 8)])).toMatchObject({
      weight: { value: 62.5 },
      reps: 8,
      source: 'previous-set',
    })
  })

  test('returns null with no history and no sets', () => {
    expect(suggestNextSet([], [])).toBeNull()
  })
})
