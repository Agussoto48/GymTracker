// Persisted data model (schema v1). See ADR-0003.

export type Id = string
/** ISO 8601 in UTC, e.g. new Date().toISOString(). */
export type IsoDateTime = string
export type WeightUnit = 'kg' | 'lb'
export type ExerciseKind = 'weighted' | 'bodyweight'

export type Exercise = {
  id: Id
  name: string
  kind: ExerciseKind
  defaultUnit: WeightUnit
  /** Fixed note shown every time, e.g. "seat on 4". Empty string when none. */
  notes: string
  /*
   * Targets (schema v2), all optional (null = none). Weight is in `defaultUnit` (bodyweight: added load).
   * They are shown as a guide when training, and drive the first set's ghost while they are newer
   * than the last workout with this exercise; otherwise "last time" does.
   */
  targetWeight: number | null
  targetSets: number | null
  targetReps: number | null
  /** When the targets were last set (null = never). */
  targetUpdatedAt: IsoDateTime | null
  /** Archived exercises are hidden from the catalog but kept for history. */
  archivedAt: IsoDateTime | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type Routine = {
  id: Id
  name: string
  exerciseIds: Id[]
  archivedAt: IsoDateTime | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type Weight = { value: number; unit: WeightUnit }

export type WorkoutSet = {
  id: Id
  /** weighted: required. bodyweight: null = no added load, value = added load. */
  weight: Weight | null
  reps: number
  /** 1–10 in steps of 0.5; null = not recorded. */
  rpe: number | null
  completedAt: IsoDateTime
}

export type SessionExercise = {
  exerciseId: Id
  /** Note for this session only. Empty string when none. */
  notes: string
  sets: WorkoutSet[]
}

export type WorkoutSession = {
  id: Id
  routineId: Id | null
  startedAt: IsoDateTime
  finishedAt: IsoDateTime | null
  exercises: SessionExercise[]
  /** Derived from `exercises` for indexing; maintained by the data layer. */
  exerciseIds: Id[]
}
