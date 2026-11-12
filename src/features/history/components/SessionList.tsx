import { summarizeSession } from '../../../domain/history.ts'
import type { Id, WorkoutSession } from '../../../domain/types.ts'
import { count, formatDuration, formatShortDate } from '../../../shared/lib/format.ts'
import { sessionName } from './sessionName.ts'
import styles from './SessionList.module.css'

type SessionListProps = {
  sessions: readonly WorkoutSession[]
  routineNames: ReadonlyMap<Id, string>
  onSelect: (sessionId: Id) => void
}

export function SessionList({ sessions, routineNames, onSelect }: SessionListProps) {
  return (
    <ul className={styles.list}>
      {sessions.map((session) => {
        const summary = summarizeSession(session)
        return (
          <li key={session.id}>
            <button type="button" className={styles.row} onClick={() => onSelect(session.id)}>
              <span className={styles.text}>
                <span className={styles.name}>{sessionName(session.routineId, routineNames)}</span>
                <span className={`${styles.meta} figures`}>
                  {formatShortDate(session.startedAt)}
                  {summary.durationMinutes !== null && ` · ${formatDuration(summary.durationMinutes)}`}
                  {` · ${count(summary.setCount, 'serie', 'series')}`}
                </span>
              </span>
              <svg className={styles.chevron} width="8" height="14" viewBox="0 0 8 14" aria-hidden="true">
                <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
