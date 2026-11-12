import { PlusIcon } from './icons.tsx'
import styles from './AddButton.module.css'

type AddButtonProps = {
  /** Accessible name, e.g. "Nuevo ejercicio": the button only shows a "+". */
  label: string
  onClick: () => void
}

/** Round "+" for the screen toolbar. Accent fill: it is the screen's primary action. */
export function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button type="button" className={styles.button} onClick={onClick} aria-label={label} title={label}>
      <PlusIcon />
    </button>
  )
}
