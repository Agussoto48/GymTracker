import { useLiveQuery } from 'dexie-react-hooks'
import { exerciseHistory, type ExerciseHistoryEntry } from '../domain/history.ts'
import type { Id, WorkoutSession, WorkoutSet } from '../domain/types.ts'
import {
  SESSION_NOTES_MAX_LENGTH,
  findLastPerformance,
  validateSet,
  withDerivedExerciseIds,
  type LastPerformance,
  type SetInput,
} from '../domain/workout.ts'
import { db } from './db.ts'
import { NotFoundError, ValidationError } from './errors.ts'
import { createId } from './ids.ts'

export class ActiveSessionExistsError extends Error {
  constructor() {
    super('There is already a workout in progress.')
  }
}

const now = () => new Date().toISOString()

/** The workout in progress, if any (at most one, ADR-0003). */
export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  return db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((session) => session.finishedAt === null)
    .first()
}

/** Starts a free workout, or one prefilled with a routine's exercises (archived ones are skipped). */
export async function startSession(routineId: Id | null = null): Promise<WorkoutSession> {
  return db.transaction('rw', db.sessions, db.routines, db.exercises, async () => {
    if (await getActiveSession()) throw new ActiveSessionExistsError()
    let exerciseIds: Id[] = []
    if (routineId) {
      const routine = await db.routines.get(routineId)
      if (!routine) throw new NotFoundError('Routine', routineId)
      const exercises = await db.exercises.bulkGet(routine.exerciseIds)
      exerciseIds = exercises.filter((e) => e && e.archivedAt === null).map((e) => e!.id)
    }
    const session = withDerivedExerciseIds({
      id: createId(),
      routineId,
      startedAt: now(),
      finishedAt: null,
      exercises: exerciseIds.map((exerciseId) => ({ exerciseId, notes: '', sets: [] })),
      exerciseIds: [],
    })
    await db.sessions.add(session)
    return session
  })
}

/** Reads, changes and writes an in-progress session inside one transaction. */
async function changeActiveSession(
  sessionId: Id,
  change: (session: WorkoutSession) => WorkoutSession,
): Promise<WorkoutSession> {
  return db.transaction('rw', db.sessions, db.exercises, async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) throw new NotFoundError('Session', sessionId)
    if (session.finishedAt !== null) throw new Error('Session is already finished.')
    const updated = withDerivedExerciseIds(change(session))
    await db.sessions.put(updated)
    return updated
  })
}

function updateEntry(
  session: WorkoutSession,
  exerciseId: Id,
  change: (entry: WorkoutSession['exercises'][number]) => WorkoutSession['exercises'][number],
): WorkoutSession {
  if (!session.exercises.some((e) => e.exerciseId === exerciseId)) {
    throw new NotFoundError('Session exercise', exerciseId)
  }
  return {
    ...session,
    exercises: session.exercises.map((e) => (e.exerciseId === exerciseId ? change(e) : e)),
  }
}

export async function addExerciseToSession(sessionId: Id, exerciseId: Id): Promise<WorkoutSession> {
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) throw new NotFoundError('Exercise', exerciseId)
  return changeActiveSession(sessionId, (session) => {
    if (session.exercises.some((e) => e.exerciseId === exerciseId)) return session
    return { ...session, exercises: [...session.exercises, { exerciseId, notes: '', sets: [] }] }
  })
}

export async function removeExerciseFromSession(sessionId: Id, exerciseId: Id): Promise<WorkoutSession> {
  return changeActiveSession(sessionId, (session) => ({
    ...session,
    exercises: session.exercises.filter((e) => e.exerciseId !== exerciseId),
  }))
}

async function validSetFields(exerciseId: Id, input: SetInput) {
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) throw new NotFoundError('Exercise', exerciseId)
  const result = validateSet(input, exercise.kind)
  if (!result.ok) throw new ValidationError(result.errors)
  return result.value
}

/** Saves a set immediately: iOS may close the app in the background at any time. */
export async function addSet(sessionId: Id, exerciseId: Id, input: SetInput): Promise<WorkoutSet> {
  const fields = await validSetFields(exerciseId, input)
  const newSet: WorkoutSet = { id: createId(), ...fields, completedAt: now() }
  await changeActiveSession(sessionId, (session) =>
    updateEntry(session, exerciseId, (entry) => ({ ...entry, sets: [...entry.sets, newSet] })),
  )
  return newSet
}

