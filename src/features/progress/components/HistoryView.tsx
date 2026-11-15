import { useMemo, useState } from 'react'
import { groupByMonth } from '../../../domain/history.ts'
import type { Id } from '../../../domain/types.ts'
import { useExercises } from '../../../data/exercises.ts'
import { useRoutines } from '../../../data/routines.ts'
import { useFinishedSessions } from '../../../data/sessions.ts'
import { count, formatMonth, formatShortDate } from '../../../shared/lib/format.ts'
import { EmptyState } from '../../../shared/ui/EmptyState.tsx'
import { Section } from '../../../shared/ui/Section.tsx'
import type { BackupStatus } from '../hooks/useBackupStatus.ts'
import { SessionList } from './SessionList.tsx'
import { SessionSheet } from './SessionSheet.tsx'
import styles from './HistoryView.module.css'

type HistoryViewProps = {
  backup: BackupStatus
  onOpenBackup: () => void
}

/**
 * Finished workouts by month, newest first; tapping one opens its detail.
 * Future filters (date, routine, exercise) go between the view switcher and the backup reminder.
 */
export function HistoryView({ backup, onOpenBackup }: HistoryViewProps) {
  const sessions = useFinishedSessions()
  const exercises = useExercises()
  const routines = useRoutines()
  const [selectedId, setSelectedId] = useState<Id | null>(null)

  const groups = useMemo(() => groupByMonth(sessions ?? []), [sessions])
  const exerciseById = useMemo(() => new Map(exercises?.map((e) => [e.id, e])), [exercises])
  const routineNames = useMemo(() => new Map(routines?.map((r) => [r.id, r.name])), [routines])
  // Derived from the live list: if the session is deleted, the sheet closes by itself.
  const selected = sessions?.find((s) => s.id === selectedId)

  return (
    <>
      {backup.stale && (
        <button type="button" className={styles.reminder} onClick={onOpenBackup}>
          <span className={styles.reminderText}>
            <span className={styles.reminderTitle}>Haz un respaldo</span>
            <span className={styles.reminderMeta}>
              {backup.lastExportAt
                ? `El último es del ${formatShortDate(backup.lastExportAt)}.`
                : 'Aún no has exportado ninguno.'}{' '}
              Tus datos solo están en este iPhone.
            </span>
          </span>
          <span className={styles.reminderAction} aria-hidden="true">
            Exportar ›
          </span>
        </button>
      )}

      {sessions?.length === 0 && (
        <EmptyState variant="plain" message="Aquí aparecerán tus entrenamientos cuando los termines." />
      )}

      {groups.map((group) => (
        <Section
          key={group.month}
          title={formatMonth(group.month)}
          detail={count(group.sessions.length, 'entrenamiento', 'entrenamientos')}
        >
          <SessionList sessions={group.sessions} routineNames={routineNames} onSelect={setSelectedId} />
        </Section>
      ))}

      {selected && exercises && (
        <SessionSheet
          session={selected}
          exerciseById={exerciseById}
          routineNames={routineNames}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
