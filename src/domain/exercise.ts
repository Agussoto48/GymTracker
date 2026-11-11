import { normalizeName } from './names.ts'
import type { Exercise, ExerciseKind, WeightUnit } from './types.ts'

export { compareByName, isDuplicateName, nameKey, normalizeName } from './names.ts'

export const EXERCISE_NAME_MAX_LENGTH = 80
export const EXERCISE_NOTES_MAX_LENGTH = 500

const KINDS: readonly ExerciseKind[] = ['weighted', 'bodyweight']
const UNITS: readonly WeightUnit[] = ['kg', 'lb']

/** Raw values coming from a form or an import. */
export type ExerciseInput = {
  name: unknown
  kind: unknown
  defaultUnit: unknown
  notes: unknown
}

export type ExerciseFields = Pick<Exercise, 'name' | 'kind' | 'defaultUnit' | 'notes'>

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

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      kind: input.kind as ExerciseKind,
      defaultUnit: input.defaultUnit as WeightUnit,
      notes,
    },
  }
}
