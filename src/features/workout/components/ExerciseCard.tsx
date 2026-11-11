import { useState } from 'react'
import type { Exercise, SessionExercise, WorkoutSet } from '../../../domain/types.ts'
import { suggestNextSet, type SetInput } from '../../../domain/workout.ts'
import {
  addSet,
  deleteSet,
  removeExerciseFromSession,
  setSessionExerciseNotes,
  updateSet,
  useLastPerformance,
} from '../../../data/sessions.ts'
import { formatNumber, formatSet, formatShortDate } from '../../../shared/lib/format.ts'
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
}

const toInput = (set: WorkoutSet, fallbackUnit: Exercise['defaultUnit']): SetInput => ({
  weight: set.weight?.value ?? null,
  unit: set.weight?.unit ?? fallbackUnit,
  reps: set.reps,
  rpe: set.rpe,
})

export function ExerciseCard({ sessionId, entry, exercise, expanded, onExpand }: ExerciseCardProps) {
  const lastTime = useLastPerformance(exercise.id, sessionId)
  const [editing, setEditing] = useState<{ set: WorkoutSet; index: number } | null>(null)
  const [notes, setNotes] = useState(entry.notes)

  if (!expanded) {
    const lastSet = entry.sets.at(-1)
    return (
      <button type="button" className={styles.collapsed} onClick={onExpand}>
        <span className={styles.name}>{exercise.name}</span>
        <span className={`${styles.meta} figures`}>
          {lastSet
            ? `${entry.sets.length} ${entry.sets.length === 1 ? 'serie' : 'series'} · ${formatSet(lastSet, exercise.kind)}`
            : 'Sin series'}
        </span>
      </button>
    )
  }

  const suggestion = suggestNextSet(lastTime?.sets ?? [], entry.sets)

  function remove() {
    if (entry.sets.length > 0 && !window.confirm(`¿Quitar «${exercise.name}» y sus ${entry.sets.length} series?`)) return
    void removeExerciseFromSession(sessionId, exercise.id)
  }

  return (
    <section className={styles.card} aria-labelledby={`ex-${exercise.id}`}>
      <h3 id={`ex-${exercise.id}`} className={styles.title}>
        {exercise.name}
      </h3>
      {exercise.notes && <p className={styles.fixedNote}>{exercise.notes}</p>}
      <p className={`${styles.lastTime} figures`}>
        {lastTime === undefined
          ? ' '
          : lastTime
            ? `Última vez · ${formatShortDate(lastTime.startedAt)}: ${lastTime.sets.map((s) => formatSet(s, exercise.kind)).join(' · ')}`
            : 'Primera vez con este ejercicio.'}
      </p>

      {entry.sets.length > 0 && (
        <ol className={styles.sets}>
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

      <SetEntry
        key={entry.sets.length}
        title={`Serie ${entry.sets.length + 1}`}
        kind={exercise.kind}
        defaultUnit={exercise.defaultUnit}
        suggestion={suggestion}
        onSubmit={async (input) => {
          await addSet(sessionId, exercise.id, input)
        }}
      />

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

      <button type="button" className={styles.remove} onClick={remove}>
        Quitar ejercicio
      </button>

      {editing && (
        <Sheet title={`Editar serie ${editing.index + 1}`} onClose={() => setEditing(null)}>
          <div className={styles.editBody}>
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
            <button
              type="button"
              className={styles.deleteSet}
              onClick={async () => {
                await deleteSet(sessionId, exercise.id, editing.set.id)
                setEditing(null)
              }}
            >
              Eliminar serie
            </button>
          </div>
        </Sheet>
      )}
    </section>
  )
}
