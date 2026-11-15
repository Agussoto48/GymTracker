import { useLiveQuery } from 'dexie-react-hooks'
import { compareByName, isDuplicateName } from '../domain/names.ts'
import { validateRoutine, type RoutineInput } from '../domain/routine.ts'
import type { Id, Routine } from '../domain/types.ts'
import { db } from './db.ts'
import { NotFoundError, ValidationError } from './errors.ts'
import { createId } from './ids.ts'

const now = () => new Date().toISOString()
const DUPLICATE = { name: 'Ya existe una rutina con ese nombre.' }

async function validFields(input: RoutineInput) {
  const result = validateRoutine(input)
  if (!result.ok) throw new ValidationError(result.errors)
  const found = await db.exercises.bulkGet(result.value.exerciseIds)
  if (found.some((exercise) => !exercise)) {
    throw new ValidationError({ exerciseIds: 'Algún ejercicio ya no existe.' })
  }
  return result.value
}

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  return db.transaction('rw', db.routines, db.exercises, async () => {
    const fields = await validFields(input)
    if (isDuplicateName(fields.name, await db.routines.toArray())) throw new ValidationError(DUPLICATE)
    const timestamp = now()
    const routine: Routine = { id: createId(), ...fields, archivedAt: null, createdAt: timestamp, updatedAt: timestamp }
    await db.routines.add(routine)
    return routine
  })
}

export async function updateRoutine(id: Id, input: RoutineInput): Promise<Routine> {
  return db.transaction('rw', db.routines, db.exercises, async () => {
    const current = await db.routines.get(id)
    if (!current) throw new NotFoundError('Routine', id)
    const fields = await validFields(input)
    if (isDuplicateName(fields.name, await db.routines.toArray(), id)) throw new ValidationError(DUPLICATE)
    const updated: Routine = { ...current, ...fields, updatedAt: now() }
    await db.routines.put(updated)
    return updated
  })
}

export async function setRoutineArchived(id: Id, archived: boolean): Promise<void> {
  const timestamp = now()
  const changed = await db.routines.update(id, { archivedAt: archived ? timestamp : null, updatedAt: timestamp })
  if (changed === 0) throw new NotFoundError('Routine', id)
}

/** How many workouts (finished or in progress) came from this routine. */
export async function countRoutineWorkouts(id: Id): Promise<number> {
  return db.sessions.filter((session) => session.routineId === id).count()
}

/**
 * Deletes a routine. Its workouts stay in history: each one keeps the routine's name and stops
 * pointing at it, in the same transaction (never a workout pointing at a missing routine).
 */
export async function deleteRoutine(id: Id): Promise<void> {
  await db.transaction('rw', db.routines, db.sessions, async () => {
    const routine = await db.routines.get(id)
    if (!routine) throw new NotFoundError('Routine', id)
    await db.sessions
      .filter((session) => session.routineId === id)
      .modify({ routineId: null, routineName: routine.name })
    await db.routines.delete(id)
  })
}

export async function listRoutines(): Promise<Routine[]> {
  return (await db.routines.toArray()).sort(compareByName)
}

export function useRoutines(): Routine[] | undefined {
  return useLiveQuery(listRoutines)
}

export function useRoutineWorkoutCount(id: Id | null): number | undefined {
  return useLiveQuery(() => (id ? countRoutineWorkouts(id) : 0), [id])
}
