import type { Exercise, Id } from '../../../domain/types.ts'
import { SelectionMark } from '../../../shared/ui/SelectionMark.tsx'
import styles from './ExerciseList.module.css'

const KIND_LABEL = { weighted: 'Con peso', bodyweight: 'Peso corporal' } as const

type ExerciseListProps = {
  exercises: readonly Exercise[]
  onSelect: (exercise: Exercise) => void
  /** In selection mode, a tap toggles the row instead of opening it. */
  selection?: { isSelected: (id: Id) => boolean; toggle: (id: Id) => void }
}

export function ExerciseList({ exercises, onSelect, selection }: ExerciseListProps) {
  return (
    <ul className={styles.list}>
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <button
            type="button"
            className={`${styles.row} ${selection?.isSelected(exercise.id) ? styles.selected : ''}`}
            aria-pressed={selection ? selection.isSelected(exercise.id) : undefined}
            onClick={() => (selection ? selection.toggle(exercise.id) : onSelect(exercise))}
          >
            {selection && <SelectionMark selected={selection.isSelected(exercise.id)} />}
            <span className={styles.text}>
              <span className={styles.name}>{exercise.name}</span>
              <span className={styles.meta}>
                {KIND_LABEL[exercise.kind]} · {exercise.defaultUnit}
                {exercise.notes && ` · ${exercise.notes}`}
              </span>
            </span>
            {/* Words, not a chevron: the row opens the edit form (a chevron read as "expand"). */}
            {!selection && <span className={styles.edit}>Editar</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
