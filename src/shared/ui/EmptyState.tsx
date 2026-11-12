import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

type EmptyStateProps = {
  /** Omitted in the plain variant, where a single line of secondary text is enough. */
  title?: string
  message: string
  /** Button that invites the next action. */
  action?: ReactNode
  /**
   * `card` (default) sits on a surface with a title; `plain` is secondary text on the background,
   * for screens whose toolbar already offers the next action (e.g. the "+" button).
   */
  variant?: 'card' | 'plain'
}

export function EmptyState({ title, message, action, variant = 'card' }: EmptyStateProps) {
  return (
    <section className={styles[variant]}>
      {title && <h2 className={styles.title}>{title}</h2>}
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </section>
  )
}
