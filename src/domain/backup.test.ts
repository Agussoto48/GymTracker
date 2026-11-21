import { describe, expect, test } from 'vitest'
import { BACKUP_FORMAT_VERSION, parseBackup } from './backup.ts'

const t = '2026-11-10T18:00:00.000Z'
const exercise = (id: string, name: string, kind = 'weighted') => ({
  id,
  name,
  kind,
  defaultUnit: 'kg',
  notes: '',
  archivedAt: null,
  createdAt: t,
  updatedAt: t,
})

function file(patch: Record<string, unknown> = {}) {
  return {
    app: 'gymtracker',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: t,
    data: {
      exercises: [exercise('e1', 'Press banca'), exercise('e2', 'Fondos', 'bodyweight')],
      routines: [{ id: 'r1', name: 'Push', exerciseIds: ['e1', 'e2'], archivedAt: null, createdAt: t, updatedAt: t }],
      sessions: [
        {
          id: 's1',
          routineId: 'r1',
          startedAt: t,
          finishedAt: '2026-11-10T19:00:00.000Z',
          exerciseIds: ['ignored'],
          exercises: [
            { exerciseId: 'e1', notes: '', sets: [{ id: 'x1', weight: { value: 60, unit: 'kg' }, reps: 8, rpe: 8, completedAt: t }], finishedAt: t },
            { exerciseId: 'e2', notes: 'bien', sets: [{ id: 'x2', weight: null, reps: 10, rpe: null, completedAt: t }] },
          ],
        },
      ],
      ...patch,
    },
  }
}

const parse = (value: unknown) => parseBackup(JSON.stringify(value))
const firstError = (value: unknown) => {
  const result = parse(value)
  return result.ok ? null : result.errors[0]
}

