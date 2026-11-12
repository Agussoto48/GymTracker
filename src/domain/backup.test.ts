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
            { exerciseId: 'e1', notes: '', sets: [{ id: 'x1', weight: { value: 60, unit: 'kg' }, reps: 8, rpe: 8, completedAt: t }] },
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

  test('backups without targets (older format) import as none; present ones are kept', () => {
    const value = file()
    Object.assign(value.data.exercises[1], { targetWeight: 10, targetSets: 3, targetReps: 8, targetUpdatedAt: t })
    const result = parse(value)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.exercises[0]).toMatchObject({ targetWeight: null, targetSets: null, targetReps: null, targetUpdatedAt: null })
    expect(result.data.exercises[1]).toMatchObject({ targetWeight: 10, targetSets: 3, targetReps: 8, targetUpdatedAt: t })
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
