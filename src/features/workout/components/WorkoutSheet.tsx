import { useState } from 'react'
import type { Exercise, SessionExercise, WorkoutSession } from '../../../domain/types.ts'
import { exerciseToOpen, splitFinished } from '../../../domain/workout.ts'
import { addExerciseToSession, discardSession, finishSession } from '../../../data/sessions.ts'
import { count, formatTime, minutesBetween } from '../../../shared/lib/format.ts'
import { useNow } from '../../../shared/lib/useNow.ts'
import { ExercisePicker } from '../../../shared/ui/ExercisePicker.tsx'
import { useConfirm } from '../../../shared/ui/useConfirm.tsx'
import { RowButton } from '../../../shared/ui/RowButton.tsx'
import { Section } from '../../../shared/ui/Section.tsx'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import { ExerciseCard } from './ExerciseCard.tsx'
import styles from './WorkoutSheet.module.css'

type WorkoutSheetProps = {
  session: WorkoutSession
  exercises: readonly Exercise[]
  /** Routine name, or null for a free workout. */
  routineName: string | null
  /** Hides the workout without finishing it; it can be resumed from the Entrenar tab. */
  onHide: () => void
}

export function WorkoutSheet({ session, exercises, routineName, onHide }: WorkoutSheetProps) {
  const now = useNow()
  const [picking, setPicking] = useState(false)
  // The open card: first pending exercise without sets (routine order), else the last pending one.
  const [expandedId, setExpandedId] = useState<string | null>(() => exerciseToOpen(session.exercises))
  // Scroll only after the person opens a card or adds an exercise, not when the sheet opens.
  const [userExpanded, setUserExpanded] = useState(false)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const { pending, finished } = splitFinished(session.exercises)

  function expand(exerciseId: string | null) {
    setUserExpanded(true)
    setExpandedId(exerciseId)
  }

  function card(entry: SessionExercise) {
    const exercise = byId.get(entry.exerciseId)
    if (!exercise) return null
    return (
      <ExerciseCard
        key={entry.exerciseId}
        sessionId={session.id}
        entry={entry}
        exercise={exercise}
        expanded={expandedId === entry.exerciseId}
        onExpand={() => expand(entry.exerciseId)}
        onCollapse={() => setExpandedId(null)}
        scrollOnExpand={userExpanded}
        onFinished={(updated) => expand(exerciseToOpen(updated.exercises))}
      />
    )
  }
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0)
  const [confirm, confirmSheet] = useConfirm()

  async function finish() {
    if (totalSets === 0) {
      const confirmed = await confirm({
        title: 'No registraste ninguna serie',
        message: 'Un entrenamiento sin series no se guarda.',
        confirmLabel: 'Descartar entrenamiento',
        destructive: true,
      })
      if (confirmed) await discardSession(session.id)
      return
    }
    const withoutSets = session.exercises.filter((e) => e.sets.length === 0).length
    const confirmed = await confirm({
      title: `¿Terminar el entrenamiento? (${count(totalSets, 'serie', 'series')})`,
      message: withoutSets > 0 ? `Los ejercicios sin series (${withoutSets}) no se guardan.` : undefined,
      confirmLabel: 'Terminar entrenamiento',
    })
    if (confirmed) await finishSession(session.id)
  }

  async function discard() {
    const confirmed = await confirm({
      title: '¿Descartar este entrenamiento?',
      message: totalSets > 0 ? `Se borrarán sus ${count(totalSets, 'serie', 'series')}.` : undefined,
      confirmLabel: 'Descartar entrenamiento',
      destructive: true,
    })
    if (confirmed) await discardSession(session.id)
  }

  return (
    <Sheet
      title={routineName ?? 'Entrenamiento'}
      closeLabel="Ocultar"
      onClose={onHide}
      action={
        <button type="button" className={styles.finish} onClick={() => void finish()}>
          Terminar
        </button>
      }
    >
      <p className={`${styles.status} figures`}>
        Iniciado {formatTime(session.startedAt)} · {minutesBetween(session.startedAt, now)} min · {totalSets}{' '}
        {totalSets === 1 ? 'serie' : 'series'}
      </p>

      <div className={styles.exercises}>{pending.map(card)}</div>

      {session.exercises.length === 0 && (
        <p className={styles.hint}>Agrega el primer ejercicio para empezar a anotar series.</p>
      )}

      <button type="button" className={styles.add} onClick={() => setPicking(true)}>
        + Agregar ejercicio
      </button>

      {/* Done for today: out of the way at the end, still open to view or add a set. */}
      {finished.length > 0 && (
        <div className={styles.finished}>
          <Section title="Finalizados">
            <div className={styles.exercises}>{finished.map(card)}</div>
          </Section>
        </div>
      )}

      <RowButton tone="destructive" className={styles.discard} onClick={() => void discard()}>
        Descartar entrenamiento
      </RowButton>

      {picking && (
        <ExercisePicker
          exercises={exercises}
          excludeIds={session.exerciseIds}
          onClose={() => setPicking(false)}
          onPick={async (exercise) => {
            await addExerciseToSession(session.id, exercise.id)
            setPicking(false)
            expand(exercise.id)
          }}
        />
      )}
      {confirmSheet}
    </Sheet>
  )
}
