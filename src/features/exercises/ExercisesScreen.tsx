import { useState } from 'react'
import { matchesQuery } from '../../domain/exercise.ts'
import type { Exercise } from '../../domain/types.ts'
import { useExercises } from '../../data/exercises.ts'
import { AddButton } from '../../shared/ui/AddButton.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { MoreButton } from '../../shared/ui/MoreButton.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { SearchField } from '../../shared/ui/SearchField.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { ExerciseList } from './components/ExerciseList.tsx'
import { ExerciseSheet } from '../../shared/ui/ExerciseSheet.tsx'

/** Sheet state: closed, creating a new exercise, or editing one. */
type Editing = { exercise: Exercise | null } | null

export function ExercisesScreen() {
  const exercises = useExercises()
  const [editing, setEditing] = useState<Editing>(null)
  const [query, setQuery] = useState('')

  // While searching, both sections only keep what matches (archived ones too, to restore them).
  const searching = query.trim() !== ''
  const found = exercises?.filter((e) => matchesQuery(e.name, query)) ?? []
  const active = found.filter((e) => e.archivedAt === null)
  const archived = found.filter((e) => e.archivedAt !== null)
  const openNew = () => setEditing({ exercise: null })
  const openEdit = (exercise: Exercise) => setEditing({ exercise })

  return (
    <>
      <ScreenHeader
        title="Ejercicios"
        leading={<MoreButton />}
        action={<AddButton label="Nuevo ejercicio" onClick={openNew} />}
        search={
          exercises && exercises.length > 0 ? (
            <SearchField label="Buscar ejercicios" value={query} onChange={setQuery} resultCount={found.length} />
          ) : undefined
        }
      />

      {exercises && !searching && active.length === 0 && (
        <EmptyState variant="plain" message={'Aquí aparecerán los ejercicios que agregues\u00a0con\u00a0+.'} />
      )}

      {searching && found.length === 0 && (
        <EmptyState variant="plain" message={`Ningún ejercicio coincide con «${query.trim()}».`} />
      )}

      {active.length > 0 && (
        <Section title={`${active.length} ${active.length === 1 ? 'ejercicio' : 'ejercicios'}`}>
          <ExerciseList exercises={active} onSelect={openEdit} />
        </Section>
      )}

      {archived.length > 0 && (
        <Section title={`Archivados (${archived.length})`}>
          <ExerciseList exercises={archived} onSelect={openEdit} />
        </Section>
      )}

      {editing && <ExerciseSheet exercise={editing.exercise} onClose={() => setEditing(null)} />}
    </>
  )
}
