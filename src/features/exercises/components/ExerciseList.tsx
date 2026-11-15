import type { Exercise } from '../../../domain/types.ts'
import styles from './ExerciseList.module.css'

const KIND_LABEL = { weighted: 'Con peso', bodyweight: 'Peso corporal' } as const

type ExerciseListProps = {
  exercises: readonly Exercise[]
  onSelect: (exercise: Exercise) => void
}

export function ExerciseList({ exercises, onSelect }: ExerciseListProps) {
  return (
    <ul className={styles.list}>
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <button type="button" className={styles.row} onClick={() => onSelect(exercise)}>
            <span className={styles.text}>
              <span className={styles.name}>{exercise.name}</span>
              <span className={styles.meta}>
                {KIND_LABEL[exercise.kind]} · {exercise.defaultUnit}
                {exercise.notes && ` · ${exercise.notes}`}
              </span>
            </span>
            {/* Words, not a chevron: the row opens the edit form (a chevron read as "expand"). */}
            <span className={styles.edit}>Editar</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
