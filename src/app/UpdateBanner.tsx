import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './UpdateBanner.module.css'

/**
 * Registers the service worker and offers a new version without forcing it (ADR-0004):
 * the user taps "Actualizar" when it suits them; otherwise it applies on the next cold start.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // iOS keeps standalone apps alive for days: look for a new version each time the app comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {})
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div role="status" className={styles.banner}>
      <span className={styles.text}>Hay una versión nueva.</span>
      <button type="button" className={styles.update} onClick={() => void updateServiceWorker()}>
        Actualizar
      </button>
      <button type="button" className={styles.dismiss} onClick={() => setNeedRefresh(false)} aria-label="Ahora no">
        ✕
      </button>
    </div>
  )
}