describe('parseBackup', () => {
  test('accepts a valid backup, summarizes it and recomputes derived fields', () => {
    const result = parse(file())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary).toEqual({ exportedAt: t, exercises: 2, routines: 1, sessions: 1, sets: 2 })
    expect(result.data.sessions[0].exerciseIds).toEqual(['e1', 'e2'])
  })

  test('a workout of a deleted routine keeps its name; older backups have none', () => {
    const old = parse(file())
    expect(old.ok && old.data.sessions[0].routineName).toBeNull()

    const value = file()
    Object.assign(value.data.sessions[0], { routineId: null, routineName: 'Pierna' })
    const result = parse(value)
    expect(result.ok && result.data.sessions[0]).toMatchObject({ routineId: null, routineName: 'Pierna' })
  })

  test('rejects a routine name next to an existing routine, or an empty or too long one', () => {
    for (const patch of [{ routineName: 'Pierna' }, { routineId: null, routineName: ' ' }, { routineId: null, routineName: 'x'.repeat(61) }]) {
      const value = file()
      Object.assign(value.data.sessions[0], patch)
      expect(firstError(value)).toMatch(/nombre de rutina inválido/)
    }
  })

  test("a finished workout keeps a deleted exercise's copy; older backups have none", () => {
    const old = parse(file())
    expect(old.ok && old.data.sessions[0].exercises.map((e) => e.deletedExercise)).toEqual([null, null])

    // Fondos (bodyweight, set without load) was deleted: only the workout remembers it.
    const value = file({ exercises: [exercise('e1', 'Press banca')], routines: [] })
    Object.assign(value.data.sessions[0], { routineId: null })
    Object.assign(value.data.sessions[0].exercises[1], { deletedExercise: { name: ' Fondos ', kind: 'bodyweight' } })
    const result = parse(value)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.sessions[0].exercises[1]).toMatchObject({ exerciseId: 'e2', deletedExercise: { name: 'Fondos', kind: 'bodyweight' } })
    expect(result.data.sessions[0].exerciseIds).toEqual(['e1', 'e2'])
  })

  test('rejects a deleted exercise without a valid copy, in a workout in progress, or next to an existing one', () => {
    const withoutE2 = () => {
      const value = file({ exercises: [exercise('e1', 'Press banca')], routines: [] })
      Object.assign(value.data.sessions[0], { routineId: null })
      return value
    }
    for (const copy of [undefined, null, { name: '', kind: 'bodyweight' }, { name: 'Fondos', kind: 'cardio' }]) {
      const value = withoutE2()
      Object.assign(value.data.sessions[0].exercises[1], { deletedExercise: copy })
      expect(firstError(value)).toBe('Entrenamiento 1, ejercicio 2: usa un ejercicio que no existe.')
    }
    const inProgress = withoutE2()
    Object.assign(inProgress.data.sessions[0], { finishedAt: null })
    Object.assign(inProgress.data.sessions[0].exercises[1], { deletedExercise: { name: 'Fondos', kind: 'bodyweight' } })
    expect(firstError(inProgress)).toMatch(/usa un ejercicio que no existe/)

    const existing = file()
    Object.assign(existing.data.sessions[0].exercises[0], { deletedExercise: { name: 'Press banca', kind: 'weighted' } })
    expect(firstError(existing)).toBe('Entrenamiento 1, ejercicio 1: copia de ejercicio inválida.')
  })

  test('backups without targets (older format) import as none; present ones are kept', () => {
    const value = file()
    Object.assign(value.data.exercises[1], { targetWeight: 10, targetSets: 3, targetReps: 8, targetUpdatedAt: t })
    const result = parse(value)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.exercises[0]).toMatchObject({ targetWeight: null, targetSets: null, targetReps: null, targetUpdatedAt: null })
    expect(result.data.exercises[1]).toMatchObject({ targetWeight: 10, targetSets: 3, targetReps: 8, targetUpdatedAt: t })
  })

  test('finished exercises keep their date; older backups without it import as pending', () => {
    const result = parse(file())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.sessions[0].exercises.map((e) => e.finishedAt)).toEqual([t, null])
  })

  test('an exercise marked finished without sets imports as pending; a bad date is rejected', () => {
    const empty = file()
    Object.assign(empty.data.sessions[0].exercises[1], { sets: [], finishedAt: t })
    const result = parse(empty)
    expect(result.ok && result.data.sessions[0].exercises[1].finishedAt).toBeNull()

    const badDate = file()
    Object.assign(badDate.data.sessions[0].exercises[0], { finishedAt: 'ayer' })
    expect(firstError(badDate)).toBe('Entrenamiento 1, ejercicio 1: fecha de finalizado inválida.')
  })

  test('rejects invalid targets', () => {
    const value = file()
    Object.assign(value.data.exercises[0], { targetWeight: -1 })
    expect(firstError(value)).toMatch(/^Ejercicio 1: Peso entre 0/)
    const badDate = file()
    Object.assign(badDate.data.exercises[0], { targetUpdatedAt: 'ayer' })
    expect(firstError(badDate)).toBe('Ejercicio 1: fechas inválidas.')
  })

  test('drops unknown fields', () => {
    const value = file()
    Object.assign(value.data.exercises[0], { hacked: true })
    const result = parse(value)
    expect(result.ok && 'hacked' in result.data.exercises[0]).toBe(false)
  })

  test.each([
    ['not JSON', null],
    ['another app', { ...file(), app: 'other' }],
    ['newer format', { ...file(), formatVersion: BACKUP_FORMAT_VERSION + 1 }],
    ['missing data', { ...file(), data: {} }],
  ])('rejects %s', (_label, value) => {
    const result = value === null ? parseBackup('{oops') : parse(value)
    expect(result.ok).toBe(false)
  })

  test('rejects broken references', () => {
    expect(
      firstError(file({ routines: [{ id: 'r1', name: 'Push', exerciseIds: ['nope'], archivedAt: null, createdAt: t, updatedAt: t }] })),
    ).toMatch(/no existe/)
  })

  test('rejects duplicate ids and names', () => {
    expect(firstError(file({ exercises: [exercise('e1', 'A'), exercise('e1', 'B')], routines: [], sessions: [] }))).toMatch(/repetido/)
    expect(firstError(file({ exercises: [exercise('e1', 'Press'), exercise('e2', 'PRESS')], routines: [], sessions: [] }))).toMatch(/nombre repetido/)
  })

  test('rejects invalid sets and impossible sessions', () => {
    const noWeight = file()
    noWeight.data.sessions[0].exercises[0].sets[0].weight = null as never
    expect(firstError(noWeight)).toMatch(/peso/i)

    const backwards = file()
    backwards.data.sessions[0].finishedAt = '2026-11-09T00:00:00.000Z'
    expect(firstError(backwards)).toMatch(/termina antes/)

    const twoActive = file()
    const s = twoActive.data.sessions[0]
    twoActive.data.sessions = [
      { ...s, finishedAt: null as never },
      { ...s, id: 's2', finishedAt: null as never, exercises: [] },
    ]
    expect(firstError(twoActive)).toMatch(/más de un entrenamiento en curso/)
  })

  test('reports at most 10 errors', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, name: '' }))
    const result = parse(file({ exercises: many, routines: [], sessions: [] }))
    expect(!result.ok && result.errors).toHaveLength(10)
  })
})
