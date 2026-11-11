import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import type { Exercise } from '../domain/types.ts'
import { db } from './db.ts'
import { ValidationError } from './errors.ts'
import { createExercise } from './exercises.ts'
import {
  ActiveSessionExistsError,
  addExerciseToSession,
  addSet,
  deleteSet,
  discardSession,
  finishSession,
  getActiveSession,
  getLastPerformance,
  removeExerciseFromSession,
  setSessionExerciseNotes,
  startSession,
  updateSet,
} from './sessions.ts'

let pec: Exercise
let pullUp: Exercise

const kg = (weight: number | null, reps: number, rpe: number | null = null) => ({ weight, unit: 'kg' as const, reps, rpe })

beforeEach(async () => {
  await db.delete()
  await db.open()
  pec = await createExercise({ name: 'Pec Deck', kind: 'weighted', defaultUnit: 'kg', notes: '' })
  pullUp = await createExercise({ name: 'Dominadas', kind: 'bodyweight', defaultUnit: 'kg', notes: '' })
})

describe('session lifecycle', () => {
  test('starts one active session at a time', async () => {
    const session = await startSession()
    expect((await getActiveSession())?.id).toBe(session.id)
    await expect(startSession()).rejects.toBeInstanceOf(ActiveSessionExistsError)
  })

  test('discarding removes the active session', async () => {
    const session = await startSession()
    await discardSession(session.id)
    expect(await getActiveSession()).toBeUndefined()
  })

  test('finishing drops exercises without sets and ends the session', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    await addExerciseToSession(session.id, pullUp.id)
    await addSet(session.id, pec.id, kg(60, 10))
    const finished = await finishSession(session.id)
    expect(finished.finishedAt).not.toBeNull()
    expect(finished.exerciseIds).toEqual([pec.id])
    expect(await getActiveSession()).toBeUndefined()
  })

  test('refuses to finish an empty workout', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    await expect(finishSession(session.id)).rejects.toThrow()
  })

  test('finished sessions cannot be changed', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    await addSet(session.id, pec.id, kg(60, 10))
    await finishSession(session.id)
    await expect(addSet(session.id, pec.id, kg(60, 10))).rejects.toThrow()
  })
})

describe('exercises and sets', () => {
  test('adds an exercise once and keeps exerciseIds in sync', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    const again = await addExerciseToSession(session.id, pec.id)
    expect(again.exercises).toHaveLength(1)
    expect(again.exerciseIds).toEqual([pec.id])
    const removed = await removeExerciseFromSession(session.id, pec.id)
    expect(removed.exerciseIds).toEqual([])
  })

  test('saves each set immediately and in order', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    await addSet(session.id, pec.id, kg(60, 10, 8))
    await addSet(session.id, pec.id, kg(62.5, 8))
    const stored = await db.sessions.get(session.id)
    expect(stored?.exercises[0].sets.map((s) => [s.weight?.value, s.reps, s.rpe])).toEqual([
      [60, 10, 8],
      [62.5, 8, null],
    ])
  })

  test('validates sets against the exercise kind', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    await addExerciseToSession(session.id, pullUp.id)
    await expect(addSet(session.id, pec.id, kg(null, 10))).rejects.toBeInstanceOf(ValidationError)
    await expect(addSet(session.id, pullUp.id, kg(null, 8))).resolves.toMatchObject({ weight: null })
  })

  test('edits and deletes a set', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    const first = await addSet(session.id, pec.id, kg(60, 10))
    await updateSet(session.id, pec.id, first.id, kg(65, 9))
    let stored = await db.sessions.get(session.id)
    expect(stored?.exercises[0].sets[0]).toMatchObject({ id: first.id, weight: { value: 65 }, reps: 9 })
    await deleteSet(session.id, pec.id, first.id)
    stored = await db.sessions.get(session.id)
    expect(stored?.exercises[0].sets).toEqual([])
  })

  test('stores trimmed notes of the day', async () => {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    await setSessionExerciseNotes(session.id, pec.id, '  molestia en el hombro ')
    expect((await db.sessions.get(session.id))?.exercises[0].notes).toBe('molestia en el hombro')
  })
})

describe('getLastPerformance', () => {
  async function workout(sets: [number, number][]) {
    const session = await startSession()
    await addExerciseToSession(session.id, pec.id)
    for (const [weight, reps] of sets) await addSet(session.id, pec.id, kg(weight, reps))
    return finishSession(session.id)
  }

  test('returns the latest finished workout and ignores the active one', async () => {
    await workout([[55, 10]])
    await new Promise((r) => setTimeout(r, 5))
    const latest = await workout([[60, 10], [60, 9]])
    const active = await startSession()
    await addExerciseToSession(active.id, pec.id)
    await addSet(active.id, pec.id, kg(70, 5))

    const last = await getLastPerformance(pec.id, active.id)
    expect(last?.sessionId).toBe(latest.id)
    expect(last?.sets.map((s) => s.reps)).toEqual([10, 9])
  })

  test('returns null for an exercise never done', async () => {
    expect(await getLastPerformance(pullUp.id)).toBeNull()
  })
})
