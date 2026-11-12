import { useId, useState, type FormEvent } from 'react'
import {
  EXERCISE_NAME_MAX_LENGTH,
  EXERCISE_NOTES_MAX_LENGTH,
  type ExerciseErrors,
} from '../../domain/exercise.ts'
import type { Exercise, WeightUnit } from '../../domain/types.ts'
import { latestTargets, parseDecimal } from '../../domain/workout.ts'
import { ValidationError } from '../../data/errors.ts'
import {
  createExercise,
  deleteExercise,
  setExerciseArchived,
  updateExercise,
  useExerciseInUse,
} from '../../data/exercises.ts'
import { useLastPerformance } from '../../data/sessions.ts'
import { formatNumber, formatSet, formatShortDate } from '../lib/format.ts'
import { SegmentedControl } from './SegmentedControl.tsx'
import { useConfirm } from './useConfirm.tsx'
import { RowButton } from './RowButton.tsx'
import { Sheet } from './Sheet.tsx'
import { TextField } from './TextField.tsx'
import styles from './ExerciseSheet.module.css'

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
] as const satisfies readonly { value: WeightUnit; label: string }[]

const toText = (value: number | null) => (value === null ? '' : formatNumber(value))

type ExerciseSheetProps = {
  /** null = create a new exercise. */
  exercise: Exercise | null
  onClose: () => void
}

export function ExerciseSheet({ exercise, onClose }: ExerciseSheetProps) {
  const formId = useId()
  const targetsId = useId()
  const [name, setName] = useState(exercise?.name ?? '')
  const [defaultUnit, setDefaultUnit] = useState<WeightUnit>(exercise?.defaultUnit ?? 'kg')
  const [notes, setNotes] = useState(exercise?.notes ?? '')
  // undefined = untouched: the field shows the latest values and saving leaves the targets as they are.
  const [weightText, setWeightText] = useState<string>()
  const [setsText, setSetsText] = useState<string>()
  const [repsText, setRepsText] = useState<string>()
  const [errors, setErrors] = useState<ExerciseErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const inUse = useExerciseInUse(exercise?.id ?? null)
  const lastTime = useLastPerformance(exercise?.id ?? null)
  const [confirm, confirmSheet] = useConfirm()

  // The latest values: targets, or what was done last time if that is newer (domain/workout.ts).
  const latest = exercise && lastTime !== undefined ? latestTargets(exercise, lastTime) : null
  const shown = {
    weight: weightText ?? toText(latest?.weight ?? null),
    sets: setsText ?? toText(latest?.sets ?? null),
    reps: repsText ?? toText(latest?.reps ?? null),
  }
  const touched = weightText !== undefined || setsText !== undefined || repsText !== undefined
  // Once there is history the kind is fixed: a bodyweight exercise's weight is added load.
  const weightLabel = lastTime && exercise?.kind === 'bodyweight' ? 'Lastre (opcional)' : 'Peso (opcional)'

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
    const input = {
      name,
      defaultUnit,
      notes,
      // Only when edited: untouched targets are kept (see updateExercise). The kind is deduced there.
      ...(touched || !exercise
        ? {
            targetWeight: parseDecimal(shown.weight),
            targetSets: parseDecimal(shown.sets),
            targetReps: parseDecimal(shown.reps),
          }
        : {}),
    }
    void run(() => (exercise ? updateExercise(exercise.id, input) : createExercise(input)))
  }

  async function handleDelete() {
    if (!exercise) return
    const confirmed = await confirm({
      title: `¿Eliminar «${exercise.name}»?`,
      message: 'No se puede deshacer.',
      confirmLabel: 'Eliminar ejercicio',
      destructive: true,
    })
    if (confirmed) void run(() => deleteExercise(exercise.id))
  }

  async function handleArchive() {
    if (!exercise) return
    const archiving = exercise.archivedAt === null
    const confirmed = await confirm(
      archiving
        ? {
            title: `¿Archivar «${exercise.name}»?`,
            message: 'Pasará a Archivados y no aparecerá al entrenar. Su historial se conserva.',
            confirmLabel: 'Archivar ejercicio',
          }
        : {
            title: `¿Restaurar «${exercise.name}»?`,
            message: 'Volverá al catálogo y a las rutinas que lo incluyen.',
            confirmLabel: 'Restaurar ejercicio',
          },
    )
    if (confirmed) void run(() => setExerciseArchived(exercise.id, archiving))
  }

  const targetsError = errors.targetSets ?? errors.targetReps
  const loading = exercise !== null && lastTime === undefined

  return (
    <Sheet
      title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      onClose={onClose}
      action={
        <button type="submit" form={formId} className={styles.save} disabled={saving || loading}>
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

        {lastTime && exercise && (
          <div className={styles.lastTime}>
            <p className={styles.lastTimeLabel}>Última vez · {formatShortDate(lastTime.startedAt)}</p>
            <p className={`${styles.lastTimeSets} figures`}>
              {lastTime.sets.map((set) => formatSet(set, exercise.kind)).join(' · ')}
            </p>
          </div>
        )}

        {!loading && (
          <>
            <TextField
              label={weightLabel}
              value={shown.weight}
              onChange={(event) => setWeightText(event.target.value)}
              error={errors.targetWeight ?? errors.defaultUnit ?? errors.kind}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="Ej.: 40"
              hint={
                lastTime
                  ? undefined
                  : 'Déjalo vacío solo si es de peso corporal (dominadas, fondos…). Si no lo sabes, pon uno aproximado.'
              }
              trailing={
                <SegmentedControl label="Unidad" hideLabel value={defaultUnit} options={UNIT_OPTIONS} onChange={setDefaultUnit} />
              }
            />

            <fieldset className={styles.targets} aria-describedby={`${targetsId}-desc`}>
              <legend className={styles.targetsLegend}>Series × reps (opcional)</legend>
              <div className={styles.targetsRow}>
                <input
                  className={`${styles.targetInput} figures`}
                  aria-label="Series"
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="3"
                  value={shown.sets}
                  onChange={(event) => setSetsText(event.target.value)}
                  aria-invalid={errors.targetSets ? true : undefined}
                />
                <span className={styles.times} aria-hidden="true">
                  ×
                </span>
                <input
                  className={`${styles.targetInput} figures`}
                  aria-label="Reps"
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="10"
                  value={shown.reps}
                  onChange={(event) => setRepsText(event.target.value)}
                  aria-invalid={errors.targetReps ? true : undefined}
                />
              </div>
              <p id={`${targetsId}-desc`} className={targetsError ? styles.fieldError : styles.hint}>
                {targetsError ??
                  (lastTime
                    ? 'Muestra lo último que hiciste. Si cambias peso, series o reps, tu próximo entrenamiento los propone.'
                    : 'Tu objetivo: lo verás al entrenar y se propone en tu primera serie.')}
              </p>
            </fieldset>
          </>
        )}

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
          <RowButton
            disabled={saving}
            onClick={() => void handleArchive()}
          >
            {exercise.archivedAt === null ? 'Archivar ejercicio' : 'Restaurar ejercicio'}
          </RowButton>
          {inUse === false && (
            <RowButton tone="destructive" disabled={saving} onClick={() => void handleDelete()}>
              Eliminar ejercicio
            </RowButton>
          )}
          <p className={styles.manageHint}>
            {inUse
              ? 'Este ejercicio está en una rutina o en tu historial: archívalo para ocultarlo sin perder datos.'
              : 'Archivar lo oculta del catálogo sin borrarlo.'}
          </p>
        </div>
      )}
      {confirmSheet}
    </Sheet>
  )
}
