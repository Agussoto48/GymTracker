import type { Exercise, Routine } from '../../../domain/types.ts'
import styles from './RoutineList.module.css'

type RoutineListProps = {
  routines: readonly Routine[]
  exercises: readonly Exercise[]
  onSelect: (routine: Routine) => void
}

export function RoutineList({ routines, exercises, onSelect }: RoutineListProps) {
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  return (
    <ul className={styles.list}>
      {routines.map((routine) => {
        const count = routine.exerciseIds.length
        return (
          <li key={routine.id}>
            <button type="button" className={styles.row} onClick={() => onSelect(routine)}>
              <span className={styles.name}>{routine.name}</span>
              <span className={styles.meta}>
                {count} {count === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
                {routine.exerciseIds.map((id) => names.get(id) ?? '—').join(', ')}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
