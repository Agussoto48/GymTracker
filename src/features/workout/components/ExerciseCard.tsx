import { useEffect, useRef, useState } from 'react'
import type { Exercise, SessionExercise, WorkoutSession, WorkoutSet } from '../../../domain/types.ts'
import { activeTarget, canFinishExercise, isSetLimitReached, suggestNextSet, type SetInput } from '../../../domain/workout.ts'
import {
  addSet,
  deleteSet,
  finishExercise,
  removeExerciseFromSession,
  reopenExercise,
  setSessionExerciseNotes,
  updateSet,
  useLastPerformance,
} from '../../../data/sessions.ts'
import { count, formatNumber, formatSet, formatShortDate, formatTarget } from '../../../shared/lib/format.ts'
import { ActionSheet, type SheetAction } from '../../../shared/ui/ActionSheet.tsx'
import { MoreButton } from '../../../shared/ui/MoreButton.tsx'
import { useConfirm } from '../../../shared/ui/useConfirm.tsx'
import { RowButton } from '../../../shared/ui/RowButton.tsx'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import { TextField } from '../../../shared/ui/TextField.tsx'
import { SetEntry } from './SetEntry.tsx'
import styles from './ExerciseCard.module.css'

type ExerciseCardProps = {
  sessionId: string
  entry: SessionExercise
  exercise: Exercise
  expanded: boolean
  onExpand: () => void
  /** Bring the card's top under the sheet header when it opens (not on the sheet's first render). */
  scrollOnExpand: boolean
  /** After the person marks it as done, with the updated workout (to open the next exercise). */
  onFinished: (session: WorkoutSession) => void
}

const toInput = (set: WorkoutSet, fallbackUnit: Exercise['defaultUnit']): SetInput => ({
  weight: set.weight?.value ?? null,
  unit: set.weight?.unit ?? fallbackUnit,
  reps: set.reps,
  rpe: set.rpe,
})

