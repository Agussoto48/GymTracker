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
            <svg className={styles.chevron} width="8" height="14" viewBox="0 0 8 14" aria-hidden="true">
              <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
