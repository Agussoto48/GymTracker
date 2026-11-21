import styles from './SelectionBar.module.css'

export type SelectionAction = { label: string; onClick: () => void; destructive?: boolean; disabled?: boolean }

/**
 * Actions for the selected rows, floating where the tab bar was (the screen hides it meanwhile):
 * one glass capsule per action, at the two ends, so the destructive one stands apart.
 */
export function SelectionBar({ label, actions }: { label: string; actions: readonly SelectionAction[] }) {
  return (
    <div role="toolbar" aria-label={label} className={styles.bar}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={`${styles.button} ${action.destructive ? styles.destructive : ''}`}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
