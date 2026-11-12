import { normalizeName } from './names.ts'
import type { Exercise, ExerciseKind, WeightUnit } from './types.ts'
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

export function validateExercise(input: ExerciseInput): ValidationResult {
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
  if (targetSets !== null && !isWholeIn(targetSets, 1, TARGET_SETS_MAX)) {
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
