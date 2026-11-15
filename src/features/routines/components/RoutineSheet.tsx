import { useId, useState, type FormEvent } from 'react'
import { ROUTINE_NAME_MAX_LENGTH, moveItem, type RoutineErrors } from '../../../domain/routine.ts'
import type { Exercise, Id, Routine } from '../../../domain/types.ts'
import { ValidationError } from '../../../data/errors.ts'
import {
  createRoutine,
  deleteRoutine,
  setRoutineArchived,
  updateRoutine,
  useRoutineWorkoutCount,
} from '../../../data/routines.ts'
import { ExercisePicker } from '../../../shared/ui/ExercisePicker.tsx'
import { useConfirm } from '../../../shared/ui/useConfirm.tsx'
import { RowButton } from '../../../shared/ui/RowButton.tsx'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import { TextField } from '../../../shared/ui/TextField.tsx'
import { useToast } from '../../../shared/ui/useToast.ts'
import styles from './RoutineSheet.module.css'

type RoutineSheetProps = {
  /** null = create a new routine. */
  routine: Routine | null
  exercises: readonly Exercise[]
  onClose: () => void
}

export function RoutineSheet({ routine, exercises, onClose }: RoutineSheetProps) {
  const formId = useId()
  const [name, setName] = useState(routine?.name ?? '')
  const [exerciseIds, setExerciseIds] = useState<Id[]>(routine?.exerciseIds ?? [])
  const [errors, setErrors] = useState<RoutineErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const workoutCount = useRoutineWorkoutCount(routine?.id ?? null)
  const [confirm, confirmSheet] = useConfirm()
  const toast = useToast()
  const byId = new Map(exercises.map((e) => [e.id, e]))

  /** Runs the change; on success confirms it with a toast (its text from the result) and closes. */
  async function run<T>(action: () => Promise<T>, done: (result: T) => string) {
    setSaving(true)
    setFormError(null)
    try {
      toast(done(await action()))
      onClose()
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.errors)
      else setFormError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input = { name, exerciseIds }
    if (routine) void run(() => updateRoutine(routine.id, input), (saved) => `Rutina «${saved.name}» guardada`)
    else void run(() => createRoutine(input), (created) => `Rutina «${created.name}» creada`)
  }

  async function handleDelete() {
    if (!routine) return
    // Its workouts stay in history under its name (data/routines.ts › deleteRoutine).
    const kept =
      workoutCount === 1
        ? ' Tu entrenamiento con ella sigue en el historial y tus ejercicios no se borran.'
        : workoutCount
          ? ` Tus ${workoutCount} entrenamientos con ella siguen en el historial y tus ejercicios no se borran.`
          : ' Tus ejercicios no se borran.'
    const confirmed = await confirm({
      title: `¿Eliminar la rutina «${routine.name}»?`,
      message: `La rutina no se puede recuperar.${kept}`,
      confirmLabel: 'Eliminar rutina',
      destructive: true,
    })
    if (confirmed) void run(() => deleteRoutine(routine.id), () => `Rutina «${routine.name}» eliminada`)
  }

  async function handleArchive() {
    if (!routine) return
    const archiving = routine.archivedAt === null
    const confirmed = await confirm(
      archiving
        ? {
            title: `¿Archivar la rutina «${routine.name}»?`,
            message: 'Pasará a Archivadas y no aparecerá en Entrenar. Su historial se conserva.',
            confirmLabel: 'Archivar rutina',
          }
        : {
            title: `¿Restaurar la rutina «${routine.name}»?`,
            message: 'Volverá a aparecer en Entrenar.',
            confirmLabel: 'Restaurar rutina',
          },
    )
    if (confirmed) {
      void run(
        () => setRoutineArchived(routine.id, archiving),
        () => `Rutina «${routine.name}» ${archiving ? 'archivada' : 'restaurada'}`,
      )
    }
  }

  const move = (from: number, to: number) => setExerciseIds((ids) => moveItem(ids, from, to))

  return (
    <Sheet
      title={routine ? 'Editar rutina' : 'Nueva rutina'}
      onClose={onClose}
      action={
        <button type="submit" form={formId} className={styles.save} disabled={saving}>
          Guardar
        </button>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          maxLength={ROUTINE_NAME_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          placeholder="Ej.: Push"
        />

        <fieldset className={styles.exercises} aria-describedby={errors.exerciseIds ? `${formId}-ex-error` : undefined}>
          <legend className={styles.legend}>Ejercicios, en orden</legend>
          {exerciseIds.length > 0 && (
            <ol className={styles.list}>
              {exerciseIds.map((id, index) => {
                const exercise = byId.get(id)
                const label = exercise?.name ?? 'Ejercicio eliminado'
                return (
                  <li key={id} className={styles.item}>
                    <span className={styles.position}>{index + 1}</span>
                    <span className={styles.name}>
                      {label}
                      {exercise?.archivedAt && <span className={styles.archived}> (archivado: se omite)</span>}
                    </span>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Subir ${label}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => move(index, index + 1)}
                      disabled={index === exerciseIds.length - 1}
                      aria-label={`Bajar ${label}`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.remove}`}
                      onClick={() => setExerciseIds((ids) => ids.filter((x) => x !== id))}
                      aria-label={`Quitar ${label}`}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
          <button type="button" className={styles.add} onClick={() => setPicking(true)}>
            + Agregar ejercicios
          </button>
          {errors.exerciseIds && (
            <p id={`${formId}-ex-error`} className={styles.error}>
              {errors.exerciseIds}
            </p>
          )}
        </fieldset>

        {formError && (
          <p role="alert" className={styles.error}>
            {formError}
          </p>
        )}
      </form>

      {routine && (
        <div className={styles.manage}>
          <RowButton
            disabled={saving}
            onClick={() => void handleArchive()}
          >
            {routine.archivedAt === null ? 'Archivar rutina' : 'Restaurar rutina'}
          </RowButton>
          <RowButton
            tone="destructive"
            disabled={saving || workoutCount === undefined}
            onClick={() => void handleDelete()}
          >
            Eliminar rutina
          </RowButton>
          <p className={styles.hint}>
            {routine.archivedAt === null ? 'Archivar la oculta de Entrenar y se puede restaurar.' : 'Restaurar la devuelve a Entrenar.'}
            {workoutCount ? ' Si la eliminas, sus entrenamientos siguen en el historial.' : ''}
          </p>
        </div>
      )}

      {picking && (
        <ExercisePicker
          exercises={exercises}
          excludeIds={exerciseIds}
          closeLabel="Listo"
          onClose={() => setPicking(false)}
          onPick={(exercise) => setExerciseIds((ids) => [...ids, exercise.id])}
        />
      )}
      {confirmSheet}
    </Sheet>
  )
}
