import type { ReactNode } from 'react'
import styles from './ScreenHeader.module.css'

type ScreenHeaderProps = {
  title: string
  /** Control on the leading side of the toolbar row, e.g. a MoreButton. */
  leading?: ReactNode
  /** Action for the current screen, shown on the trailing side of the toolbar row, e.g. an AddButton. */
  action?: ReactNode
  /** Inline search field below the title, for the list on this screen. */
  search?: ReactNode
}

/**
 * iOS-style large-title header: a toolbar row on top (always present, so titles sit at the same
 * height on every tab), the large title below it and, optionally, a search field under the title.
 */
export function ScreenHeader({ title, leading, action, search }: ScreenHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.toolbar}>
        <div className={styles.leading}>{leading}</div>
        <div className={styles.trailing}>{action}</div>
      </div>
      <h1 className={styles.title}>{title}</h1>
      {search && <div className={styles.search}>{search}</div>}
    </header>
  )
}
