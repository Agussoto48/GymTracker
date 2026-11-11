import { useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'

function todayLabel(date: Date): string {
  const text = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function WorkoutScreen() {
  // Computed once on mount, not on every render.
  const [today] = useState(() => todayLabel(new Date()))

  return (
    <>
      <ScreenHeader title="Entrenar" subtitle={today} />

      <section className="section" aria-labelledby="workout-routines">
        <h2 id="workout-routines" className="section__title">
          Tus rutinas
        </h2>
        <EmptyState
          title="Todavía no hay rutinas"
          message="Crea una rutina en la pestaña Rutinas y aparecerá aquí para empezar con un toque."
        />
      </section>

      <section className="section" aria-labelledby="workout-free">
        <h2 id="workout-free" className="section__title">
          Sin rutina
        </h2>
        <Button variant="primary" disabled>
          Empezar entrenamiento libre
        </Button>
        <p className="note">Disponible cuando esté lista la pantalla de entrenamiento.</p>
      </section>
    </>
  )
}
