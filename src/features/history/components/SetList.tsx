import type { ExerciseKind, WorkoutSet } from '../../../domain/types.ts'
import { formatNumber, formatSet } from '../../../shared/lib/format.ts'
import styles from './SetList.module.css'

type SetListProps = {
  sets: readonly WorkoutSet[]
  kind: ExerciseKind
}

/** Read-only list of sets: number, weight × reps, RPE. */
export function SetList({ sets, kind }: SetListProps) {
  return (
    <ol className={styles.sets}>
      {sets.map((set, index) => (
        <li key={set.id} className={`${styles.set} figures`}>
          <span className={styles.number}>{index + 1}</span>
          <span className={styles.value}>{formatSet(set, kind)}</span>
          <span className={styles.rpe}>{set.rpe ? `RPE ${formatNumber(set.rpe)}` : ''}</span>
        </li>
      ))}
    </ol>
  )
}
