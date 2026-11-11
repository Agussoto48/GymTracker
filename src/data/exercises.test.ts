import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import type { WorkoutSession } from '../domain/types.ts'
import { db } from './db.ts'
import { NotFoundError, ValidationError } from './errors.ts'
import {
  createExercise,
  deleteExercise,
  isExerciseInUse,
  listExercises,
  setExerciseArchived,
  updateExercise,
} from './exercises.ts'

const bench = { name: 'Press banca', kind: 'weighted', defaultUnit: 'kg', notes: '' }

function sessionWith(exerciseId: string): WorkoutSession {
  return {
    id: crypto.randomUUID(),
    routineId: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exercises: [{ exerciseId, notes: '', sets: [] }],
    exerciseIds: [exerciseId],
  }
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

  test('refuses to delete an exercise used in a session', async () => {
    const created = await createExercise(bench)
    await db.sessions.add(sessionWith(created.id))
    expect(await isExerciseInUse(created.id)).toBe(true)
    await expect(deleteExercise(created.id)).rejects.toThrow()
    expect(await db.exercises.count()).toBe(1)
  })

  test('refuses to delete an exercise used in a routine', async () => {
    const created = await createExercise(bench)
    const timestamp = new Date().toISOString()
    await db.routines.add({
      id: 'r1',
      name: 'Push',
      exerciseIds: [created.id],
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await expect(deleteExercise(created.id)).rejects.toThrow()
  })
})
