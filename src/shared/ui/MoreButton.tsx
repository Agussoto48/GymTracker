import { MoreIcon } from './icons.tsx'
import styles from './MoreButton.module.css'

type MoreButtonProps = {
  /** Not wired yet: placeholder for upcoming screen options. */
  onClick?: () => void
}

/** Round "⋯" for the leading side of the screen toolbar. Neutral: it is never the primary action. */
export function MoreButton({ onClick }: MoreButtonProps) {
  return (
    <button type="button" className={styles.button} onClick={onClick} aria-label="Más opciones" title="Más opciones">
      <MoreIcon />
    </button>
  )
}
