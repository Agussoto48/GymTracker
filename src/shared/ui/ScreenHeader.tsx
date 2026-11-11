import type { ReactNode } from 'react'
import styles from './ScreenHeader.module.css'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  /** Action for the current screen, e.g. "Nueva". */
  action?: ReactNode
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  )
}
