import { useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { SegmentedControl } from '../../shared/ui/SegmentedControl.tsx'
import { BackupSheet } from './components/BackupSheet.tsx'
import { HistoryView } from './components/HistoryView.tsx'
import { StatsPreview } from './components/StatsPreview.tsx'
import { useBackupStatus } from './hooks/useBackupStatus.ts'
import styles from './ProgressScreen.module.css'

type View = 'history' | 'stats'

const VIEWS = [
  { value: 'history', label: 'Historial' },
  { value: 'stats', label: 'Estadísticas' },
] as const

/** Progreso: finished workouts (Historial) and, later, statistics derived from them (Estadísticas). */
export function ProgressScreen() {
  const [view, setView] = useState<View>('history')
  // Fade only when the person switches views, not when the tab opens.
  const [switched, setSwitched] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const backup = useBackupStatus()

  return (
    <>
      {/* Respaldo stays here until the app has a settings section (see PROGRESS). */}
      <ScreenHeader title="Progreso" action={<Button onClick={() => setBackupOpen(true)}>Respaldo</Button>} />

      <div className={styles.switcher}>
        <SegmentedControl
          label="Vista"
          hideLabel
          value={view}
          options={VIEWS}
          onChange={(next) => {
            setView(next)
            setSwitched(true)
          }}
        />
      </div>

      {/* key: the new view mounts (and fades in) on each switch. */}
      <div key={view} className={switched ? styles.fadeIn : undefined}>
        {view === 'history' ? (
          <HistoryView backup={backup} onOpenBackup={() => setBackupOpen(true)} />
        ) : (
          <StatsPreview />
        )}
      </div>

      {backupOpen && <BackupSheet status={backup} onClose={() => setBackupOpen(false)} />}
    </>
  )
}
