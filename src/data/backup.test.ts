import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { parseBackup, type BackupData } from '../domain/backup.ts'
import { createBackup, readAllData, replaceAllData } from './backup.ts'
import { db } from './db.ts'
import { createExercise, setExerciseArchived } from './exercises.ts'
import { createRoutine } from './routines.ts'
import { addSet, finishSession, startSession } from './sessions.ts'

async function seed() {
  const bench = await createExercise({ name: 'Press banca', kind: 'weighted', defaultUnit: 'kg', notes: 'agarre medio' })
  const dips = await createExercise({ name: 'Fondos', kind: 'bodyweight', defaultUnit: 'lb', notes: '' })
  const old = await createExercise({ name: 'Viejo', kind: 'weighted', defaultUnit: 'kg', notes: '' })
  await setExerciseArchived(old.id, true)
  const push = await createRoutine({ name: 'Push', exerciseIds: [bench.id, dips.id] })
  const done = await startSession(push.id)
  await addSet(done.id, bench.id, { weight: 62.5, unit: 'kg', reps: 8, rpe: 8.5 })
  await addSet(done.id, dips.id, { weight: null, unit: 'lb', reps: 12, rpe: null })
  await addSet(done.id, dips.id, { weight: 10, unit: 'lb', reps: 8, rpe: 9 })
  await finishSession(done.id)
  const active = await startSession()
  return { bench, active }
}

const byId = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id))
const normalized = (data: BackupData) => ({
  exercises: byId(data.exercises),
  routines: byId(data.routines),
  sessions: byId(data.sessions),
})

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('backup round trip', () => {
  test('export → validate → import into an empty app gives identical data', async () => {
    await seed()
    const original = await readAllData()
    const text = JSON.stringify(await createBackup())

    await db.delete()
    await db.open()
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.summary).toMatchObject({ exercises: 3, routines: 1, sessions: 2, sets: 3 })

    await replaceAllData(parsed.data)
    expect(normalized(await readAllData())).toEqual(normalized(original))
  })

  test('import replaces existing data instead of merging', async () => {
    await seed()
    const text = JSON.stringify(await createBackup())
    await createExercise({ name: 'Extra', kind: 'weighted', defaultUnit: 'kg', notes: '' })
    const parsed = parseBackup(text)
    if (!parsed.ok) throw new Error(parsed.errors.join())
    await replaceAllData(parsed.data)
    expect((await db.exercises.toArray()).map((e) => e.name)).not.toContain('Extra')
  })

  test('a failing import leaves the current data untouched', async () => {
    await seed()
    const before = normalized(await readAllData())
    const broken = (await readAllData()) as BackupData
    // Bypass validation on purpose: duplicate keys make bulkAdd fail mid-transaction.
    broken.sessions = [...broken.sessions, broken.sessions[0]]
    await expect(replaceAllData(broken)).rejects.toThrow()
    expect(normalized(await readAllData())).toEqual(before)
  })
})
