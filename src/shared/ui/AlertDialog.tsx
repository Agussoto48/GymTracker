import { useEffect, useId, useRef } from 'react'
import styles from './AlertDialog.module.css'

type AlertDialogProps = {
  /** What happened, or the question being asked, short (HIG alerts › Content). */
  title: string
  /** Only when it adds value. */
  message?: string
  /**
   * The default button, a verb naming the result ("Empezar"). When the alert only informs, Apple's
   * choice is "Done" («Listo»), never "OK".
   */
  actionLabel: string
  onAction: () => void
  /** Adds «Cancelar» on the leading side (HIG alerts › Buttons); Escape then cancels instead of acting. */
  onCancel?: () => void
}

/**
 * iOS-style alert: a centered card over a dimmed screen, title and message, one or two capsule buttons.
 * For rare, important moments only (HIG alerts, feedback); everyday confirmations use ActionSheet.
 * Escape closes it; a tap outside does not (as on iOS).
 */
export function AlertDialog({ title, message, actionLabel, onAction, onCancel }: AlertDialogProps) {
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
        if (onCancel) onCancel()
        else onAction()
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
        <div className={styles.buttons}>
          {onCancel && (
            <button
              type="button"
              className={`${styles.button} ${styles.cancel}`}
              onClick={onCancel}
              data-action="cancel"
            >
              Cancelar
            </button>
          )}
          <button type="button" className={styles.button} onClick={onAction} data-action="confirm">
            {actionLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
