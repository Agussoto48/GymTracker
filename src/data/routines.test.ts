import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import type { Exercise } from '../domain/types.ts'
import { db } from './db.ts'
import { NotFoundError, ValidationError } from './errors.ts'
import { createExercise, deleteExercise, setExerciseArchived } from './exercises.ts'
import {
  createRoutine,
  deleteRoutine,
  countRoutineWorkouts,
  listRoutines,
  setRoutineArchived,
  updateRoutine,
} from './routines.ts'
import { addSet, finishSession, getLastPerformance, startSession } from './sessions.ts'

let bench: Exercise
let pec: Exercise
let row: Exercise

const exercise = (name: string) => createExercise({ name, kind: 'weighted', defaultUnit: 'kg', notes: '', targetSets: 3 })

beforeEach(async () => {
  await db.delete()
  await db.open()
  bench = await exercise('Press banca')
  pec = await exercise('Pec Deck')
  row = await exercise('Remo')
})

describe('routine CRUD', () => {
  test('creates, lists sorted and updates a routine', async () => {
    const push = await createRoutine({ name: ' Push ', exerciseIds: [bench.id, pec.id] })
    await createRoutine({ name: 'Espalda', exerciseIds: [row.id] })
    expect((await listRoutines()).map((r) => r.name)).toEqual(['Espalda', 'Push'])

    const updated = await updateRoutine(push.id, { name: 'Push A', exerciseIds: [pec.id, bench.id] })
    expect(updated).toMatchObject({ id: push.id, name: 'Push A', exerciseIds: [pec.id, bench.id] })
    expect(updated.createdAt).toBe(push.createdAt)
  })

  test('rejects duplicate names and unknown exercises', async () => {
    await createRoutine({ name: 'Push', exerciseIds: [bench.id] })
    await expect(createRoutine({ name: 'PUSH', exerciseIds: [pec.id] })).rejects.toBeInstanceOf(ValidationError)
    await expect(createRoutine({ name: 'Pierna', exerciseIds: ['missing'] })).rejects.toMatchObject({
      errors: { exerciseIds: expect.any(String) },
    })
  })

  test('an exercise used in a routine cannot be deleted', async () => {
    await createRoutine({ name: 'Push', exerciseIds: [bench.id] })
    await expect(deleteExercise(bench.id)).rejects.toThrow()
  })

  test('archives and deletes a routine without workouts', async () => {
    const push = await createRoutine({ name: 'Push', exerciseIds: [bench.id] })
    await setRoutineArchived(push.id, true)
    expect((await db.routines.get(push.id))?.archivedAt).not.toBeNull()

    expect(await countRoutineWorkouts(push.id)).toBe(0)
    await deleteRoutine(push.id)
    expect(await db.routines.get(push.id)).toBeUndefined()
    await expect(deleteRoutine(push.id)).rejects.toBeInstanceOf(NotFoundError)
  })

  test('deleting a used routine keeps its workouts, with its name', async () => {
    const legs = await createRoutine({ name: 'Pierna', exerciseIds: [row.id] })
    const push = await createRoutine({ name: 'Push', exerciseIds: [bench.id] })
    const first = await startSession(legs.id)
    await addSet(first.id, row.id, { weight: 50, unit: 'kg', reps: 10, rpe: null })
    await finishSession(first.id)
    const other = await startSession(push.id)
    await addSet(other.id, bench.id, { weight: 60, unit: 'kg', reps: 8, rpe: null })
    await finishSession(other.id)
    const inProgress = await startSession(legs.id)
    expect(await countRoutineWorkouts(legs.id)).toBe(2)

    await deleteRoutine(legs.id)
    expect(await db.routines.get(legs.id)).toBeUndefined()
    for (const id of [first.id, inProgress.id]) {
      expect(await db.sessions.get(id)).toMatchObject({ routineId: null, routineName: 'Pierna' })
    }
    expect((await db.sessions.get(first.id))?.exercises[0].sets).toHaveLength(1)
    // Other routines' workouts are untouched.
    expect(await db.sessions.get(other.id)).toMatchObject({ routineId: push.id, routineName: null })
  })
})

describe('starting a workout from a routine', () => {
  test('prefills the routine exercises in order and skips archived ones', async () => {
    const push = await createRoutine({ name: 'Push', exerciseIds: [pec.id, row.id, bench.id] })
    await setExerciseArchived(row.id, true)
    const session = await startSession(push.id)
    expect(session.routineId).toBe(push.id)
    expect(session.exerciseIds).toEqual([pec.id, bench.id])
    expect(session.exercises.every((e) => e.sets.length === 0)).toBe(true)
    expect(session.routineName).toBeNull()
  })

  test('a routine with every exercise archived does not start', async () => {
    const back = await createRoutine({ name: 'Espalda', exerciseIds: [row.id, pec.id] })
    await setExerciseArchived(row.id, true)
    await setExerciseArchived(pec.id, true)
    await expect(startSession(back.id)).rejects.toMatchObject({ errors: { routineId: expect.any(String) } })
    expect(await db.sessions.count()).toBe(0)
  })

  test('"last time" is shared across routines', async () => {
    const push = await createRoutine({ name: 'Push', exerciseIds: [pec.id] })
    const upper = await createRoutine({ name: 'Torso', exerciseIds: [row.id, pec.id] })

    const first = await startSession(push.id)
    await addSet(first.id, pec.id, { weight: 60, unit: 'kg', reps: 10, rpe: null })
    await finishSession(first.id)

    const second = await startSession(upper.id)
    const last = await getLastPerformance(pec.id, second.id)
    expect(last?.sessionId).toBe(first.id)
    expect(last?.sets[0]).toMatchObject({ weight: { value: 60, unit: 'kg' }, reps: 10 })
  })
})
