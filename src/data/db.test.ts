import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { expect, test } from 'vitest'
import { db } from './db.ts'

const t = '2026-11-10T18:00:00.000Z'

test('upgrading a v1 database keeps every record, gives exercises empty targets and leaves exercises pending', async () => {
  db.close()
  await Dexie.delete('gymtracker')

  // A database as v1 of the app left it, with real data.
  const v1 = new Dexie('gymtracker')
  v1.version(1).stores({ exercises: 'id, name', routines: 'id, name', sessions: 'id, startedAt, *exerciseIds' })
  await v1.open()
  const exercise = {
    id: 'e1',
    name: 'Press banca',
    kind: 'weighted',
    defaultUnit: 'kg',
    notes: 'agarre medio',
    archivedAt: null,
    createdAt: t,
    updatedAt: t,
  }
  const routine = { id: 'r1', name: 'Push', exerciseIds: ['e1'], archivedAt: null, createdAt: t, updatedAt: t }
  const session = {
    id: 's1',
    routineId: 'r1',
    startedAt: t,
    finishedAt: t,
    exercises: [{ exerciseId: 'e1', notes: '', sets: [{ id: 'x', weight: { value: 60, unit: 'kg' }, reps: 10, rpe: null, completedAt: t }] }],
    exerciseIds: ['e1'],
  }
  await v1.table('exercises').add(exercise)
  await v1.table('routines').add(routine)
  await v1.table('sessions').add(session)
  v1.close()

  await db.open()
  expect(db.verno).toBe(3)
  expect(await db.exercises.get('e1')).toEqual({
    ...exercise,
    targetWeight: null,
    targetSets: null,
    targetReps: null,
    targetUpdatedAt: null,
  })
  expect(await db.routines.get('r1')).toEqual(routine)
  expect(await db.sessions.get('s1')).toEqual({ ...session, exercises: [{ ...session.exercises[0], finishedAt: null }] })
})

test('an exercise written without targets (by an older build) reads with empty targets', async () => {
  // Bypass the app's writes, like a pre-v2 tab writing into the upgraded database.
  const raw = { id: 'old', name: 'Hola', kind: 'weighted', defaultUnit: 'kg', notes: '', archivedAt: null, createdAt: t, updatedAt: t }
  await db.table('exercises').add(raw)

  const expected = { ...raw, targetWeight: null, targetSets: null, targetReps: null, targetUpdatedAt: null }
  expect(await db.exercises.get('old')).toEqual(expected)
  expect((await db.exercises.toArray()).find((e) => e.id === 'old')).toEqual(expected)
  expect(await db.exercises.bulkGet(['old'])).toEqual([expected])
})

test('a session written without finished flags (by an older build) reads with pending exercises', async () => {
  const raw = { id: 'old-s', routineId: null, startedAt: t, finishedAt: null, exercises: [{ exerciseId: 'e1', notes: '', sets: [] }], exerciseIds: ['e1'] }
  await db.table('sessions').add(raw)
  expect((await db.sessions.get('old-s'))?.exercises[0].finishedAt).toBeNull()
})
