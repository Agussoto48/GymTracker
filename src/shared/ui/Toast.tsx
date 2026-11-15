import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckIcon } from './icons.tsx'
import { ToastContext, type ShowToast } from './useToast.ts'
import styles from './Toast.module.css'

const SHOWN_MS = 3500

/**
 * Brief confirmation of a routine action ("object + past participle", no "correctamente"): a glass
 * capsule above the tab bar (like iOS's floating notices and our AlertDialog) that goes away on its own. Never for errors or anything with an action (those
 * stay until dismissed). It is a popover, so it shows above any open sheet (top layer).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  // `request` changes on every call (same text twice still shows again); `text` fills the region.
  const [request, setRequest] = useState<{ id: number; message: string } | null>(null)
  const [text, setText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const show = useCallback<ShowToast>((message) => setRequest({ id: Date.now(), message }), [])

  useEffect(() => {
    const toast = ref.current
    if (!request || !toast) return
    // Re-open so it sits above whatever opened since; empty first, then the text, so screen
    // readers announce the change of an existing status region.
    if (toast.matches(':popover-open')) toast.hidePopover()
    setText('')
    toast.showPopover()
    const frame = requestAnimationFrame(() => setText(request.message))
    const timer = setTimeout(() => {
      toast.hidePopover()
      setText('')
      setRequest(null)
    }, SHOWN_MS)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [request])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div ref={ref} popover="manual" role="status" className={styles.toast} data-toast="">
        {text && (
          <>
            <CheckIcon className={styles.check} />
            <span>{text}</span>
          </>
        )}
      </div>
    </ToastContext.Provider>
  )
}
