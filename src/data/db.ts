import { Dexie, type EntityTable } from 'dexie'
import type { Exercise, Routine, SessionExercise, WorkoutSession } from '../domain/types.ts'

/** Exercises without targets (written before v2) get empty ones: absent never reaches the app as undefined. */
function withTargets(exercise: Partial<Exercise>) {
  exercise.targetWeight ??= null
  exercise.targetSets ??= null
  exercise.targetReps ??= null
  exercise.targetUpdatedAt ??= null
  return exercise
}

/**
 * Fields added to sessions after v1, so absent never reaches the app as undefined: session exercises
 * written before v3 are pending, and sessions written before v4 have no deleted routine's name.
 */
function withSessionDefaults(session: WorkoutSession) {
  for (const entry of session.exercises as Partial<SessionExercise>[]) entry.finishedAt ??= null
  ;(session as Partial<WorkoutSession>).routineName ??= null
  return session
}

// Only this folder may import Dexie (ADR-0002). Schema changes need a new version + upgrade (ADR-0003).
export class GymTrackerDb extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>

  constructor() {
    super('gymtracker')
    this.version(1).stores({
      exercises: 'id, name',
      routines: 'id, name',
      sessions: 'id, startedAt, *exerciseIds',
    })
    // v2: exercises get targets (not indexed). Existing ones start with none; nothing else changes.
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('exercises')
          .toCollection()
          .modify((exercise: Partial<Exercise>) => {
            withTargets(exercise)
          }),
      )
    // v3: each exercise in a session can be marked as finished (not indexed). Existing ones are pending.
    this.version(3)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('sessions')
          .toCollection()
          .modify((session: WorkoutSession) => {
            withSessionDefaults(session)
          }),
      )
    // v4: a session keeps the name of its routine when the routine is deleted (not indexed). None yet.
    this.version(4)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('sessions')
          .toCollection()
          .modify((session: WorkoutSession) => {
            withSessionDefaults(session)
          }),
      )
    // A tab still running an older build can keep writing records without the new fields after an upgrade.
    // bulkGet also passes undefined for missing ids.
    this.exercises.hook('reading', (exercise?: Exercise) => (exercise ? (withTargets(exercise) as Exercise) : exercise))
    this.sessions.hook('reading', (session?: WorkoutSession) => (session ? withSessionDefaults(session) : session))
  }
}

export const db = new GymTrackerDb()
