import { MoreIcon } from './icons.tsx'
import styles from './MoreButton.module.css'

type MoreButtonProps = {
  /** Not wired yet in the screen toolbars: placeholder for upcoming screen options. */
  onClick?: () => void
  /** Names what the options act on when there are several on screen, e.g. "Opciones de Press banca". */
  label?: string
  /** "toolbar": 44 px circle on the screen's toolbar. "inline": smaller, on a card (still a 44 px target). */
  variant?: 'toolbar' | 'inline'
}

/** Round "⋯" that opens options. Neutral: it is never the primary action. */
export function MoreButton({ onClick, label = 'Más opciones', variant = 'toolbar' }: MoreButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${variant === 'inline' ? styles.inline : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <MoreIcon />
    </button>
  )
}
