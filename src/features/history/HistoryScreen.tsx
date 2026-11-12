import { useMemo, useState } from 'react'
import { groupByMonth } from '../../domain/history.ts'
import type { Id } from '../../domain/types.ts'
import { useExercises } from '../../data/exercises.ts'
import { useRoutines } from '../../data/routines.ts'
import { useFinishedSessions } from '../../data/sessions.ts'
import { formatMonth, formatShortDate, formatTime } from '../../shared/lib/format.ts'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { BackupSection } from './components/BackupSection.tsx'
import { SessionList } from './components/SessionList.tsx'
import { SessionSheet } from './components/SessionSheet.tsx'
import styles from './HistoryScreen.module.css'

export function HistoryScreen() {
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
      <ScreenHeader title="Historial" />

      {sessions?.length === 0 && (
        <Section title="Entrenamientos">
          <EmptyState
            title="Todavía no hay entrenamientos"
            message="Cuando termines un entrenamiento aparecerá aquí, con todas sus series y notas."
          />
        </Section>
      )}

      {groups.map((group) => (
        <Section key={group.month} title={formatMonth(group.month)}>
          <SessionList sessions={group.sessions} routineNames={routineNames} onSelect={setSelectedId} />
        </Section>
      ))}

      <BackupSection />

      <p className={`${styles.version} figures`}>
        Versión del {formatShortDate(__APP_BUILD_TIME__)}, {formatTime(__APP_BUILD_TIME__)}
      </p>

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
