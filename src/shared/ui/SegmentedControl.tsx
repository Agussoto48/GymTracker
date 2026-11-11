import { useId } from 'react'
import styles from './SegmentedControl.module.css'

type Option<T extends string> = { value: T; label: string }

type SegmentedControlProps<T extends string> = {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  hint?: string
  error?: string
}

// Native radio buttons styled as segments: keyboard and screen reader support for free.
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  error,
}: SegmentedControlProps<T>) {
  const name = useId()
  const describedBy = `${name}-desc`
  return (
    <fieldset className={styles.field} aria-describedby={hint || error ? describedBy : undefined}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.segments}>
        {options.map((option) => (
          <label key={option.value} className={styles.segment}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {(error || hint) && (
        <p id={describedBy} className={error ? styles.error : styles.hint}>
          {error ?? hint}
        </p>
      )}
    </fieldset>
  )
}