export async function updateSet(sessionId: Id, exerciseId: Id, setId: Id, input: SetInput): Promise<void> {
  const fields = await validSetFields(exerciseId, input)
  await changeActiveSession(sessionId, (session) =>
    updateEntry(session, exerciseId, (entry) => {
      if (!entry.sets.some((s) => s.id === setId)) throw new NotFoundError('Set', setId)
      return { ...entry, sets: entry.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)) }
    }),
  )
}

export async function deleteSet(sessionId: Id, exerciseId: Id, setId: Id): Promise<void> {
  await changeActiveSession(sessionId, (session) =>
    updateEntry(session, exerciseId, (entry) => ({ ...entry, sets: entry.sets.filter((s) => s.id !== setId) })),
  )
}

export async function setSessionExerciseNotes(sessionId: Id, exerciseId: Id, notes: string): Promise<void> {
  const trimmed = notes.trim()
  if (trimmed.length > SESSION_NOTES_MAX_LENGTH) {
    throw new ValidationError({ notes: `Máximo ${SESSION_NOTES_MAX_LENGTH} caracteres.` })
  }
  await changeActiveSession(sessionId, (session) =>
    updateEntry(session, exerciseId, (entry) => ({ ...entry, notes: trimmed })),
  )
}

/** Finishes the workout; exercises without sets are dropped. Refuses an empty workout. */
export async function finishSession(sessionId: Id): Promise<WorkoutSession> {
  return changeActiveSession(sessionId, (session) => {
    const exercises = session.exercises.filter((e) => e.sets.length > 0)
    if (exercises.length === 0) throw new Error('Cannot finish a workout without sets.')
    return { ...session, exercises, finishedAt: now() }
  })
}

export async function discardSession(sessionId: Id): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    if (session && session.finishedAt !== null) throw new Error('Finished workouts are not discarded here.')
    await db.sessions.delete(sessionId)
  })
}

/** Deletes a finished workout (history). A workout in progress is discarded with `discardSession`. */
export async function deleteFinishedSession(sessionId: Id): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    if (!session) throw new NotFoundError('Session', sessionId)
    if (session.finishedAt === null) throw new Error('A workout in progress is discarded, not deleted.')
    await db.sessions.delete(sessionId)
  })
}

/** Finished workouts, newest first. */
export async function listFinishedSessions(): Promise<WorkoutSession[]> {
  return db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((session) => session.finishedAt !== null)
    .toArray()
}

/** Every finished workout where the exercise has sets, newest first, from any routine. */
export async function getExerciseHistory(exerciseId: Id): Promise<ExerciseHistoryEntry[]> {
  const candidates = await db.sessions.where('exerciseIds').equals(exerciseId).toArray()
  return exerciseHistory(candidates, exerciseId)
}

/** Last finished performance of an exercise, from any routine. */
export async function getLastPerformance(exerciseId: Id, excludeSessionId?: Id): Promise<LastPerformance | null> {
  const candidates = await db.sessions.where('exerciseIds').equals(exerciseId).toArray()
  return findLastPerformance(candidates, exerciseId, excludeSessionId)
}

/** Live active session: `undefined` while loading, `null` when there is none. */
export function useActiveSession(): WorkoutSession | null | undefined {
  return useLiveQuery(async () => (await getActiveSession()) ?? null)
}

/** `undefined` while loading, `null` when the exercise has no finished workout. */
export function useLastPerformance(exerciseId: Id | null, excludeSessionId?: Id): LastPerformance | null | undefined {
  return useLiveQuery(
    async () => (exerciseId === null ? null : getLastPerformance(exerciseId, excludeSessionId)),
    [exerciseId, excludeSessionId],
  )
}

export function useFinishedSessions(): WorkoutSession[] | undefined {
  return useLiveQuery(listFinishedSessions)
}

export function useExerciseHistory(exerciseId: Id): ExerciseHistoryEntry[] | undefined {
  return useLiveQuery(() => getExerciseHistory(exerciseId), [exerciseId])
}
