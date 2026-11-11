import { useState } from 'react'
import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import styles from './WorkoutScreen.module.css'

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

      <Section title="Tus rutinas">
        <EmptyState
          title="Todavía no hay rutinas"
          message="Crea una rutina en la pestaña Rutinas y aparecerá aquí para empezar con un toque."
        />
      </Section>

      <Section title="Sin rutina">
        <Button variant="primary" disabled>
          Empezar entrenamiento libre
        </Button>
        <p className={styles.note}>Disponible cuando esté lista la pantalla de entrenamiento.</p>
      </Section>
    </>
  )
}
