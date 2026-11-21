import type { ButtonHTMLAttributes, Ref } from 'react'
import { MoreIcon } from './icons.tsx'
import styles from './MoreButton.module.css'

type MoreButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Names what the options act on when there are several on screen, e.g. "Opciones de Press banca". */
  label?: string
  /** "toolbar": 44 px circle on the screen's toolbar. "inline": smaller, on a card (still a 44 px target). */
  variant?: 'toolbar' | 'inline'
  ref?: Ref<HTMLButtonElement>
}

/** Round "⋯" that opens options. Neutral: it is never the primary action. */
export function MoreButton({ label = 'Más opciones', variant = 'toolbar', className, ...props }: MoreButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`${styles.button} ${variant === 'inline' ? styles.inline : ''} ${className ?? ''}`}
      aria-label={label}
      title={label}
    >
      <MoreIcon />
    </button>
  )
}
