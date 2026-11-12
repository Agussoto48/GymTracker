import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import styles from './TextField.module.css'

type CommonProps = {
  label: string
  hint?: string
  error?: string
  /** Control shown beside a single-line input, e.g. a kg/lb selector for a weight. */
  trailing?: ReactNode
}

type TextFieldProps = CommonProps &
  (
    | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
    | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
  )

export function TextField({ label, hint, error, trailing, multiline, ...props }: TextFieldProps) {
  const id = useId()
  const descId = `${id}-desc`
  const a11y = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? descId : undefined,
    className: styles.input,
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea rows={3} {...a11y} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <div className={trailing ? styles.row : undefined}>
          <input type="text" {...a11y} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
          {trailing}
        </div>
      )}
      {(error || hint) && (
        <p id={descId} className={error ? styles.error : styles.hint}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
