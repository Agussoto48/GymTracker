import { useState } from 'react'
import type { Exercise } from '../../domain/types.ts'
import { useExercises } from '../../data/exercises.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
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
        action={
          active.length > 0 && (
            <Button onClick={openNew} aria-label="Nuevo ejercicio">
              Nuevo
            </Button>
          )
        }
      />

      {exercises && active.length === 0 && (
        <EmptyState
          title="Tu catálogo está vacío"
          message="Agrega los ejercicios que haces, con su unidad (kg o lb) y una nota fija como «asiento en 4». Después los usarás en tus rutinas."
          action={
            <Button variant="primary" onClick={openNew}>
              Agregar ejercicio
            </Button>
          }
        />
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
