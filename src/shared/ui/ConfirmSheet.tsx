import { useEffect, useId, useRef } from 'react'
import styles from './ConfirmSheet.module.css'

export type ConfirmOptions = {
  /** Short question, one line if possible. */
  title: string
  /** Only when the title and context are not enough. */
  message?: string
  /** Verb that names the result, e.g. "Eliminar rutina". Never "OK". */
  confirmLabel: string
  /** Red label for actions that delete data. */
  destructive?: boolean
}

type ConfirmSheetProps = ConfirmOptions & { onAnswer: (confirmed: boolean) => void }

/**
 * iOS-style action sheet anchored at the bottom (thumb reach): the action on top, Cancel below.
 * Escape and taps outside the sheet cancel.
 */
export function ConfirmSheet({ title, message, confirmLabel, destructive = false, onAnswer }: ConfirmSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    // Focus the sheet itself, not its first button: iOS would draw the focus ring on "Cancelar".
    // Keyboard users reach the buttons with Tab as usual.
    dialog.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      tabIndex={-1}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      data-confirm=""
      onCancel={(event) => {
        event.preventDefault()
        onAnswer(false)
      }}
      onClick={(event) => {
        // The dialog itself only receives clicks on its backdrop and outer padding.
        if (event.target === event.currentTarget) onAnswer(false)
      }}
    >
      <div className={styles.group}>
        <div className={styles.text}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {message && (
            <p id={messageId} className={styles.message}>
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          className={`${styles.button} ${destructive ? styles.destructive : ''}`}
          data-action="confirm"
          onClick={() => onAnswer(true)}
        >
          {confirmLabel}
        </button>
      </div>
      <div className={styles.group}>
        {/* Nothing is focused on open (the sheet is), so Enter never confirms a destructive action by accident. */}
        <button type="button" className={`${styles.button} ${styles.cancel}`} onClick={() => onAnswer(false)}>
          Cancelar
        </button>
      </div>
    </dialog>
  )
}
