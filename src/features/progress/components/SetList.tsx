import type { ExerciseKind, WorkoutSet } from '../../../domain/types.ts'
import { formatSet } from '../../../shared/lib/format.ts'
import styles from './SetList.module.css'

type SetListProps = {
  sets: readonly WorkoutSet[]
  kind: ExerciseKind
}

/** Read-only list of sets: number, weight × reps (RPE hidden for now; it stays in the data). */
export function SetList({ sets, kind }: SetListProps) {
  return (
    <ol className={styles.sets}>
      {sets.map((set, index) => (
        <li key={set.id} className={`${styles.set} figures`}>
          <span className={styles.number}>{index + 1}</span>
          <span className={styles.value}>{formatSet(set, kind)}</span>
        </li>
      ))}
    </ol>
  )
}
