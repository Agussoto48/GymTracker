import { useState } from 'react'
import { summarizeSession } from '../../../domain/history.ts'
import type { Exercise, Id, WorkoutSession } from '../../../domain/types.ts'
import { deleteFinishedSession } from '../../../data/sessions.ts'
import { count, formatDuration, formatLongDate, formatShortDate, formatTime } from '../../../shared/lib/format.ts'
import { useConfirm } from '../../../shared/ui/useConfirm.tsx'
import { RowButton } from '../../../shared/ui/RowButton.tsx'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import { ExerciseHistory } from './ExerciseHistory.tsx'
import { sessionName } from './sessionName.ts'
import { SetList } from './SetList.tsx'
import styles from './SessionSheet.module.css'

type SessionSheetProps = {
  session: WorkoutSession
  exerciseById: ReadonlyMap<Id, Exercise>
  routineNames: ReadonlyMap<Id, string>
  onClose: () => void
}

/** Read-only detail of a finished workout (deletable, not editable), with each exercise's history as a sub-view. */
export function SessionSheet({ session, exerciseById, routineNames, onClose }: SessionSheetProps) {
  const [historyOf, setHistoryOf] = useState<Exercise | null>(null)
  const [error, setError] = useState<string | null>(null)
  const summary = summarizeSession(session)
  const [confirm, confirmSheet] = useConfirm()

  async function remove() {
    const confirmed = await confirm({
      title: `¿Eliminar el entrenamiento del ${formatShortDate(session.startedAt)}?`,
      message: `Se borrarán sus ${count(summary.setCount, 'serie', 'series')}. No se puede deshacer.`,
      confirmLabel: 'Eliminar entrenamiento',
      destructive: true,
    })
    if (!confirmed) return
    try {
      await deleteFinishedSession(session.id)
      onClose()
    } catch {
      setError('No se pudo eliminar el entrenamiento. Intenta de nuevo.')
    }
  }

  return (
    <Sheet
      title={historyOf ? historyOf.name : sessionName(session.routineId, routineNames)}
      closeLabel={historyOf ? '‹ Atrás' : 'Cerrar'}
      onClose={historyOf ? () => setHistoryOf(null) : onClose}
      viewKey={historyOf?.id ?? 'detail'}
    >
      {historyOf ? (
        <ExerciseHistory exercise={historyOf} currentSessionId={session.id} routineNames={routineNames} />
      ) : (
        <>
          <div className={styles.summary}>
            <p className={styles.date}>{formatLongDate(session.startedAt)}</p>
            <p className={`${styles.meta} figures`}>
              {formatTime(session.startedAt)}
              {session.finishedAt && `–${formatTime(session.finishedAt)}`}
              {summary.durationMinutes !== null && ` · ${formatDuration(summary.durationMinutes)}`}
              {` · ${count(summary.exerciseCount, 'ejercicio', 'ejercicios')} · ${count(summary.setCount, 'serie', 'series')}`}
            </p>
          </div>

          <div className={styles.exercises}>
            {session.exercises.map((entry) => {
              const exercise = exerciseById.get(entry.exerciseId)
              return (
                <section key={entry.exerciseId} className={styles.card} aria-label={exercise?.name ?? 'Ejercicio'}>
                  <h3 className={styles.title}>
                    {exercise ? (
                      <button
                        type="button"
                        className={styles.titleButton}
                        onClick={() => setHistoryOf(exercise)}
                        aria-label={`${exercise.name}: ver historial`}
                      >
                        <span className={styles.name}>{exercise.name}</span>
                        <span className={styles.historyLink} aria-hidden="true">
                          Historial ›
                        </span>
                      </button>
                    ) : (
                      <span className={styles.name}>Ejercicio desconocido</span>
                    )}
                  </h3>
                  {entry.notes && <p className={styles.note}>{entry.notes}</p>}
                  <SetList sets={entry.sets} kind={exercise?.kind ?? 'weighted'} />
                </section>
              )
            })}
          </div>

          <div className={styles.manage}>
            <RowButton tone="destructive" onClick={() => void remove()}>
              Eliminar entrenamiento
            </RowButton>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
          </div>
        </>
      )}
      {confirmSheet}
    </Sheet>
  )
}