export function ExerciseCard({
  sessionId,
  entry,
  exercise,
  expanded,
  onExpand,
  scrollOnExpand,
  onFinished,
}: ExerciseCardProps) {
  const lastTime = useLastPerformance(exercise.id, sessionId)
  const [editing, setEditing] = useState<{ set: WorkoutSet; index: number } | null>(null)
  const [notes, setNotes] = useState(entry.notes)
  const [confirm, confirmSheet] = useConfirm()
  const [menuOpen, setMenuOpen] = useState(false)
  const finished = entry.finishedAt !== null
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!expanded || !scrollOnExpand || !card) return
    // Leave it alone if its title is already visible in the upper half, under the sheet header.
    const headerBottom = card.closest('dialog')?.querySelector('header')?.getBoundingClientRect().bottom ?? 0
    const top = card.getBoundingClientRect().top
    if (top >= headerBottom && top <= headerBottom + (window.innerHeight - headerBottom) / 2) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    card.scrollIntoView({ block: 'start', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [expanded, scrollOnExpand])

  if (!expanded) {
    const lastSet = entry.sets.at(-1)
    return (
      <button type="button" className={styles.collapsed} onClick={onExpand}>
        <span className={styles.name}>
          {finished && (
            <span className={styles.done} aria-hidden="true">
              ✓{' '}
            </span>
          )}
          {exercise.name}
        </span>
        <span className={`${styles.meta} figures`}>
          {lastSet
            ? `${entry.sets.length} ${entry.sets.length === 1 ? 'serie' : 'series'} · ${formatSet(lastSet, exercise.kind)}`
            : 'Sin series'}
        </span>
      </button>
    )
  }

  // Targets drive the first ghost when newer than last time (domain/workout.ts › activeTarget).
  const target = lastTime === undefined ? null : activeTarget(exercise, lastTime)
  const suggestion = suggestNextSet(lastTime?.sets ?? [], entry.sets, target)
  // Sets × reps are always a guide; the target weight only while it is the one being proposed.
  const targetText = formatTarget({
    sets: exercise.targetSets,
    reps: exercise.targetReps,
    weight: target ? exercise.targetWeight : null,
    unit: exercise.defaultUnit,
    kind: exercise.kind,
  })
  const setNumber = entry.sets.length + 1
  const ofTarget = exercise.targetSets !== null ? ` de ${exercise.targetSets}` : ''
  // The target sets are the plan: once logged, no more sets (sets can still be edited or deleted).
  const allSetsLogged = isSetLimitReached(entry.sets.length, exercise.targetSets)

  async function remove() {
    if (entry.sets.length > 0) {
      const confirmed = await confirm({
        title: `¿Quitar «${exercise.name}» del entrenamiento?`,
        message: `Se borrarán sus ${count(entry.sets.length, 'serie', 'series')} de hoy.`,
        confirmLabel: 'Quitar del entrenamiento',
        destructive: true,
      })
      if (!confirmed) return
    }
    await removeExerciseFromSession(sessionId, exercise.id)
  }

  const canFinish = canFinishExercise(entry)
  const menuActions: SheetAction[] = [
    finished
      ? { id: 'reopen', label: 'Reabrir ejercicio' }
      : { id: 'finish', label: 'Finalizar ejercicio', disabled: !canFinish },
    { id: 'remove', label: 'Quitar del entrenamiento', destructive: true },
  ]

  async function onMenu(actionId: string | null) {
    setMenuOpen(false)
    if (actionId === 'finish') onFinished(await finishExercise(sessionId, exercise.id))
    if (actionId === 'reopen') await reopenExercise(sessionId, exercise.id)
    if (actionId === 'remove') await remove()
  }

  return (
    <section ref={cardRef} className={styles.card} aria-labelledby={`ex-${exercise.id}`}>
      <div className={styles.head}>
        <h3 id={`ex-${exercise.id}`} className={styles.title}>
          {exercise.name}
        </h3>
        <MoreButton variant="inline" label={`Opciones de ${exercise.name}`} onClick={() => setMenuOpen(true)} />
      </div>
      {exercise.notes && <p className={styles.fixedNote}>{exercise.notes}</p>}
      {targetText && <p className={`${styles.target} figures`}>Objetivo · {targetText}</p>}
      {lastTime ? (
        <div className={styles.lastTime}>
          <p className={styles.lastTimeLabel}>Última vez · {formatShortDate(lastTime.startedAt)}</p>
          {/* The highlighted set is the one the ghost below repeats (not when a target drives it). */}
          <ol className={`${styles.lastTimeSets} figures`} aria-label="Series de la última vez">
            {lastTime.sets.map((set, index) => {
              const current = suggestion?.source === 'last-time' && index === entry.sets.length
              return (
                <li
                  key={set.id}
                  className={current ? styles.lastTimeCurrent : undefined}
                  aria-current={current ? 'step' : undefined}
                >
                  {formatSet(set, exercise.kind)}
                </li>
              )
            })}
          </ol>
        </div>
      ) : (
        <p className={styles.lastTimeLabel}>
          {lastTime === null ? 'Primera vez con este ejercicio.' : ' '}
        </p>
      )}

      {entry.sets.length > 0 && (
        <ol className={styles.sets} aria-label="Series de hoy">
          {entry.sets.map((set, index) => (
            <li key={set.id}>
              <button
                type="button"
                className={`${styles.set} figures`}
                onClick={() => setEditing({ set, index })}
                aria-label={`Serie ${index + 1}: ${formatSet(set, exercise.kind)}${set.rpe ? `, RPE ${formatNumber(set.rpe)}` : ''}. Editar`}
              >
                <span className={styles.setNumber}>{index + 1}</span>
                <span className={styles.setValue}>{formatSet(set, exercise.kind)}</span>
                <span className={styles.setRpe}>{set.rpe ? `RPE ${formatNumber(set.rpe)}` : ''}</span>
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {allSetsLogged ? (
        <p className={styles.allSets}>Completaste {count(entry.sets.length, 'serie', 'series')}.</p>
      ) : (
        <SetEntry
          key={entry.sets.length}
          title={`Serie ${setNumber}${ofTarget}`}
          kind={exercise.kind}
          defaultUnit={exercise.defaultUnit}
          suggestion={suggestion}
          onSubmit={async (input) => {
            const { session } = await addSet(sessionId, exercise.id, input)
            // The last target set finishes the exercise (data/sessions.ts › addSet): open the next one.
            if (!finished && session.exercises.find((e) => e.exerciseId === exercise.id)?.finishedAt) onFinished(session)
          }}
        />
      )}

      <TextField
        multiline
        rows={2}
        label="Nota de hoy (opcional)"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => notes.trim() !== entry.notes && void setSessionExerciseNotes(sessionId, exercise.id, notes)}
        placeholder="Ej.: molestia en el hombro"
        maxLength={500}
      />

      {editing && (
        <Sheet title={`Editar serie ${editing.index + 1}`} onClose={() => setEditing(null)}>
          <div className={styles.editBody}>
            <div className={styles.editCard}>
              <SetEntry
                title={exercise.name}
                kind={exercise.kind}
                defaultUnit={exercise.defaultUnit}
                suggestion={null}
                initial={toInput(editing.set, exercise.defaultUnit)}
                onSubmit={async (input) => {
                  await updateSet(sessionId, exercise.id, editing.set.id, input)
                  setEditing(null)
                }}
              />
            </div>
            <RowButton
              tone="destructive"
              onClick={async () => {
                await deleteSet(sessionId, exercise.id, editing.set.id)
                setEditing(null)
              }}
            >
              Eliminar serie
            </RowButton>
          </div>
        </Sheet>
      )}
      {menuOpen && (
        <ActionSheet
          variant="menu"
          title={exercise.name}
          message={!finished && !canFinish ? 'Anota una serie para poder finalizarlo.' : undefined}
          actions={menuActions}
          onSelect={(actionId) => void onMenu(actionId)}
        />
      )}
      {confirmSheet}
    </section>
  )
}
