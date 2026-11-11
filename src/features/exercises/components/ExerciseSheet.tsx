import { useId, useState, type FormEvent } from 'react'
import {
  EXERCISE_NAME_MAX_LENGTH,
  EXERCISE_NOTES_MAX_LENGTH,
  type ExerciseErrors,
} from '../../../domain/exercise.ts'
import type { Exercise, ExerciseKind, WeightUnit } from '../../../domain/types.ts'
import { ValidationError } from '../../../data/errors.ts'
import {
  createExercise,
  deleteExercise,
  setExerciseArchived,
  updateExercise,
  useExerciseInUse,
} from '../../../data/exercises.ts'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl.tsx'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import { TextField } from '../../../shared/ui/TextField.tsx'
import styles from './ExerciseSheet.module.css'

const KIND_OPTIONS = [
  { value: 'weighted', label: 'Con peso' },
  { value: 'bodyweight', label: 'Peso corporal' },
] as const satisfies readonly { value: ExerciseKind; label: string }[]

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
] as const satisfies readonly { value: WeightUnit; label: string }[]

type ExerciseSheetProps = {
  /** null = create a new exercise. */
  exercise: Exercise | null
  onClose: () => void
}

export function ExerciseSheet({ exercise, onClose }: ExerciseSheetProps) {
  const formId = useId()
  const [name, setName] = useState(exercise?.name ?? '')
  const [kind, setKind] = useState<ExerciseKind>(exercise?.kind ?? 'weighted')
  const [defaultUnit, setDefaultUnit] = useState<WeightUnit>(exercise?.defaultUnit ?? 'kg')
  const [notes, setNotes] = useState(exercise?.notes ?? '')
  const [errors, setErrors] = useState<ExerciseErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const inUse = useExerciseInUse(exercise?.id ?? null)

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
    const input = { name, kind, defaultUnit, notes }
    void run(() => (exercise ? updateExercise(exercise.id, input) : createExercise(input)))
  }

  function handleDelete() {
    if (!exercise) return
    if (!window.confirm(`¿Eliminar «${exercise.name}»? Esta acción no se puede deshacer.`)) return
    void run(() => deleteExercise(exercise.id))
  }

  return (
    <Sheet
      title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
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
          maxLength={EXERCISE_NAME_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          placeholder="Ej.: Press banca"
        />
        <SegmentedControl
          label="Tipo"
          value={kind}
          options={KIND_OPTIONS}
          onChange={setKind}
          error={errors.kind}
          hint={
            kind === 'bodyweight'
              ? 'En cada serie podrás anotar lastre (opcional). Verás siempre el más reciente.'
              : 'El peso se anota en cada serie al entrenar. Verás siempre el más reciente, en todas tus rutinas.'
          }
        />
        <SegmentedControl
          label="Unidad por defecto"
          value={defaultUnit}
          options={UNIT_OPTIONS}
          onChange={setDefaultUnit}
          error={errors.defaultUnit}
          hint="Podrás cambiarla en cada serie."
        />
        <TextField
          multiline
          label="Nota fija (opcional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          error={errors.notes}
          maxLength={EXERCISE_NOTES_MAX_LENGTH}
          placeholder="Ej.: asiento en 4, agarre cerrado"
          hint={errors.notes ? undefined : 'Se mostrará cada vez que hagas este ejercicio.'}
        />
        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}
      </form>

      {exercise && (
        <div className={styles.manage}>
          <button
            type="button"
            className={styles.manageButton}
            disabled={saving}
            onClick={() => void run(() => setExerciseArchived(exercise.id, exercise.archivedAt === null))}
          >
            {exercise.archivedAt === null ? 'Archivar ejercicio' : 'Restaurar ejercicio'}
          </button>
          {inUse === false && (
            <button
              type="button"
              className={`${styles.manageButton} ${styles.danger}`}
              disabled={saving}
              onClick={handleDelete}
            >
              Eliminar ejercicio
            </button>
          )}
          <p className={styles.manageHint}>
            {inUse
              ? 'Este ejercicio está en una rutina o en tu historial: archívalo para ocultarlo sin perder datos.'
              : 'Archivar lo oculta del catálogo sin borrarlo.'}
          </p>
        </div>
      )}
    </Sheet>
  )
}
