import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import styles from './TextField.module.css'

type CommonProps = {
  label: string
  hint?: string
  error?: string
}

type TextFieldProps = CommonProps &
  (
    | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
    | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
  )

export function TextField({ label, hint, error, multiline, ...props }: TextFieldProps) {
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
        <input type="text" {...a11y} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {(error || hint) && (
        <p id={descId} className={error ? styles.error : styles.hint}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
