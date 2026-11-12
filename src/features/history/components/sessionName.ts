import type { Id } from '../../../domain/types.ts'

/** Title of a workout: its routine's name, or "Entrenamiento libre". */
export function sessionName(routineId: Id | null, routineNames: ReadonlyMap<Id, string>): string {
  if (routineId === null) return 'Entrenamiento libre'
  return routineNames.get(routineId) ?? 'Rutina'
}
