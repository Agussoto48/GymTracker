import { useEffect, useState } from 'react'
import {
  IDLE_STOPWATCH,
  startStopwatch,
  stopStopwatch,
  stopwatchElapsed,
  stopwatchStatus,
  type Stopwatch,
} from '../../../domain/stopwatch.ts'
import type { Id } from '../../../domain/types.ts'
import { loadStopwatch, saveStopwatch } from '../../../data/stopwatch.ts'

/** The workout's stopwatch, saved on every change so it keeps running after hiding or reloading. */
export function useStopwatch(sessionId: Id) {
  const [stopwatch, setStopwatch] = useState<Stopwatch>(() => loadStopwatch(sessionId))
  const [now, setNow] = useState(() => Date.now())
  const status = stopwatchStatus(stopwatch)

  // Re-render once per frame while running, for the hundredths. Browsers pause frames while the
  // app is in the background, which is fine: the time comes from timestamps, not from the frames.
  useEffect(() => {
    if (status !== 'running') return
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [status])

  function update(next: Stopwatch, at: number) {
    setNow(at)
    setStopwatch(next)
    saveStopwatch(sessionId, next)
  }

  return {
    status,
    elapsedMs: stopwatchElapsed(stopwatch, now),
    start: () => {
      const at = Date.now()
      update(startStopwatch(stopwatch, at), at)
    },
    stop: () => {
      const at = Date.now()
      update(stopStopwatch(stopwatch, at), at)
    },
    reset: () => update(IDLE_STOPWATCH, Date.now()),
  }
}
