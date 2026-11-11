import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Sheet.module.css'

type SheetProps = {
  title: string
  /** Called on Cancel or Escape. Backdrop taps are ignored to avoid losing edits. */
  onClose: () => void
  /** Trailing header action, usually the submit button of a form. */
  action?: ReactNode
  children: ReactNode
}

export function Sheet({ title, onClose, action, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className={styles.header}>
        <button type="button" className={styles.cancel} onClick={onClose}>
          Cancelar
        </button>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.action}>{action}</div>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  )
}
