import type { Exercise, Id, Routine } from '../../../domain/types.ts'
import { SelectionMark } from '../../../shared/ui/SelectionMark.tsx'
import styles from './RoutineList.module.css'

type RoutineListProps = {
  routines: readonly Routine[]
  exercises: readonly Exercise[]
  onSelect: (routine: Routine) => void
  /** In selection mode, a tap toggles the row instead of opening it. */
  selection?: { isSelected: (id: Id) => boolean; toggle: (id: Id) => void }
}

export function RoutineList({ routines, exercises, onSelect, selection }: RoutineListProps) {
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  return (
    <ul className={styles.list}>
      {routines.map((routine) => {
        const count = routine.exerciseIds.length
        return (
          <li key={routine.id}>
            <button
              type="button"
              className={`${styles.row} ${selection?.isSelected(routine.id) ? styles.selected : ''}`}
              aria-pressed={selection ? selection.isSelected(routine.id) : undefined}
              onClick={() => (selection ? selection.toggle(routine.id) : onSelect(routine))}
            >
              {selection && <SelectionMark selected={selection.isSelected(routine.id)} />}
              <span className={styles.text}>
                <span className={styles.name}>{routine.name}</span>
                <span className={styles.meta}>
                  {count} {count === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
                  {routine.exerciseIds.map((id) => names.get(id) ?? '—').join(', ')}
                </span>
              </span>
              {!selection && <span className={styles.edit}>Editar</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
