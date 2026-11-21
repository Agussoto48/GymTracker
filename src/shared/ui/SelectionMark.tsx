import { CheckIcon } from './icons.tsx'
import styles from './SelectionMark.module.css'

/** Circle at the start of a row in selection mode: empty, or filled with ✓ when selected. Decorative:
 *  the row button carries `aria-pressed`. */
export function SelectionMark({ selected }: { selected: boolean }) {
  return <span className={`${styles.mark} ${selected ? styles.selected : ''}`}>{selected && <CheckIcon />}</span>
}
