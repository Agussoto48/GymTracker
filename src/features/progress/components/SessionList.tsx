import { summarizeSession } from '../../../domain/history.ts'
import type { Id, WorkoutSession } from '../../../domain/types.ts'
import { formatDayTile, formatLongDate } from '../../../shared/lib/format.ts'
import { sessionMeta, sessionName } from './sessionText.ts'
import styles from './SessionList.module.css'

type SessionListProps = {
  sessions: readonly WorkoutSession[]
  routineNames: ReadonlyMap<Id, string>
  onSelect: (sessionId: Id) => void
}

/** One row per workout: a calendar-like date tile, its name and what was done. */
export function SessionList({ sessions, routineNames, onSelect }: SessionListProps) {
  return (
    <ul className={styles.list}>
      {sessions.map((session) => {
        const summary = summarizeSession(session)
        const tile = formatDayTile(session.startedAt)
        return (
          <li key={session.id}>
            <button type="button" className={styles.row} onClick={() => onSelect(session.id)}>
              {/* The tile is for the eye; screen readers get the full date below. */}
              <span className={styles.date} aria-hidden="true">
                <span className={styles.weekday}>{tile.weekday}</span>
                <span className={`${styles.day} figures`}>{tile.day}</span>
              </span>
              <span className="visually-hidden">{formatLongDate(session.startedAt)}: </span>
              <span className={styles.text}>
                <span className={styles.name}>{sessionName(session, routineNames)}</span>
                <span className={`${styles.meta} figures`}>{sessionMeta(summary)}</span>
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
