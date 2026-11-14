import { ActionSheet } from './ActionSheet.tsx'

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

/** An action sheet with a single action to confirm. */
export function ConfirmSheet({ title, message, confirmLabel, destructive = false, onAnswer }: ConfirmSheetProps) {
  return (
    <ActionSheet
      variant="confirm"
      title={title}
      message={message}
      actions={[{ id: 'confirm', label: confirmLabel, destructive }]}
      onSelect={(actionId) => onAnswer(actionId === 'confirm')}
    />
  )
}
