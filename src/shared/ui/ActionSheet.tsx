import { useEffect, useId, useRef } from 'react'
import styles from './ActionSheet.module.css'

export type SheetAction = {
  /** Returned by `onSelect`; also the button's `data-action`. */
  id: string
  /** Verb that names the result, e.g. "Quitar del entrenamiento". Never "OK". */
  label: string
  /** Red label for actions that delete data. */
  destructive?: boolean
  disabled?: boolean
}

type ActionSheetProps = {
  /** Short, one line if possible: the question, or the object the options act on. */
  title: string
  /** Only when the title and context are not enough. */
  message?: string
  actions: readonly SheetAction[]
  /** "confirm" asks before one action (alertdialog); "menu" offers options on something. */
  variant: 'confirm' | 'menu'
  /** The chosen action's id, or null when cancelled. */
  onSelect: (actionId: string | null) => void
}

/**
 * iOS-style action sheet anchored at the bottom (thumb reach): the actions on top, Cancel below.
 * Escape and taps outside the sheet cancel.
 */
export function ActionSheet({ title, message, actions, variant, onSelect }: ActionSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    // Focus the sheet itself, not its first button: iOS would draw the focus ring on it.
    // Keyboard users reach the buttons with Tab as usual.
    dialog.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      tabIndex={-1}
      role={variant === 'confirm' ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      data-confirm={variant === 'confirm' ? '' : undefined}
      data-menu={variant === 'menu' ? '' : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onSelect(null)
      }}
      onClick={(event) => {
        // The dialog itself only receives clicks on its backdrop and outer padding.
        if (event.target === event.currentTarget) onSelect(null)
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
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`${styles.button} ${action.destructive ? styles.destructive : ''}`}
            data-action={action.id}
            disabled={action.disabled}
            onClick={() => onSelect(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className={styles.group}>
        {/* Nothing is focused on open (the sheet is), so Enter never triggers a destructive action by accident. */}
        <button type="button" className={`${styles.button} ${styles.cancel}`} onClick={() => onSelect(null)}>
          Cancelar
        </button>
      </div>
    </dialog>
  )
}
