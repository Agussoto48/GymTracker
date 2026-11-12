import type { ButtonHTMLAttributes } from 'react'
import styles from './RowButton.module.css'

type RowButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** destructive: red label for actions that delete data. */
  tone?: 'default' | 'destructive'
}

/** Full-width row action, like the grouped rows at the bottom of iOS Settings (Archivar, Eliminar…). */
export function RowButton({ tone = 'default', className, type = 'button', ...props }: RowButtonProps) {
  const classes = [styles.row, tone === 'destructive' && styles.destructive, className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...props} />
}
