import type { SessionSummary } from '../../../domain/history.ts'
import type { Id } from '../../../domain/types.ts'
import { count, formatDuration } from '../../../shared/lib/format.ts'

/** Title of a workout: its routine's name, or "Entrenamiento libre". */
export function sessionName(routineId: Id | null, routineNames: ReadonlyMap<Id, string>): string {
  if (routineId === null) return 'Entrenamiento libre'
  return routineNames.get(routineId) ?? 'Rutina'
}

/**
 * "4 ejercicios · 16 series · 54 min". The duration is left out when it is unknown or under a minute
 * (never "0 min"), and a workout without sets (only possible from an old backup) says so.
 */
export function sessionMeta(summary: SessionSummary): string {
  if (summary.setCount === 0) return 'Sin series'
  const parts = [count(summary.exerciseCount, 'ejercicio', 'ejercicios'), count(summary.setCount, 'serie', 'series')]
  if (summary.durationMinutes) parts.push(formatDuration(summary.durationMinutes))
  return parts.join(' · ')
}
