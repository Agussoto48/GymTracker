import { CheckIcon } from './icons.tsx'
import styles from './MoreButton.module.css'

/** Round ✓ on the toolbar that ends a mode (e.g. selecting), in the place of the "⋯" that started it. */
export function DoneButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.button} onClick={onClick} aria-label={label} title={label}>
      <CheckIcon />
    </button>
  )
}
