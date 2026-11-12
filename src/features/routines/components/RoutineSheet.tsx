import { useId, useState, type FormEvent } from 'react'
import { ROUTINE_NAME_MAX_LENGTH, moveItem, type RoutineErrors } from '../../../domain/routine.ts'
import type { Exercise, Id, Routine } from '../../../domain/types.ts'
import { ValidationError } from '../../../data/errors.ts'
import {
  createRoutine,
  deleteRoutine,
  setRoutineArchived,
  updateRoutine,
  useRoutineUsed,
} from '../../../data/routines.ts'
import { ExercisePicker } from '../../../shared/ui/ExercisePicker.tsx'
import { useConfirm } from '../../../shared/ui/useConfirm.tsx'
import { RowButton } from '../../../shared/ui/RowButton.tsx'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import { TextField } from '../../../shared/ui/TextField.tsx'
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
  const used = useRoutineUsed(routine?.id ?? null)
  const [confirm, confirmSheet] = useConfirm()
  const byId = new Map(exercises.map((e) => [e.id, e]))

  async function run(action: () => Promise<unknown>) {
    setSaving(true)
    setFormError(null)
    try {
      await action()
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
    void run(() => (routine ? updateRoutine(routine.id, input) : createRoutine(input)))
  }

  async function handleDelete() {
    if (!routine) return
    const confirmed = await confirm({
      title: `¿Eliminar la rutina «${routine.name}»?`,
      message: 'Tus ejercicios no se borran.',
      confirmLabel: 'Eliminar rutina',
      destructive: true,
    })
    if (confirmed) void run(() => deleteRoutine(routine.id))
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
          placeholder="Ej.: Push, Pierna, Torso"
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
            onClick={() => void run(() => setRoutineArchived(routine.id, routine.archivedAt === null))}
          >
            {routine.archivedAt === null ? 'Archivar rutina' : 'Restaurar rutina'}
          </RowButton>
          {used === false && (
            <RowButton tone="destructive" disabled={saving} onClick={() => void handleDelete()}>
              Eliminar rutina
            </RowButton>
          )}
          {used && <p className={styles.hint}>Ya entrenaste con esta rutina: archívala para ocultarla sin perder el historial.</p>}
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
