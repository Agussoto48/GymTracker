import type { Exercise, Id } from '../../../domain/types.ts'
import { useExerciseHistory } from '../../../data/sessions.ts'
import { count, formatSet, formatShortDate } from '../../../shared/lib/format.ts'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import { sessionName } from './sessionName.ts'
import styles from './ExerciseHistorySheet.module.css'

type ExerciseHistorySheetProps = {
  exercise: Exercise
  /** The workout the user came from, marked in the list. */
  currentSessionId: Id
  routineNames: ReadonlyMap<Id, string>
  onClose: () => void
}

/** Every time the exercise was done, newest first, from any routine. */
export function ExerciseHistorySheet({ exercise, currentSessionId, routineNames, onClose }: ExerciseHistorySheetProps) {
  const history = useExerciseHistory(exercise.id)

  return (
    <Sheet title={exercise.name} closeLabel="Atrás" onClose={onClose}>
      {history && (
        <>
          <p className={styles.total}>{count(history.length, 'entrenamiento', 'entrenamientos')}</p>
          <ol className={styles.list}>
            {history.map((entry) => (
              <li key={entry.sessionId} className={styles.entry}>
                <p className={styles.when}>
                  {formatShortDate(entry.startedAt)} · {sessionName(entry.routineId, routineNames)}
                  {entry.sessionId === currentSessionId && <span className={styles.current}> · este</span>}
                </p>
                <p className={`${styles.sets} figures`}>
                  {entry.sets.map((set) => formatSet(set, exercise.kind)).join(' · ')}
                </p>
                {entry.notes && <p className={styles.note}>{entry.notes}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
    </Sheet>
  )
}
