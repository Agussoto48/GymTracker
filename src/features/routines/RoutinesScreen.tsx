import { useState } from 'react'
import { routineMatchesQuery } from '../../domain/routine.ts'
import type { Routine } from '../../domain/types.ts'
import { useExercises } from '../../data/exercises.ts'
import { useRoutines } from '../../data/routines.ts'
import { AddButton } from '../../shared/ui/AddButton.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { useSelection } from '../../shared/lib/useSelection.ts'
import { DoneButton } from '../../shared/ui/DoneButton.tsx'
import { SelectIcon } from '../../shared/ui/icons.tsx'
import { Menu } from '../../shared/ui/Menu.tsx'
import { useHideTabBar } from '../../shared/ui/useTabBar.ts'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { SearchField } from '../../shared/ui/SearchField.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { RoutineList } from './components/RoutineList.tsx'
import { RoutineSelectionBar } from './components/RoutineSelectionBar.tsx'
import { RoutineSheet } from './components/RoutineSheet.tsx'

/** Sheet state: closed, creating a new routine, or editing one. */
type Editing = { routine: Routine | null } | null

export function RoutinesScreen() {
  const routines = useRoutines()
  const exercises = useExercises()
  const [editing, setEditing] = useState<Editing>(null)
  const [query, setQuery] = useState('')

  // A routine matches by its name or its exercises; archived ones stay in their section.
  const searching = query.trim() !== ''
  const exerciseById = new Map(exercises?.map((e) => [e.id, e]))
  const found = routines?.filter((r) => routineMatchesQuery(r, query, exerciseById)) ?? []
  const active = found.filter((r) => r.archivedAt === null)
  const archived = found.filter((r) => r.archivedAt !== null)
  const noExercises = exercises !== undefined && !exercises.some((e) => e.archivedAt === null)
  const openNew = () => setEditing({ routine: null })
  // «⋯ › Seleccionar»: pick several rows, then archive or delete them from the bar at the bottom.
  const selection = useSelection([...active, ...archived])
  useHideTabBar(selection.selecting)
  const selected = selection.selected.length
  const listSelection = selection.selecting ? selection : undefined

  return (
    <>
      <ScreenHeader
        title={selection.selecting ? selectionTitle(selected) : 'Rutinas'}
        leading={
          selection.selecting ? (
            <DoneButton label="Terminar selección" onClick={selection.stop} />
          ) : (
            routines &&
            routines.length > 0 && (
              <Menu items={[{ id: 'select', label: 'Seleccionar', icon: <SelectIcon /> }]} onSelect={selection.start} />
            )
          )
        }
        // Without exercises a routine cannot be saved, so the + only shows once there is something to pick.
        action={!noExercises && !selection.selecting && <AddButton label="Nueva rutina" onClick={openNew} />}
        search={
          routines && routines.length > 0 ? (
            <SearchField label="Buscar rutinas" value={query} onChange={setQuery} resultCount={found.length} />
          ) : undefined
        }
      />

      {searching && found.length === 0 && (
        <EmptyState variant="plain" message={`Ninguna rutina coincide con «${query.trim()}».`} />
      )}

      {routines && !searching && active.length === 0 && (
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
          <RoutineList
            routines={active}
            exercises={exercises}
            onSelect={(routine) => setEditing({ routine })}
            selection={listSelection}
          />
        </Section>
      )}

      {archived.length > 0 && exercises && (
        <Section title={`Archivadas (${archived.length})`}>
          <RoutineList
            routines={archived}
            exercises={exercises}
            onSelect={(routine) => setEditing({ routine })}
            selection={listSelection}
          />
        </Section>
      )}

      {editing && exercises && (
        <RoutineSheet routine={editing.routine} exercises={exercises} onClose={() => setEditing(null)} />
      )}
      {selection.selecting && <RoutineSelectionBar selected={selection.selected} onDone={selection.stop} />}
    </>
  )
}

function selectionTitle(selected: number): string {
  return selected === 0 ? 'Seleccionar' : `${selected} ${selected === 1 ? 'seleccionada' : 'seleccionadas'}`
}
