import { useId, type ReactNode } from 'react'
import styles from './Section.module.css'

type SectionProps = {
  title: string
  /** Short fact about the section, on the trailing side of its header (e.g. "3 entrenamientos"). */
  detail?: string
  children: ReactNode
}

export function Section({ title, detail, children }: SectionProps) {
  const titleId = useId()
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        <span>{title}</span>
        {detail && (
          <>
            <span className="visually-hidden">, </span>
            <span className={styles.detail}>{detail}</span>
          </>
        )}
      </h2>
      {children}
    </section>
  )
}
