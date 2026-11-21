import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { MoreButton } from './MoreButton.tsx'
import styles from './Menu.module.css'

export type MenuItem = { id: string; label: string; icon?: ReactNode }

type MenuProps = {
  items: readonly MenuItem[]
  onSelect: (id: string) => void
  /** Accessible name of the "⋯" button. */
  label?: string
}

/**
 * "⋯" toolbar button that opens a pull-down menu right below it (HIG pull-down buttons), not an
 * action sheet. A popover: a tap outside or Escape closes it; arrows move between items.
 */
export function Menu({ items, onSelect, label = 'Más opciones' }: MenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuId = useId()

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === 'open'
      setOpen(isOpen)
      if (isOpen) menu.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    }
    menu.addEventListener('toggle', onToggle)
    return () => menu.removeEventListener('toggle', onToggle)
  }, [])

  // It is placed once when it opens, so it closes if the page scrolls under it.
  useEffect(() => {
    if (!open) return
    const close = () => menuRef.current?.hidePopover()
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function toggle() {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    if (open) {
      menu.hidePopover()
      return
    }
    const rect = trigger.getBoundingClientRect()
    setPosition({ top: rect.bottom + 8, left: rect.left })
    menu.showPopover()
  }

  function choose(id: string) {
    menuRef.current?.hidePopover()
    triggerRef.current?.focus()
    onSelect(id)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const entries = [...event.currentTarget.querySelectorAll<HTMLElement>('[role=menuitem]')]
    const index = entries.indexOf(document.activeElement as HTMLElement)
    const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: entries.length - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    entries[(next + entries.length) % entries.length]?.focus()
  }

  return (
    <>
      <MoreButton
        ref={triggerRef}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
      />
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        role="menu"
        aria-label={label}
        className={styles.menu}
        style={{ top: position.top, left: position.left }}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => (
          <button key={item.id} type="button" role="menuitem" className={styles.item} onClick={() => choose(item.id)}>
            {item.icon && <span className={styles.icon}>{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}
