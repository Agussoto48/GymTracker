import { describe, expect, test } from 'vitest'
import {
  deduceKind,
  EXERCISE_NAME_MAX_LENGTH,
  compareByName,
  isDuplicateName,
  nameKey,
  normalizeName,
  validateExercise,
  type ExerciseInput,
} from './exercise.ts'

const valid: ExerciseInput = {
  name: 'Press banca',
  kind: 'weighted',
  defaultUnit: 'kg',
  notes: '',
}

describe('normalizeName', () => {
  test('trims and collapses whitespace', () => {
    expect(normalizeName('  Press    banca  ')).toBe('Press banca')
  })
})

describe('nameKey', () => {
  test('ignores case and accents', () => {
    expect(nameKey('Extensión de Cuádriceps')).toBe(nameKey('extension de cuadriceps'))
  })
})

describe('validateExercise', () => {
  test('accepts valid input and normalizes it', () => {
    const result = validateExercise({ ...valid, name: '  Press   banca ', notes: '  asiento en 4 ' })
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Press banca',
        kind: 'weighted',
        defaultUnit: 'kg',
        notes: 'asiento en 4',
        targetWeight: null,
        targetSets: null,
        targetReps: null,
      },
    })
  })

  test('accepts bodyweight exercises in lb', () => {
    expect(validateExercise({ ...valid, kind: 'bodyweight', defaultUnit: 'lb' }).ok).toBe(true)
  })

  test('keeps valid targets; missing or null means none', () => {
    const withTargets = validateExercise({ ...valid, targetWeight: 62.5, targetSets: 3, targetReps: 10 })
    expect(withTargets.ok && withTargets.value).toMatchObject({ targetWeight: 62.5, targetSets: 3, targetReps: 10 })
    const missing = validateExercise({ ...valid })
    expect(missing.ok && missing.value).toMatchObject({ targetWeight: null, targetSets: null, targetReps: null })
  })

  test('deduceKind: no target weight means bodyweight', () => {
    expect(deduceKind(null)).toBe('bodyweight')
    expect(deduceKind(0)).toBe('weighted')
    expect(deduceKind(40)).toBe('weighted')
  })

  test('treats missing notes as empty', () => {
    const result = validateExercise({ ...valid, notes: undefined })
    expect(result.ok && result.value.notes).toBe('')
  })

  test.each([
    ['empty name', { name: '   ' }, 'name'],
    ['non-string name', { name: 42 }, 'name'],
    ['name too long', { name: 'a'.repeat(EXERCISE_NAME_MAX_LENGTH + 1) }, 'name'],
    ['unknown kind', { kind: 'cardio' }, 'kind'],
    ['unknown unit', { defaultUnit: 'stone' }, 'defaultUnit'],
    ['non-string notes', { notes: 5 }, 'notes'],
    ['negative target weight', { targetWeight: -5 }, 'targetWeight'],
    ['target weight with 3 decimals', { targetWeight: 62.555 }, 'targetWeight'],
    ['target weight too heavy', { targetWeight: 5000 }, 'targetWeight'],
    ['non-number target weight', { targetWeight: '60' }, 'targetWeight'],
    ['zero target sets', { targetSets: 0 }, 'targetSets'],
    ['fractional target sets', { targetSets: 2.5 }, 'targetSets'],
    ['too many target sets', { targetSets: 21 }, 'targetSets'],
    ['zero target reps', { targetReps: 0 }, 'targetReps'],
    ['NaN target reps', { targetReps: Number.NaN }, 'targetReps'],
  ])('rejects %s', (_label, patch, field) => {
    const result = validateExercise({ ...valid, ...patch })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual([field])
  })

  test('accepts a name at the maximum length', () => {
    expect(validateExercise({ ...valid, name: 'a'.repeat(EXERCISE_NAME_MAX_LENGTH) }).ok).toBe(true)
  })
})

describe('isDuplicateName', () => {
  const existing = [
    { id: '1', name: 'Press banca' },
    { id: '2', name: 'Sentadilla' },
  ]

  test('detects duplicates ignoring case, accents and spaces', () => {
    expect(isDuplicateName('  PRESS   BANCA ', existing)).toBe(true)
    expect(isDuplicateName('Sentadílla', existing)).toBe(true)
  })

  test('ignores the exercise being edited', () => {
    expect(isDuplicateName('Press banca', existing, '1')).toBe(false)
  })

  test('allows new names', () => {
    expect(isDuplicateName('Remo con barra', existing)).toBe(false)
  })
})

describe('compareByName', () => {
  test('sorts alphabetically in Spanish ignoring case', () => {
    const names = ['remo', 'Curl', 'Ñandú', 'press'].map((name) => ({ name }))
    expect(names.sort(compareByName).map((e) => e.name)).toEqual(['Curl', 'Ñandú', 'press', 'remo'])
  })
})
