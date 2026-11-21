import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import type { WorkoutSession } from '../domain/types.ts'
import { db } from './db.ts'
import { getLastPerformance } from './sessions.ts'
import { NotFoundError, ValidationError } from './errors.ts'
import {
  createExercise,
  deleteExercise,
  getExerciseUsage,
  listExercises,
  setExerciseArchived,
  updateExercise,
} from './exercises.ts'

const bench = { name: 'Press banca', kind: 'weighted', defaultUnit: 'kg', notes: '', targetSets: 3 }

/** A workout in progress with the exercise, or a finished one with a set of it. */
function sessionWith(exerciseId: string, finished = false): WorkoutSession {
  const t = new Date().toISOString()
  const sets = finished ? [{ id: crypto.randomUUID(), weight: { value: 60, unit: 'kg' as const }, reps: 8, rpe: null, completedAt: t }] : []
  return {
    id: crypto.randomUUID(),
    routineId: null,
    routineName: null,
    startedAt: t,
    finishedAt: finished ? t : null,
    exercises: [{ exerciseId, notes: '', sets, finishedAt: finished ? t : null, deletedExercise: null }],
    exerciseIds: [exerciseId],
  }
}

async function addRoutine(id: string, name: string, exerciseIds: string[]) {
  const timestamp = '2026-01-01T00:00:00.000Z'
  await db.routines.add({ id, name, exerciseIds, archivedAt: null, createdAt: timestamp, updatedAt: timestamp })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('createExercise', () => {
  test('stores a normalized exercise with id and timestamps', async () => {
    const created = await createExercise({ ...bench, name: '  Press   banca ' })
    expect(created).toMatchObject({ name: 'Press banca', kind: 'weighted', archivedAt: null })
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.createdAt).toBe(created.updatedAt)
    expect(await db.exercises.get(created.id)).toEqual(created)
  })

  test('stores targets and when they were set; weight and reps are optional', async () => {
    const withTargets = await createExercise({ ...bench, targetWeight: 40, targetSets: 3, targetReps: 10 })
    expect(withTargets).toMatchObject({ targetWeight: 40, targetSets: 3, targetReps: 10, targetUpdatedAt: withTargets.createdAt })
    const setsOnly = await createExercise({ ...bench, name: 'Remo' })
    expect(setsOnly).toMatchObject({ targetWeight: null, targetSets: 3, targetReps: null })
  })

  test('requires the number of sets', async () => {
    await expect(createExercise({ ...bench, targetSets: null })).rejects.toMatchObject({
      errors: { targetSets: 'Escribe cuántas series harás.' },
    })
    expect(await db.exercises.count()).toBe(0)
  })

  test('without an explicit kind, the weight decides it (empty = bodyweight)', async () => {
    const { kind: _kind, ...noKind } = bench
    expect((await createExercise({ ...noKind, name: 'Dominadas', targetSets: 3 })).kind).toBe('bodyweight')
    expect((await createExercise({ ...noKind, name: 'Pec Deck', targetWeight: 40 })).kind).toBe('weighted')
  })

  test('rejects invalid input without writing', async () => {
    await expect(createExercise({ ...bench, name: '' })).rejects.toBeInstanceOf(ValidationError)
    expect(await db.exercises.count()).toBe(0)
  })

  test('rejects duplicate names, including archived exercises', async () => {
    const first = await createExercise(bench)
    await setExerciseArchived(first.id, true)
    await expect(createExercise({ ...bench, name: 'PRESS BANCA' })).rejects.toMatchObject({
      errors: { name: expect.any(String) },
    })
    expect(await db.exercises.count()).toBe(1)
  })
})

describe('listExercises', () => {
  test('returns exercises sorted by name', async () => {
    await createExercise({ ...bench, name: 'Sentadilla' })
    await createExercise({ ...bench, name: 'curl' })
    await createExercise({ ...bench, name: 'Dominadas', kind: 'bodyweight' })
    expect((await listExercises()).map((e) => e.name)).toEqual(['curl', 'Dominadas', 'Sentadilla'])
  })
})

