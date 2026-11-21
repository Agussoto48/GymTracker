import { stopwatchParts } from '../../../domain/stopwatch.ts'
import type { Id } from '../../../domain/types.ts'
import { useStopwatch } from '../hooks/useStopwatch.ts'
import styles from './StopwatchBar.module.css'

/**
 * Stopwatch between sets, floating at the bottom of the workout sheet. Works like the Clock app:
 * Iniciar from 00:00, Detener freezes it, then Iniciar resumes or Reiniciar goes back to 00:00.
 */
export function StopwatchBar({ sessionId }: { sessionId: Id }) {
  const { status, elapsedMs, start, stop, reset } = useStopwatch(sessionId)
  const running = status === 'running'
  const { whole, hundredths } = stopwatchParts(elapsedMs)

  return (
    <div role="group" aria-label="Cronómetro" className={styles.bar} data-stopwatch={status}>
      {/* role=timer is not announced on every tick; the value is read when focused. */}
      <span role="timer" className={`${styles.time} figures`}>
        {whole}
        <span className={styles.hundredths}>,{hundredths}</span>
      </span>
      <div className={styles.controls}>
        <button type="button" className={styles.button} disabled={status !== 'stopped'} onClick={reset}>
          Reiniciar
        </button>
        {/* Green to start, red to stop, like the Clock app. */}
        <button
          type="button"
          className={`${styles.button} ${styles.main} ${running ? styles.stop : styles.start}`}
          onClick={running ? stop : start}
        >
          {running ? 'Detener' : 'Iniciar'}
        </button>
      </div>
    </div>
  )
}
