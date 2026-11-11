import { normalizeName } from './names.ts'
import type { Id, Routine } from './types.ts'

export const ROUTINE_NAME_MAX_LENGTH = 60
export const ROUTINE_MAX_EXERCISES = 30

export type RoutineInput = { name: unknown; exerciseIds: unknown }
export type RoutineFields = Pick<Routine, 'name' | 'exerciseIds'>
export type RoutineErrors = Partial<Record<keyof RoutineFields, string>>
export type RoutineValidation = { ok: true; value: RoutineFields } | { ok: false; errors: RoutineErrors }

export function validateRoutine(input: RoutineInput): RoutineValidation {
  const errors: RoutineErrors = {}

  const name = typeof input.name === 'string' ? normalizeName(input.name) : ''
  if (name.length === 0) errors.name = 'Escribe un nombre, p. ej. «Push».'
  else if (name.length > ROUTINE_NAME_MAX_LENGTH) errors.name = `Máximo ${ROUTINE_NAME_MAX_LENGTH} caracteres.`

  const ids = input.exerciseIds
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string' && id.length > 0)) {
    errors.exerciseIds = 'Lista de ejercicios inválida.'
  } else if (ids.length === 0) {
    errors.exerciseIds = 'Agrega al menos un ejercicio.'
  } else if (ids.length > ROUTINE_MAX_EXERCISES) {
    errors.exerciseIds = `Máximo ${ROUTINE_MAX_EXERCISES} ejercicios.`
  } else if (new Set(ids).size !== ids.length) {
    errors.exerciseIds = 'Un ejercicio aparece repetido.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { name, exerciseIds: [...(ids as Id[])] } }
}

/** Returns a copy with the item at `from` moved to `to` (indexes are clamped). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items]
  if (from < 0 || from >= result.length) return result
  const target = Math.max(0, Math.min(result.length - 1, to))
  const [item] = result.splice(from, 1)
  result.splice(target, 0, item)
  return result
}
