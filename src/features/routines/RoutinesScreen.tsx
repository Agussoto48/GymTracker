import { useState } from 'react'
import type { Routine } from '../../domain/types.ts'
import { useExercises } from '../../data/exercises.ts'
import { useRoutines } from '../../data/routines.ts'
import { AddButton } from '../../shared/ui/AddButton.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { MoreButton } from '../../shared/ui/MoreButton.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { RoutineList } from './components/RoutineList.tsx'
import { RoutineSheet } from './components/RoutineSheet.tsx'

/** Sheet state: closed, creating a new routine, or editing one. */
type Editing = { routine: Routine | null } | null

export function RoutinesScreen() {
  const routines = useRoutines()
  const exercises = useExercises()
  const [editing, setEditing] = useState<Editing>(null)

  const active = routines?.filter((r) => r.archivedAt === null) ?? []
  const archived = routines?.filter((r) => r.archivedAt !== null) ?? []
  const noExercises = exercises !== undefined && !exercises.some((e) => e.archivedAt === null)
  const openNew = () => setEditing({ routine: null })

  return (
    <>
      <ScreenHeader
        title="Rutinas"
        leading={<MoreButton />}
        // Without exercises a routine cannot be saved, so the + only shows once there is something to pick.
        action={!noExercises && <AddButton label="Nueva rutina" onClick={openNew} />}
      />

      {routines && active.length === 0 && (
        <EmptyState
          variant="plain"
          message={
            noExercises
              ? 'Para crear una rutina, primero agrega ejercicios en la pestaña Ejercicios.'
              : 'Aquí aparecerán las rutinas que crees\u00a0con\u00a0+.'
          }
        />
      )}

      {active.length > 0 && exercises && (
        <Section title={`${active.length} ${active.length === 1 ? 'rutina' : 'rutinas'}`}>
          <RoutineList routines={active} exercises={exercises} onSelect={(routine) => setEditing({ routine })} />
        </Section>
      )}

      {archived.length > 0 && exercises && (
        <Section title={`Archivadas (${archived.length})`}>
          <RoutineList routines={archived} exercises={exercises} onSelect={(routine) => setEditing({ routine })} />
        </Section>
      )}

      {editing && exercises && (
        <RoutineSheet routine={editing.routine} exercises={exercises} onClose={() => setEditing(null)} />
      )}
    </>
  )
}
