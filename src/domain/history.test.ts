import { describe, expect, test } from 'vitest'
import { exerciseHistory, groupByMonth, summarizeSession } from './history.ts'
import type { SessionExercise, WorkoutSession, WorkoutSet } from './types.ts'
import { withDerivedExerciseIds } from './workout.ts'

const set = (value: number, reps: number): WorkoutSet => ({
  id: `${value}-${reps}`,
  weight: { value, unit: 'kg' },
  reps,
  rpe: null,
  completedAt: '2026-11-10T18:00:00.000Z',
})

const entry = (exerciseId: string, sets: WorkoutSet[], notes = ''): SessionExercise => ({ exerciseId, notes, sets })

function session(
  id: string,
  startedAt: string,
  finishedAt: string | null,
  exercises: SessionExercise[],
  routineId: string | null = null,
): WorkoutSession {
  return withDerivedExerciseIds({ id, routineId, startedAt, finishedAt, exercises, exerciseIds: [] })
}

describe('summarizeSession', () => {
  test('counts exercises, sets and whole minutes', () => {
    const summary = summarizeSession(
      session('s1', '2026-11-10T18:00:00.000Z', '2026-11-10T18:52:59.000Z', [
        entry('pec', [set(60, 10), set(60, 9)]),
        entry('row', [set(50, 12)]),
      ]),
    )
    expect(summary).toEqual({ exerciseCount: 2, setCount: 3, durationMinutes: 52 })
  })

  test('has no duration while in progress', () => {
    expect(summarizeSession(session('s1', '2026-11-10T18:00:00.000Z', null, [])).durationMinutes).toBeNull()
  })

  test('never reports a negative duration (clock changed mid-workout)', () => {
    const summary = summarizeSession(session('s1', '2026-11-10T18:00:00.000Z', '2026-11-10T17:00:00.000Z', []))
    expect(summary.durationMinutes).toBe(0)
  })
})

describe('groupByMonth', () => {
  test('groups consecutive sessions by start month, keeping order', () => {
    // Mid-month times so the local time zone cannot move them to another month.
    const nov2 = session('a', '2026-11-15T12:00:00.000Z', '2026-11-15T13:00:00.000Z', [])
    const nov1 = session('b', '2026-11-10T12:00:00.000Z', '2026-11-10T13:00:00.000Z', [])
    const oct = session('c', '2026-10-14T12:00:00.000Z', '2026-10-14T13:00:00.000Z', [])
    const groups = groupByMonth([nov2, nov1, oct])
    expect(groups.map((g) => g.month)).toEqual(['2026-11', '2026-10'])
    expect(groups[0].sessions.map((s) => s.id)).toEqual(['a', 'b'])
    expect(groups[1].sessions.map((s) => s.id)).toEqual(['c'])
  })

  test('returns no groups for no sessions', () => {
    expect(groupByMonth([])).toEqual([])
  })
})

describe('exerciseHistory', () => {
  test('lists finished sessions with sets for the exercise, newest first, from any routine', () => {
    const older = session('old', '2026-11-01T18:00:00.000Z', '2026-11-01T19:00:00.000Z', [entry('pec', [set(55, 10)])], 'push-a')
    const newer = session(
      'new',
      '2026-11-08T18:00:00.000Z',
      '2026-11-08T19:00:00.000Z',
      [entry('pec', [set(60, 10)], 'hombro')],
      'push-b',
    )
    const history = exerciseHistory([older, newer], 'pec')
    expect(history.map((h) => h.sessionId)).toEqual(['new', 'old'])
    expect(history[0]).toMatchObject({ routineId: 'push-b', notes: 'hombro', sets: [set(60, 10)] })
  })

  test('skips the session in progress, sessions without the exercise and entries without sets', () => {
    const active = session('active', '2026-11-09T18:00:00.000Z', null, [entry('pec', [set(70, 5)])])
    const other = session('other', '2026-11-07T18:00:00.000Z', '2026-11-07T19:00:00.000Z', [entry('row', [set(50, 10)])])
    const empty = session('empty', '2026-11-06T18:00:00.000Z', '2026-11-06T19:00:00.000Z', [entry('pec', [])])
    expect(exerciseHistory([active, other, empty], 'pec')).toEqual([])
  })
})
