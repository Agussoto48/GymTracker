import type { ReactNode } from 'react'
import './ui.css'

type EmptyStateProps = {
  title: string
  message: string
  /** Botón que invita a la siguiente acción. */
  action?: ReactNode
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__message">{message}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </section>
  )
}