describe('updateExercise', () => {
  test('updates fields and keeps id and createdAt', async () => {
    const created = await createExercise(bench)
    const updated = await updateExercise(created.id, { ...bench, name: 'Press banca plano', defaultUnit: 'lb' })
    expect(updated).toMatchObject({ id: created.id, name: 'Press banca plano', defaultUnit: 'lb' })
    expect(updated.createdAt).toBe(created.createdAt)
  })

  test('changes targets when given, keeps them when absent, and stamps only real changes', async () => {
    const created = await createExercise({ ...bench, targetWeight: 40, targetSets: 3, targetReps: 10 })
    await new Promise((r) => setTimeout(r, 5))
    const changed = await updateExercise(created.id, { ...bench, targetWeight: 45, targetSets: 3, targetReps: 10 })
    expect(changed).toMatchObject({ targetWeight: 45, targetSets: 3, targetReps: 10 })
    expect(changed.targetUpdatedAt! > created.targetUpdatedAt!).toBe(true)
    await new Promise((r) => setTimeout(r, 5))
    const notesOnly = await updateExercise(created.id, { ...bench, notes: 'agarre cerrado' })
    expect(notesOnly).toMatchObject({ targetWeight: 45, targetUpdatedAt: changed.targetUpdatedAt })
    const same = await updateExercise(created.id, { ...bench, targetWeight: 45, targetSets: 3, targetReps: 10 })
    expect(same.targetUpdatedAt).toBe(changed.targetUpdatedAt)
    // The sets do not change what the next workout proposes, so they do not stamp.
    const moreSets = await updateExercise(created.id, { ...bench, targetSets: 4 })
    expect(moreSets).toMatchObject({ targetSets: 4, targetUpdatedAt: changed.targetUpdatedAt })
  })

  test('an exercise saved before sets were required must get them on its next edit', async () => {
    const created = await createExercise(bench)
    await db.exercises.update(created.id, { targetSets: null })
    await expect(updateExercise(created.id, { ...bench, targetSets: undefined, notes: 'x' })).rejects.toMatchObject({
      errors: { targetSets: 'Escribe cuántas series harás.' },
    })
    await expect(updateExercise(created.id, { ...bench, targetSets: 4 })).resolves.toMatchObject({ targetSets: 4 })
  })

  test('without history the kind follows the weight; with history it stays', async () => {
    const { kind: _kind, ...noKind } = bench
    const created = await createExercise({ ...noKind, name: 'Máquina' })
    expect(created.kind).toBe('bodyweight')
    expect((await updateExercise(created.id, { ...noKind, name: 'Máquina', targetWeight: 30 })).kind).toBe('weighted')
    await db.sessions.add(sessionWith(created.id))
    expect((await updateExercise(created.id, { ...noKind, name: 'Máquina', targetWeight: null })).kind).toBe('weighted')
  })

  test('allows keeping its own name', async () => {
    const created = await createExercise(bench)
    await expect(updateExercise(created.id, { ...bench, notes: 'agarre cerrado' })).resolves.toBeTruthy()
  })

  test('rejects a name used by another exercise', async () => {
    await createExercise(bench)
    const other = await createExercise({ ...bench, name: 'Remo' })
    await expect(updateExercise(other.id, bench)).rejects.toBeInstanceOf(ValidationError)
  })

  test('blocks changing the kind once the exercise has history', async () => {
    const created = await createExercise(bench)
    await db.sessions.add(sessionWith(created.id))
    await expect(updateExercise(created.id, { ...bench, kind: 'bodyweight' })).rejects.toMatchObject({
      errors: { kind: expect.any(String) },
    })
  })

  test('allows changing the kind without history', async () => {
    const created = await createExercise(bench)
    const updated = await updateExercise(created.id, { ...bench, kind: 'bodyweight' })
    expect(updated.kind).toBe('bodyweight')
  })

  test('fails for an unknown id', async () => {
    await expect(updateExercise('missing', bench)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('archive and delete', () => {
  test('archives and restores', async () => {
    const created = await createExercise(bench)
    await setExerciseArchived(created.id, true)
    expect((await db.exercises.get(created.id))?.archivedAt).not.toBeNull()
    await setExerciseArchived(created.id, false)
    expect((await db.exercises.get(created.id))?.archivedAt).toBeNull()
  })

  test('deletes an unused exercise', async () => {
    const created = await createExercise(bench)
    await deleteExercise(created.id)
    expect(await db.exercises.count()).toBe(0)
  })

  test('deletes a used exercise: past workouts keep its name and kind, its sets untouched', async () => {
    const created = await createExercise(bench)
    const session = sessionWith(created.id, true)
    await db.sessions.add(session)
    await deleteExercise(created.id)

    expect(await db.exercises.count()).toBe(0)
    const [entry] = (await db.sessions.get(session.id))!.exercises
    expect(entry.deletedExercise).toEqual({ name: 'Press banca', kind: 'weighted' })
    expect(entry.sets).toEqual(session.exercises[0].sets)
  })

  test('a new exercise with the same name starts without the deleted one\'s history', async () => {
    const created = await createExercise(bench)
    await db.sessions.add(sessionWith(created.id, true))
    await deleteExercise(created.id)
    const again = await createExercise(bench)
    expect(await getLastPerformance(again.id)).toBeNull()
  })

  test('removes it from the routines that include it', async () => {
    const created = await createExercise(bench)
    const other = await createExercise({ ...bench, name: 'Remo' })
    await addRoutine('r1', 'Push', [created.id, other.id])
    await deleteExercise(created.id)
    const routine = await db.routines.get('r1')
    expect(routine?.exerciseIds).toEqual([other.id])
    expect(routine?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z')
  })

  test('refuses while it is in the workout in progress, changing nothing', async () => {
    const created = await createExercise(bench)
    await db.sessions.add(sessionWith(created.id))
    expect((await getExerciseUsage(created.id)).blocker).toEqual({ reason: 'active-workout' })
    await expect(deleteExercise(created.id)).rejects.toThrow()
    expect(await db.exercises.count()).toBe(1)
  })

  test("refuses when it is a routine's only exercise, changing nothing", async () => {
    const created = await createExercise(bench)
    await db.sessions.add(sessionWith(created.id, true))
    await addRoutine('r1', 'Push', [created.id])
    await expect(deleteExercise(created.id)).rejects.toThrow()
    expect(await db.exercises.count()).toBe(1)
    expect((await db.routines.get('r1'))?.exerciseIds).toEqual([created.id])
    expect((await db.sessions.toArray())[0].exercises[0].deletedExercise).toBeNull()
  })

  test('reports where it is used', async () => {
    const created = await createExercise(bench)
    const other = await createExercise({ ...bench, name: 'Remo' })
    await addRoutine('r1', 'Pull', [created.id, other.id])
    await addRoutine('r2', 'Full', [other.id, created.id])
    await db.sessions.add(sessionWith(created.id, true))
    expect(await getExerciseUsage(created.id)).toEqual({ routineNames: ['Full', 'Pull'], sessionCount: 1, blocker: null })
    await addRoutine('r3', 'Solo', [created.id])
    expect((await getExerciseUsage(created.id)).blocker).toEqual({ reason: 'only-exercise', routineName: 'Solo' })
  })

})
