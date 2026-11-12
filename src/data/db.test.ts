import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { expect, test } from 'vitest'
import { db } from './db.ts'

const t = '2026-11-10T18:00:00.000Z'

test('upgrading a v1 database keeps every record and gives exercises empty targets', async () => {
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
  expect(db.verno).toBe(2)
  expect(await db.exercises.get('e1')).toEqual({
    ...exercise,
    targetWeight: null,
    targetSets: null,
    targetReps: null,
    targetUpdatedAt: null,
  })
  expect(await db.routines.get('r1')).toEqual(routine)
  expect(await db.sessions.get('s1')).toEqual(session)
})
