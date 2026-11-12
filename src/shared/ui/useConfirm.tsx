import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmSheet, type ConfirmOptions } from './ConfirmSheet.tsx'

type PendingConfirm = ConfirmOptions & { resolve: (confirmed: boolean) => void }

/**
 * `const [confirm, confirmSheet] = useConfirm()`; render `{confirmSheet}` and
 * `if (!(await confirm({ ... }))) return`.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const sheet = pending && (
    <ConfirmSheet
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      destructive={pending.destructive}
      onAnswer={(confirmed) => {
        setPending(null)
        pending.resolve(confirmed)
      }}
    />
  )

  return [confirm, sheet]
}
