import { exerciseHistory } from './history.ts'
import type { ExerciseKind, Id, Weight, WeightUnit, WorkoutSession, WorkoutSet } from './types.ts'

export const WEIGHT_MAX = 2000
export const REPS_MAX = 200
export const SESSION_NOTES_MAX_LENGTH = 500
/** RPE values offered in the UI; validation accepts the full 1–10 range. */
export const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const
export const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 }

export type SetInput = {
  /** null = no weight entered (only valid for bodyweight exercises). */
  weight: number | null
  unit: WeightUnit
  reps: number | null
  rpe: number | null
}

export type SetFields = Pick<WorkoutSet, 'weight' | 'reps' | 'rpe'>
export type SetErrors = Partial<Record<'weight' | 'reps' | 'rpe', string>>
export type SetValidation = { ok: true; value: SetFields } | { ok: false; errors: SetErrors }

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
}

export function isValidWeightValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= WEIGHT_MAX &&
    hasAtMostTwoDecimals(value)
  )
}

export function isValidRpe(value: unknown): value is number {
  return typeof value === 'number' && value >= 1 && value <= 10 && Number.isInteger(value * 2)
}

export function validateSet(input: SetInput, kind: ExerciseKind): SetValidation {
  const errors: SetErrors = {}

  let weight: Weight | null = null
  if (input.weight === null) {
    if (kind === 'weighted') errors.weight = 'Anota el peso.'
  } else if (!isValidWeightValue(input.weight)) {
    errors.weight = `Peso entre 0 y ${WEIGHT_MAX}, máximo 2 decimales.`
  } else if (input.unit !== 'kg' && input.unit !== 'lb') {
    errors.weight = 'Unidad inválida.'
  } else {
    weight = { value: input.weight, unit: input.unit }
  }

  if (input.reps === null) {
    errors.reps = 'Anota las repeticiones.'
  } else if (!Number.isInteger(input.reps) || input.reps < 0 || input.reps > REPS_MAX) {
    errors.reps = `Repeticiones enteras entre 0 y ${REPS_MAX}.`
  }

  if (input.rpe !== null && !isValidRpe(input.rpe)) {
    errors.rpe = 'RPE entre 1 y 10, en pasos de 0,5.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { weight, reps: input.reps as number, rpe: input.rpe } }
}

/** Parses user-typed numbers, accepting both "62,5" and "62.5". Empty → null; garbage → NaN. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return null
  return /^\d*\.?\d+$|^\d+\.$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

/** Adds or subtracts one step, never below zero, rounded to 2 decimals. */
export function stepWeight(value: number, unit: WeightUnit, direction: 1 | -1): number {
  const next = value + direction * WEIGHT_STEP[unit]
  return Math.max(0, Math.round(next * 100) / 100)
}

export type LastPerformance = { sessionId: Id; startedAt: string; sets: WorkoutSet[] }

/**
 * Most recent finished session (other than `excludeSessionId`) where the exercise has sets.
 * It does not matter which routine the session came from.
 */
export function findLastPerformance(
  sessions: readonly WorkoutSession[],
  exerciseId: Id,
  excludeSessionId?: Id,
): LastPerformance | null {
  const others = sessions.filter((session) => session.id !== excludeSessionId)
  const [latest] = exerciseHistory(others, exerciseId)
  return latest ? { sessionId: latest.sessionId, startedAt: latest.startedAt, sets: latest.sets } : null
}

export type SetSuggestion = {
  weight: Weight | null
  reps: number
  source: 'last-time' | 'previous-set'
}

/**
 * The "ghost" for the next set: same set number from last time; if this session already has
 * more sets than last time, the previous set of this session. null when there is nothing to suggest.
 */
export function suggestNextSet(
  lastTimeSets: readonly WorkoutSet[],
  currentSets: readonly WorkoutSet[],
): SetSuggestion | null {
  const fromLastTime = lastTimeSets[currentSets.length]
  if (fromLastTime) return { weight: fromLastTime.weight, reps: fromLastTime.reps, source: 'last-time' }
  const previous = currentSets.at(-1)
  if (previous) return { weight: previous.weight, reps: previous.reps, source: 'previous-set' }
  return null
}

/** Keeps the indexed `exerciseIds` in sync with `exercises` (ADR-0003). */
export function withDerivedExerciseIds(session: WorkoutSession): WorkoutSession {
  return { ...session, exerciseIds: session.exercises.map((e) => e.exerciseId) }
}
