import type { ReactNode } from 'react'
import styles from './ScreenHeader.module.css'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  /** Action for the current screen, shown on the trailing side of the toolbar row, e.g. an AddButton. */
  action?: ReactNode
}

/**
 * iOS-style large-title header: a toolbar row on top (always present, so titles sit at the same
 * height on every tab) and the large title below it.
 */
export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.toolbar}>{action}</div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <h1 className={styles.title}>{title}</h1>
    </header>
  )
}
