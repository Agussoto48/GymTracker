import { useEffect, useState } from 'react'
import type { Id } from '../../domain/types.ts'

/**
 * Selection mode for a list: which items are picked. Only the `visible` ones count, so a search
 * never leaves hidden items selected for an action. Escape leaves the mode.
 */
export function useSelection<T extends { id: Id }>(visible: readonly T[]) {
  const [selecting, setSelecting] = useState(false)
  const [ids, setIds] = useState<ReadonlySet<Id>>(() => new Set())

  const stop = () => {
    setSelecting(false)
    setIds(new Set())
  }

  useEffect(() => {
    if (!selecting) return
    const onKeyDown = (event: KeyboardEvent) => {
      // A sheet or menu handles its own Escape first (a toast, also a popover, does not count).
      if (event.key === 'Escape' && !document.querySelector('dialog[open], [role=menu]:popover-open')) {
        setSelecting(false)
        setIds(new Set())
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selecting])

  return {
    selecting,
    start: () => setSelecting(true),
    stop,
    isSelected: (id: Id) => ids.has(id),
    toggle: (id: Id) =>
      setIds((current) => {
        const next = new Set(current)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    /** Selected and visible, in the list's order. */
    selected: visible.filter((item) => ids.has(item.id)),
  }
}
