import { describe, expect, test } from 'vitest'
import {
  deduceKind,
  EXERCISE_NAME_MAX_LENGTH,
  compareByName,
  exerciseDeleteBlocker,
  isDuplicateName,
  matchesQuery,
  nameKey,
  normalizeName,
  parseDeletedExercise,
  planExerciseDeletion,
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

describe('matchesQuery', () => {
  test('finds the text anywhere in the name, ignoring case, accents and extra spaces', () => {
    expect(matchesQuery('Extensión de cuádriceps', 'CUADRI')).toBe(true)
    expect(matchesQuery('Press banca inclinado', '  banca   incl ')).toBe(true)
    expect(matchesQuery('Press banca', 'sentadilla')).toBe(false)
  })

  test('an empty or blank search matches everything', () => {
    expect(matchesQuery('Press banca', '')).toBe(true)
    expect(matchesQuery('Press banca', '   ')).toBe(true)
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

  test('sets are required when saving from the app (not in imports); weight and reps stay optional', () => {
    const required = validateExercise({ ...valid }, { requireTargetSets: true })
    expect(!required.ok && required.errors.targetSets).toBe('Escribe cuántas series harás.')
    const setsOnly = validateExercise({ ...valid, targetSets: 4 }, { requireTargetSets: true })
    expect(setsOnly.ok && setsOnly.value).toMatchObject({ targetWeight: null, targetSets: 4, targetReps: null })
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

describe('exerciseDeleteBlocker', () => {
  const routine = (name: string, exerciseIds: string[]) => ({ name, exerciseIds })
  const active = (...ids: string[]) => ({
    exercises: ids.map((exerciseId) => ({ exerciseId, notes: '', sets: [], finishedAt: null, deletedExercise: null })),
  })

  test('nothing blocks an exercise in routines with others, or in another workout', () => {
    expect(exerciseDeleteBlocker('e1', [routine('Push', ['e1', 'e2'])], active('e2'))).toBeNull()
    expect(exerciseDeleteBlocker('e1', [], null)).toBeNull()
  })

  test('the workout in progress blocks it first, then being a routine\'s only exercise', () => {
    expect(exerciseDeleteBlocker('e1', [routine('Solo', ['e1'])], active('e2', 'e1'))).toEqual({ reason: 'active-workout' })
    expect(exerciseDeleteBlocker('e1', [routine('Push', ['e1', 'e2']), routine('Solo', ['e1'])], null)).toEqual({
      reason: 'only-exercise',
      routineName: 'Solo',
    })
  })
})

describe('parseDeletedExercise', () => {
  test('keeps a normalized name and a known kind', () => {
    expect(parseDeletedExercise({ name: '  Fondos ', kind: 'bodyweight', extra: 1 })).toEqual({ name: 'Fondos', kind: 'bodyweight' })
  })

  test.each([null, undefined, 'Fondos', {}, { name: ' ', kind: 'weighted' }, { name: 'x'.repeat(EXERCISE_NAME_MAX_LENGTH + 1), kind: 'weighted' }, { name: 'Fondos', kind: 'cardio' }])(
    'rejects %j',
    (raw) => {
      expect(parseDeletedExercise(raw)).toBeNull()
    },
  )
})

describe('planExerciseDeletion', () => {
  const routine = (name: string, exerciseIds: string[]) => ({ name, exerciseIds })
  const active = (...ids: string[]) => ({
    exercises: ids.map((exerciseId) => ({ exerciseId, notes: '', sets: [], finishedAt: null, deletedExercise: null })),
  })

  test('deletes every exercise when nothing blocks them', () => {
    expect(planExerciseDeletion(['a', 'b'], [routine('Push', ['a', 'b', 'c'])], null)).toEqual({
      deletable: ['a', 'b'],
      skipped: [],
    })
  })

  test('skips the ones in the workout in progress and keeps the rest', () => {
    expect(planExerciseDeletion(['a', 'b'], [], active('b'))).toEqual({
      deletable: ['a'],
      skipped: [{ id: 'b', blocker: { reason: 'active-workout' } }],
    })
  })

  test('keeps the last exercise of a routine when all of them are selected', () => {
    expect(planExerciseDeletion(['a', 'b'], [routine('Pierna', ['a', 'b'])], null)).toEqual({
      deletable: ['a'],
      skipped: [{ id: 'b', blocker: { reason: 'only-exercise', routineName: 'Pierna' } }],
    })
  })

  test('a routine that already has one exercise keeps it', () => {
    expect(planExerciseDeletion(['a'], [routine('Solo', ['a'])], null).skipped).toEqual([
      { id: 'a', blocker: { reason: 'only-exercise', routineName: 'Solo' } },
    ])
  })

  test('ignores repeated ids', () => {
    expect(planExerciseDeletion(['a', 'a'], [], null)).toEqual({ deletable: ['a'], skipped: [] })
  })
})
