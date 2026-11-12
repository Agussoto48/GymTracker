import { useState } from 'react'
import type { Exercise } from '../../domain/types.ts'
import { useExercises } from '../../data/exercises.ts'
import { AddButton } from '../../shared/ui/AddButton.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { MoreButton } from '../../shared/ui/MoreButton.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { ExerciseList } from './components/ExerciseList.tsx'
import { ExerciseSheet } from './components/ExerciseSheet.tsx'

/** Sheet state: closed, creating a new exercise, or editing one. */
type Editing = { exercise: Exercise | null } | null

export function ExercisesScreen() {
  const exercises = useExercises()
  const [editing, setEditing] = useState<Editing>(null)

  const active = exercises?.filter((e) => e.archivedAt === null) ?? []
  const archived = exercises?.filter((e) => e.archivedAt !== null) ?? []
  const openNew = () => setEditing({ exercise: null })
  const openEdit = (exercise: Exercise) => setEditing({ exercise })

  return (
    <>
      <ScreenHeader
        title="Ejercicios"
        leading={<MoreButton />}
        action={<AddButton label="Nuevo ejercicio" onClick={openNew} />}
      />

      {exercises && active.length === 0 && (
        <EmptyState variant="plain" message={'Aquí aparecerán los ejercicios que agregues\u00a0con\u00a0+.'} />
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
