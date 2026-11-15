import styles from './RotateNotice.module.css'

/**
 * Covers the app when a phone is held sideways. iOS ignores the manifest's `orientation` and
 * can't lock it from the page, so the app is portrait-only by asking. Pure CSS: everything stays
 * mounted underneath (typed text, open sheets, the workout) and is back as it was on rotating.
 */
export function RotateNotice() {
  return (
    <div className={styles.notice}>
      {/* A phone that turns upright once (static under Reduce Motion); the arrow names the gesture. */}
      <svg className={styles.icon} width="64" height="52" viewBox="0 0 72 58" aria-hidden="true">
        <g className={styles.phone}>
          <rect x="24" y="6" width="24" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M32 43h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path
          d="M19.6 54.3A31 31 0 0 1 6.5 18.4M1.7 22L6.5 18.4L8.3 24.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className={styles.title}>Gira el teléfono</p>
      <p className={styles.message}>GymTracker se usa en vertical.</p>
    </div>
  )
}
