import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

type EmptyStateProps = {
  title: string
  message: string
  /** Button that invites the next action. */
  action?: ReactNode
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <section className={styles.emptyState}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </section>
  )
}
