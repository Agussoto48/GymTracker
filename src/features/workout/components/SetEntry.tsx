import { useId, useState } from 'react'
import type { ExerciseKind, WeightUnit } from '../../../domain/types.ts'
import {
  RPE_OPTIONS,
  WEIGHT_STEP,
  parseDecimal,
  stepWeight,
  type SetErrors,
  type SetInput,
  type SetSuggestion,
} from '../../../domain/workout.ts'
import { ValidationError } from '../../../data/errors.ts'
import { formatNumber, formatSet } from '../../../shared/lib/format.ts'
import styles from './SetEntry.module.css'

type SetEntryProps = {
  title: string
  kind: ExerciseKind
  defaultUnit: WeightUnit
  /** Ghost values shown in grey; used when a field is left empty. */
  suggestion: SetSuggestion | null
  /** Prefilled values when editing an existing set. */
  initial?: SetInput
  onSubmit: (input: SetInput) => Promise<void>
}

const toText = (value: number | null | undefined) => (value === null || value === undefined ? '' : formatNumber(value))

export function SetEntry({ title, kind, defaultUnit, suggestion, initial, onSubmit }: SetEntryProps) {
  const id = useId()
  const [weightText, setWeightText] = useState(toText(initial?.weight))
  const [repsText, setRepsText] = useState(toText(initial?.reps))
  const [unit, setUnit] = useState<WeightUnit>(initial?.unit ?? suggestion?.weight?.unit ?? defaultUnit)
  const [rpe, setRpe] = useState<number | null>(initial?.rpe ?? null)
  const [errors, setErrors] = useState<SetErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const typedWeight = parseDecimal(weightText)
  const typedReps = parseDecimal(repsText)
  // Empty fields fall back to the ghost; that is what makes "repeat" a single tap.
  const ghostWeight = suggestion?.weight && suggestion.weight.unit === unit ? suggestion.weight.value : null
  const weight = typedWeight ?? ghostWeight
  const reps = typedReps ?? suggestion?.reps ?? null
  const input: SetInput = { weight, unit, reps, rpe }
  const invalidNumber = Number.isNaN(typedWeight) || Number.isNaN(typedReps)
  const complete = !invalidNumber && reps !== null && (kind === 'bodyweight' || weight !== null)
  const isRepeat = weightText === '' && repsText === '' && suggestion !== null && !initial
  const summary = complete ? formatSet({ weight: weight === null ? null : { value: weight, unit }, reps }, kind) : ''

  function nudgeWeight(direction: 1 | -1) {
    setWeightText(formatNumber(stepWeight(weight ?? 0, unit, direction)))
  }

  function nudgeReps(direction: 1 | -1) {
    setRepsText(String(Math.max(0, Math.round((reps ?? 0) + direction))))
  }

  async function submit() {
    setSaving(true)
    setErrors({})
    setFailed(false)
    try {
      await onSubmit(input)
      if (!initial) {
        setWeightText('')
        setRepsText('')
        setRpe(null)
      }
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.errors)
      else setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const weightLabel = kind === 'bodyweight' ? `Lastre (${unit})` : `Peso (${unit})`

  return (
    <div className={styles.entry}>
      <p className={styles.title}>{title}</p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <div className={styles.fieldHead}>
            <label htmlFor={`${id}-weight`}>{weightLabel}</label>
            <button
              type="button"
              className={styles.unit}
              onClick={() => setUnit(unit === 'kg' ? 'lb' : 'kg')}
              aria-label={`Unidad: ${unit}. Cambiar a ${unit === 'kg' ? 'lb' : 'kg'}`}
            >
              {unit}
            </button>
          </div>
          <input
            id={`${id}-weight`}
            className={`${styles.number} figures`}
            inputMode="decimal"
            autoComplete="off"
            value={weightText}
            placeholder={ghostWeight === null ? (kind === 'bodyweight' ? '0' : '') : formatNumber(ghostWeight)}
            onChange={(event) => setWeightText(event.target.value)}
            aria-invalid={errors.weight ? true : undefined}
          />
          <div className={styles.steppers}>
            <button type="button" onClick={() => nudgeWeight(-1)} aria-label={`Restar ${formatNumber(WEIGHT_STEP[unit])} ${unit}`}>
              −
            </button>
            <button type="button" onClick={() => nudgeWeight(1)} aria-label={`Sumar ${formatNumber(WEIGHT_STEP[unit])} ${unit}`}>
              +
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldHead}>
            <label htmlFor={`${id}-reps`}>Reps</label>
          </div>
          <input
            id={`${id}-reps`}
            className={`${styles.number} figures`}
            inputMode="numeric"
            autoComplete="off"
            value={repsText}
            placeholder={suggestion ? String(suggestion.reps) : ''}
            onChange={(event) => setRepsText(event.target.value)}
            aria-invalid={errors.reps ? true : undefined}
          />
          <div className={styles.steppers}>
            <button type="button" onClick={() => nudgeReps(-1)} aria-label="Restar una repetición">
              −
            </button>
            <button type="button" onClick={() => nudgeReps(1)} aria-label="Sumar una repetición">
              +
            </button>
          </div>
        </div>
      </div>

      <div className={styles.rpe} role="group" aria-label="RPE (opcional)">
        <span className={styles.rpeLabel} aria-hidden="true">
          RPE
        </span>
        <div className={styles.rpeOptions}>
          {RPE_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={styles.chip}
              aria-pressed={rpe === value}
              onClick={() => setRpe(rpe === value ? null : value)}
            >
              {formatNumber(value)}
            </button>
          ))}
        </div>
      </div>

      {(errors.weight || errors.reps || errors.rpe || failed) && (
        <p role="alert" className={styles.error}>
          {errors.weight ?? errors.reps ?? errors.rpe ?? 'No se pudo guardar. Intenta de nuevo.'}
        </p>
      )}

      <button type="button" className={styles.submit} disabled={!complete || saving} onClick={() => void submit()}>
        {invalidNumber
          ? 'Número inválido'
          : !complete
            ? 'Anota peso y reps'
            : `${isRepeat ? 'Repetir' : 'Guardar'} ${summary}`}
      </button>
    </div>
  )
}
