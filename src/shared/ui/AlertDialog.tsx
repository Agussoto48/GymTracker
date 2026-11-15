import { useEffect, useId, useRef } from 'react'
import styles from './AlertDialog.module.css'

type AlertDialogProps = {
  /** What happened, short (HIG alerts › Content). */
  title: string
  /** Only when it adds value. */
  message?: string
  /** Single button. When the alert only informs, Apple's choice is "Done" («Listo»), never "OK". */
  actionLabel: string
  onClose: () => void
}

/**
 * iOS-style alert: a centered card over a dimmed screen, title and message, one capsule button.
 * For rare, important moments only (HIG alerts, feedback): confirmations and choices use ActionSheet.
 * Escape closes it; a tap outside does not (as on iOS).
 */
export function AlertDialog({ title, message, actionLabel, onClose }: AlertDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    // Focus the dialog itself: iOS would draw the focus ring on the button.
    dialog.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      tabIndex={-1}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      data-alert=""
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className={styles.card}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {message && (
          <p id={messageId} className={styles.message}>
            {message}
          </p>
        )}
        <button type="button" className={styles.button} onClick={onClose}>
          {actionLabel}
        </button>
      </div>
    </dialog>
  )
}
