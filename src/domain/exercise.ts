import { normalizeName } from './names.ts'
import type { DeletedExercise, Exercise, ExerciseKind, Id, Routine, WeightUnit, WorkoutSession } from './types.ts'
import { REPS_MAX, WEIGHT_MAX, isValidWeightValue } from './workout.ts'

export { compareByName, isDuplicateName, nameKey, normalizeName } from './names.ts'

export const EXERCISE_NAME_MAX_LENGTH = 80
export const EXERCISE_NOTES_MAX_LENGTH = 500
export const TARGET_SETS_MAX = 20

const KINDS: readonly ExerciseKind[] = ['weighted', 'bodyweight']
const UNITS: readonly WeightUnit[] = ['kg', 'lb']

/** Raw values coming from a form or an import. */
export type ExerciseInput = {
  name: unknown
  /** Optional for callers that deduce it (see `deduceKind`); validation still requires a value. */
  kind?: unknown
  defaultUnit: unknown
  notes: unknown
  /** Targets are optional: missing (older data, backups) means none. */
  targetWeight?: unknown
  targetSets?: unknown
  targetReps?: unknown
}

export type ExerciseFields = Pick<
  Exercise,
  'name' | 'kind' | 'defaultUnit' | 'notes' | 'targetWeight' | 'targetSets' | 'targetReps'
>

/** No "Tipo" question: an exercise without a target weight is a bodyweight one (load optional per set). */
export function deduceKind(targetWeight: number | null): ExerciseKind {
  return targetWeight === null ? 'bodyweight' : 'weighted'
}

const isWholeIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

export type ExerciseErrors = Partial<Record<keyof ExerciseFields, string>>

export type ValidationResult =
  | { ok: true; value: ExerciseFields }
  | { ok: false; errors: ExerciseErrors }

export type ExerciseValidationOptions = {
  /**
   * Exercises saved from the app must say how many sets (the workout stops there). Imports do not:
   * exercises from before this rule have none, and then the workout has no limit.
   */
  requireTargetSets?: boolean
}

export function validateExercise(input: ExerciseInput, options: ExerciseValidationOptions = {}): ValidationResult {
  const errors: ExerciseErrors = {}

  const name = typeof input.name === 'string' ? normalizeName(input.name) : ''
  if (name.length === 0) {
    errors.name = 'Escribe un nombre.'
  } else if (name.length > EXERCISE_NAME_MAX_LENGTH) {
    errors.name = `Máximo ${EXERCISE_NAME_MAX_LENGTH} caracteres.`
  }

  if (!KINDS.includes(input.kind as ExerciseKind)) {
    errors.kind = 'Elige un tipo.'
  }

  if (!UNITS.includes(input.defaultUnit as WeightUnit)) {
    errors.defaultUnit = 'Elige kg o lb.'
  }

  const notes = typeof input.notes === 'string' ? input.notes.trim() : ''
  if (input.notes !== undefined && typeof input.notes !== 'string') {
    errors.notes = 'Nota inválida.'
  } else if (notes.length > EXERCISE_NOTES_MAX_LENGTH) {
    errors.notes = `Máximo ${EXERCISE_NOTES_MAX_LENGTH} caracteres.`
  }

  const targetWeight = input.targetWeight ?? null
  if (targetWeight !== null && !isValidWeightValue(targetWeight)) {
    errors.targetWeight = `Peso entre 0 y ${WEIGHT_MAX}, máximo 2 decimales.`
  }
  const targetSets = input.targetSets ?? null
  if (targetSets === null && options.requireTargetSets) {
    errors.targetSets = 'Escribe cuántas series harás.'
  } else if (targetSets !== null && !isWholeIn(targetSets, 1, TARGET_SETS_MAX)) {
    errors.targetSets = `Series enteras entre 1 y ${TARGET_SETS_MAX}.`
  }
  const targetReps = input.targetReps ?? null
  if (targetReps !== null && !isWholeIn(targetReps, 1, REPS_MAX)) {
    errors.targetReps = `Reps enteras entre 1 y ${REPS_MAX}.`
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      kind: input.kind as ExerciseKind,
      defaultUnit: input.defaultUnit as WeightUnit,
      notes,
      targetWeight: targetWeight as number | null,
      targetSets: targetSets as number | null,
      targetReps: targetReps as number | null,
    },
  }
}

/**
 * The copy a workout keeps of a deleted exercise (e.g. from a backup), or null when it is not valid.
 * Only the name and the kind: the sets carry their own weight and unit.
 */
export function parseDeletedExercise(raw: unknown): DeletedExercise | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { name, kind } = raw as Record<string, unknown>
  const normalized = typeof name === 'string' ? normalizeName(name) : ''
  if (normalized.length === 0 || normalized.length > EXERCISE_NAME_MAX_LENGTH) return null
  if (!KINDS.includes(kind as ExerciseKind)) return null
  return { name: normalized, kind: kind as ExerciseKind }
}

/** Why an exercise can't be deleted right now. */
export type DeleteBlocker = { reason: 'active-workout' } | { reason: 'only-exercise'; routineName: string }

/**
 * A used exercise can be deleted: past workouts keep its name and kind, and routines drop it. Except
 * while it is in the workout in progress, or when it is a routine's only exercise (a routine needs one).
 * Returns null when it can be deleted.
 */
export function exerciseDeleteBlocker(
  exerciseId: Id,
  routines: readonly Pick<Routine, 'name' | 'exerciseIds'>[],
  activeSession: Pick<WorkoutSession, 'exercises'> | null,
): DeleteBlocker | null {
  if (activeSession?.exercises.some((e) => e.exerciseId === exerciseId)) return { reason: 'active-workout' }
  const only = routines.find((r) => r.exerciseIds.length === 1 && r.exerciseIds[0] === exerciseId)
  return only ? { reason: 'only-exercise', routineName: only.name } : null
}
