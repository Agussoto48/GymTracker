import type { Id, IsoDateTime, WorkoutSession, WorkoutSet } from './types.ts'

export type SessionSummary = {
  exerciseCount: number
  setCount: number
  /** Whole minutes from start to finish; null while the session is in progress. */
  durationMinutes: number | null
}

export function summarizeSession(session: WorkoutSession): SessionSummary {
  const setCount = session.exercises.reduce((total, entry) => total + entry.sets.length, 0)
  const durationMinutes =
    session.finishedAt === null
      ? null
      : Math.max(0, Math.floor((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 60000))
  return { exerciseCount: session.exercises.length, setCount, durationMinutes }
}

export type MonthGroup = {
  /** "YYYY-MM" in the device's time zone. */
  month: string
  sessions: WorkoutSession[]
}

function monthKey(iso: IsoDateTime): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Groups sessions by the month they started in, keeping the given order (newest first expected). */
export function groupByMonth(sessions: readonly WorkoutSession[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const session of sessions) {
    const month = monthKey(session.startedAt)
    const last = groups.at(-1)
    if (last?.month === month) last.sessions.push(session)
    else groups.push({ month, sessions: [session] })
  }
  return groups
}

export type ExerciseHistoryEntry = {
  sessionId: Id
  routineId: Id | null
  startedAt: IsoDateTime
  notes: string
  sets: WorkoutSet[]
}

/**
 * Every finished session where the exercise has sets, newest first.
 * The routine does not matter: history is per exercise (same rule as "last time").
 */
export function exerciseHistory(sessions: readonly WorkoutSession[], exerciseId: Id): ExerciseHistoryEntry[] {
  const entries: ExerciseHistoryEntry[] = []
  for (const session of sessions) {
    if (session.finishedAt === null) continue
    const entry = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!entry || entry.sets.length === 0) continue
    entries.push({
      sessionId: session.id,
      routineId: session.routineId,
      startedAt: session.startedAt,
      notes: entry.notes,
      sets: entry.sets,
    })
  }
  return entries.sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0))
}
