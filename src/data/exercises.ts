import { useLiveQuery } from 'dexie-react-hooks'
import {
  compareByName,
  deduceKind,
  exerciseDeleteBlocker,
  isDuplicateName,
  validateExercise,
  type ExerciseFields,
  type DeleteBlocker,
  type ExerciseInput,
} from '../domain/exercise.ts'
import type { Exercise, Id, Routine, WorkoutSession } from '../domain/types.ts'
import { db } from './db.ts'
import { NotFoundError, ValidationError } from './errors.ts'
import { createId } from './ids.ts'

const now = () => new Date().toISOString()

function validOrThrow(input: ExerciseInput) {
  const result = validateExercise(input, { requireTargetSets: true })
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
 * Targets left out of `input` are kept (absent never means "clear"). Changing the target weight or
 * reps stamps `targetUpdatedAt`, so the next workout proposes them (the sets do not change what is
 * proposed). Without history, the kind follows the weight.
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
    const targetsChanged = fields.targetWeight !== current.targetWeight || fields.targetReps !== current.targetReps
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

/**
 * Deletes an exercise from the catalog. Past workouts keep its name and kind (like a receipt) and
 * routines drop it, all in one transaction. Refused while it is in the workout in progress or is a
 * routine's only exercise (domain/exercise.ts › exerciseDeleteBlocker).
 */
export async function deleteExercise(id: Id): Promise<void> {
  await db.transaction('rw', db.exercises, db.routines, db.sessions, async () => {
    const exercise = await db.exercises.get(id)
    if (!exercise) throw new NotFoundError('Exercise', id)
    const usage = await getExerciseUsage(id)
    if (usage.blocker) throw new Error(`Exercise can't be deleted: ${usage.blocker.reason}.`)

    const deletedExercise = { name: exercise.name, kind: exercise.kind }
    await db.sessions
      .where('exerciseIds')
      .equals(id)
      .modify((session: WorkoutSession) => {
        for (const entry of session.exercises) if (entry.exerciseId === id) entry.deletedExercise = deletedExercise
      })
    const timestamp = now()
    await db.routines
      .filter((routine) => routine.exerciseIds.includes(id))
      .modify((routine: Routine) => {
        routine.exerciseIds = routine.exerciseIds.filter((exerciseId) => exerciseId !== id)
        routine.updatedAt = timestamp
      })
    await db.exercises.delete(id)
  })
}

/** Where an exercise is used, to explain what deleting it does (or why it can't be deleted yet). */
export type ExerciseUsage = {
  /** Routines that include it (archived ones too), by name. */
  routineNames: string[]
  /** Workouts with it, finished or in progress. */
  sessionCount: number
  blocker: DeleteBlocker | null
}

export async function getExerciseUsage(id: Id): Promise<ExerciseUsage> {
  const routines = (await db.routines.filter((routine) => routine.exerciseIds.includes(id)).toArray()).sort(compareByName)
  const active = await db.sessions.filter((session) => session.finishedAt === null).first()
  return {
    routineNames: routines.map((routine) => routine.name),
    sessionCount: await countSessionsWith(id),
    blocker: exerciseDeleteBlocker(id, routines, active ?? null),
  }
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

/** Live usage for the edit sheet; `undefined` while loading, null for a new exercise. */
export function useExerciseUsage(id: Id | null): ExerciseUsage | null | undefined {
  return useLiveQuery(async () => (id ? getExerciseUsage(id) : null), [id])
}
