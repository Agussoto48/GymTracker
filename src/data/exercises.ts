import { useLiveQuery } from 'dexie-react-hooks'
import {
  compareByName,
  isDuplicateName,
  validateExercise,
  type ExerciseErrors,
  type ExerciseInput,
} from '../domain/exercise.ts'
import type { Exercise, Id } from '../domain/types.ts'
import { db } from './db.ts'
import { createId } from './ids.ts'

/** Thrown when input breaks a rule; `errors` maps fields to messages for the form. */
export class ExerciseValidationError extends Error {
  readonly errors: ExerciseErrors

  constructor(errors: ExerciseErrors) {
    super('Invalid exercise')
    this.errors = errors
  }
}

export class ExerciseNotFoundError extends Error {
  constructor(id: Id) {
    super(`Exercise not found: ${id}`)
  }
}

const now = () => new Date().toISOString()

function validOrThrow(input: ExerciseInput) {
  const result = validateExercise(input)
  if (!result.ok) throw new ExerciseValidationError(result.errors)
  return result.value
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const fields = validOrThrow(input)
  return db.transaction('rw', db.exercises, async () => {
    if (isDuplicateName(fields.name, await db.exercises.toArray())) {
      throw new ExerciseValidationError({ name: 'Ya existe un ejercicio con ese nombre.' })
    }
    const timestamp = now()
    const exercise: Exercise = {
      id: createId(),
      ...fields,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.exercises.add(exercise)
    return exercise
  })
}

export async function updateExercise(id: Id, input: ExerciseInput): Promise<Exercise> {
  const fields = validOrThrow(input)
  return db.transaction('rw', db.exercises, db.sessions, async () => {
    const current = await db.exercises.get(id)
    if (!current) throw new ExerciseNotFoundError(id)
    if (isDuplicateName(fields.name, await db.exercises.toArray(), id)) {
      throw new ExerciseValidationError({ name: 'Ya existe un ejercicio con ese nombre.' })
    }
    // Changing the kind would change the meaning of logged sets.
    if (fields.kind !== current.kind && (await countSessionsWith(id)) > 0) {
      throw new ExerciseValidationError({ kind: 'No se puede cambiar: ya tiene historial.' })
    }
    const updated: Exercise = { ...current, ...fields, updatedAt: now() }
    await db.exercises.put(updated)
    return updated
  })
}

export async function setExerciseArchived(id: Id, archived: boolean): Promise<void> {
  const timestamp = now()
  const changed = await db.exercises.update(id, {
    archivedAt: archived ? timestamp : null,
    updatedAt: timestamp,
  })
  if (changed === 0) throw new ExerciseNotFoundError(id)
}

/** Permanent delete is only allowed when no routine or session references the exercise. */
export async function deleteExercise(id: Id): Promise<void> {
  await db.transaction('rw', db.exercises, db.routines, db.sessions, async () => {
    if (await isExerciseInUse(id)) {
      throw new Error('Exercise is in use; archive it instead.')
    }
    await db.exercises.delete(id)
  })
}

export async function isExerciseInUse(id: Id): Promise<boolean> {
  if ((await countSessionsWith(id)) > 0) return true
  return (await db.routines.filter((routine) => routine.exerciseIds.includes(id)).count()) > 0
}

function countSessionsWith(id: Id): Promise<number> {
  return db.sessions.where('exerciseIds').equals(id).count()
}

export async function listExercises(): Promise<Exercise[]> {
  return (await db.exercises.toArray()).sort(compareByName)
}

/** Live list of all exercises sorted by name; `undefined` while loading. */
export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(listExercises)
}

/** Live "in use" flag for the edit sheet; `undefined` while loading. */
export function useExerciseInUse(id: Id | null): boolean | undefined {
  return useLiveQuery(() => (id ? isExerciseInUse(id) : false), [id])
}
