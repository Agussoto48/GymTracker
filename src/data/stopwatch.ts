import { IDLE_STOPWATCH, parseStopwatch, stopwatchStatus, type Stopwatch } from '../domain/stopwatch.ts'
import type { Id } from '../domain/types.ts'

// The stopwatch is a helper between sets, not workout data: localStorage is enough and it never
// goes into the history or the backup. It belongs to one workout, so a new one starts at 00:00.
const STOPWATCH_KEY = 'gymtracker.stopwatch'

export function loadStopwatch(sessionId: Id): Stopwatch {
  try {
    const raw = localStorage.getItem(STOPWATCH_KEY)
    if (raw === null) return IDLE_STOPWATCH
    const stored: unknown = JSON.parse(raw)
    const ownSession = typeof stored === 'object' && stored !== null && (stored as { sessionId?: unknown }).sessionId === sessionId
    return (ownSession && parseStopwatch(stored)) || IDLE_STOPWATCH
  } catch {
    return IDLE_STOPWATCH
  }
}

export function saveStopwatch(sessionId: Id, stopwatch: Stopwatch): void {
  try {
    if (stopwatchStatus(stopwatch) === 'idle') localStorage.removeItem(STOPWATCH_KEY)
    else localStorage.setItem(STOPWATCH_KEY, JSON.stringify({ sessionId, ...stopwatch }))
  } catch {
    // Storage unavailable: the stopwatch still works until the app reloads.
  }
}
