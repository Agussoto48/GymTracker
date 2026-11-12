import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Sheet.module.css'

type SheetProps = {
  title: string
  /** Label of the leading button that closes the sheet. */
  closeLabel?: string
  /** Called on Cancel or Escape. Backdrop taps are ignored to avoid losing edits. */
  onClose: () => void
  /** Trailing header action, usually the submit button of a form. */
  action?: ReactNode
  /** Identifies the view shown inside the sheet; changing it scrolls the content back to the top. */
  viewKey?: string
  children: ReactNode
}

export function Sheet({ title, closeLabel = 'Cancelar', onClose, action, viewKey, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [viewKey])

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
          {closeLabel}
        </button>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.action}>{action}</div>
      </header>
      <div ref={bodyRef} className={styles.body}>
        {children}
      </div>
    </dialog>
  )
}
