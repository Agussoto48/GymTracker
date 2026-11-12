import { useLiveQuery } from 'dexie-react-hooks'
import {
  compareByName,
  deduceKind,
  isDuplicateName,
  validateExercise,
  type ExerciseFields,
  type ExerciseInput,
} from '../domain/exercise.ts'
import type { Exercise, Id } from '../domain/types.ts'
import { db } from './db.ts'
import { NotFoundError, ValidationError } from './errors.ts'
import { createId } from './ids.ts'

const now = () => new Date().toISOString()

function validOrThrow(input: ExerciseInput) {
  const result = validateExercise(input)
  if (!result.ok) throw new ValidationError(result.errors)
  return result.value
}

/** Kind from the form's weight when the caller does not say it (empty weight = bodyweight). */
const kindFromRawWeight = (raw: unknown) => deduceKind(raw === null || raw === undefined ? null : 0)

const hasAnyTarget = (fields: Pick<ExerciseFields, 'targetWeight' | 'targetSets' | 'targetReps'>) =>
  fields.targetWeight !== null || fields.targetSets !== null || fields.targetReps !== null

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const fields = validOrThrow({ ...input, kind: input.kind ?? kindFromRawWeight(input.targetWeight) })
  return db.transaction('rw', db.exercises, async () => {
    if (isDuplicateName(fields.name, await db.exercises.toArray())) {
      throw new ValidationError({ name: 'Ya existe un ejercicio con ese nombre.' })
    }
    const timestamp = now()
    const exercise: Exercise = {
      id: createId(),
      ...fields,
      targetUpdatedAt: hasAnyTarget(fields) ? timestamp : null,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.exercises.add(exercise)
    return exercise
  })
}

/**
 * Targets left out of `input` are kept (absent never means "clear"). Changing any target stamps
 * `targetUpdatedAt`, so the next workout proposes them. Without history, the kind follows the weight.
 */
export async function updateExercise(id: Id, input: ExerciseInput): Promise<Exercise> {
  return db.transaction('rw', db.exercises, db.sessions, async () => {
    const current = await db.exercises.get(id)
    if (!current) throw new NotFoundError('Exercise', id)
    const hasHistory = (await countSessionsWith(id)) > 0
    const merged = {
      ...input,
      targetWeight: input.targetWeight === undefined ? current.targetWeight : input.targetWeight,
      targetSets: input.targetSets === undefined ? current.targetSets : input.targetSets,
      targetReps: input.targetReps === undefined ? current.targetReps : input.targetReps,
    }
    const kind = input.kind ?? (hasHistory ? current.kind : kindFromRawWeight(merged.targetWeight))
    const fields = validOrThrow({ ...merged, kind })
    if (isDuplicateName(fields.name, await db.exercises.toArray(), id)) {
      throw new ValidationError({ name: 'Ya existe un ejercicio con ese nombre.' })
    }
    // Changing the kind would change the meaning of logged sets.
    if (fields.kind !== current.kind && hasHistory) {
      throw new ValidationError({ kind: 'No se puede cambiar: ya tiene historial.' })
    }
    const timestamp = now()
    const targetsChanged =
      fields.targetWeight !== current.targetWeight ||
      fields.targetSets !== current.targetSets ||
      fields.targetReps !== current.targetReps
    const updated: Exercise = {
      ...current,
      ...fields,
      targetUpdatedAt: targetsChanged ? timestamp : current.targetUpdatedAt,
      updatedAt: timestamp,
    }
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
  if (changed === 0) throw new NotFoundError('Exercise', id)
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
