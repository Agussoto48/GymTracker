// Stopwatch between sets, like the Clock app: starts at 00:00, runs until stopped, then resumes or resets.
// Time comes from timestamps, not from counting ticks, so it stays right while Safari is suspended.

/** `startedAt` (ms since epoch) is set only while running; `accumulatedMs` holds earlier runs. */
export type Stopwatch = { startedAt: number | null; accumulatedMs: number }

export type StopwatchStatus = 'idle' | 'running' | 'stopped'

export const IDLE_STOPWATCH: Stopwatch = { startedAt: null, accumulatedMs: 0 }

export function stopwatchStatus(stopwatch: Stopwatch): StopwatchStatus {
  if (stopwatch.startedAt !== null) return 'running'
  return stopwatch.accumulatedMs > 0 ? 'stopped' : 'idle'
}

/** Elapsed time at `now`; never negative, even if the device clock moved back. */
export function stopwatchElapsed(stopwatch: Stopwatch, now: number): number {
  const running = stopwatch.startedAt === null ? 0 : Math.max(0, now - stopwatch.startedAt)
  return stopwatch.accumulatedMs + running
}

/** Starts from 00:00 or resumes after a stop. */
export function startStopwatch(stopwatch: Stopwatch, now: number): Stopwatch {
  if (stopwatch.startedAt !== null) return stopwatch
  return { startedAt: now, accumulatedMs: stopwatch.accumulatedMs }
}

export function stopStopwatch(stopwatch: Stopwatch, now: number): Stopwatch {
  if (stopwatch.startedAt === null) return stopwatch
  return { startedAt: null, accumulatedMs: stopwatchElapsed(stopwatch, now) }
}

/** Display parts, like the Clock app: "01:23" + "42" hundredths; from an hour on, "1:00:00" + "00". */
export function stopwatchParts(ms: number): { whole: string; hundredths: string } {
  const totalHundredths = Math.floor(Math.max(0, ms) / 10)
  const totalSeconds = Math.floor(totalHundredths / 100)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const whole = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
  return { whole, hundredths: pad(totalHundredths % 100) }
}

/** "01:23,42" (Spanish decimal comma, as the Clock app shows it). */
export function formatStopwatch(ms: number): string {
  const { whole, hundredths } = stopwatchParts(ms)
  return `${whole},${hundredths}`
}

/** A stored stopwatch, or null if it is not one (corrupt or from another version). */
export function parseStopwatch(value: unknown): Stopwatch | null {
  if (typeof value !== 'object' || value === null) return null
  const { startedAt, accumulatedMs } = value as Record<string, unknown>
  const validStart = startedAt === null || (typeof startedAt === 'number' && Number.isFinite(startedAt) && startedAt >= 0)
  const validAccumulated = typeof accumulatedMs === 'number' && Number.isFinite(accumulatedMs) && accumulatedMs >= 0
  if (!validStart || !validAccumulated) return null
  return { startedAt: startedAt as number | null, accumulatedMs: accumulatedMs as number }
}
