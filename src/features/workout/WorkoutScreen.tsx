import { useState } from 'react'
import { useExercises } from '../../data/exercises.ts'
import { startSession, useActiveSession } from '../../data/sessions.ts'
import { formatTime, minutesBetween } from '../../shared/lib/format.ts'
import { useNow } from '../../shared/lib/useNow.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { WorkoutSheet } from './components/WorkoutSheet.tsx'
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
  const now = useNow()
  const session = useActiveSession()
  const exercises = useExercises()
  const [open, setOpen] = useState(false)

  async function start() {
    await startSession()
    setOpen(true)
  }

  return (
    <>
      <ScreenHeader title="Entrenar" subtitle={today} />

      {session && (
        <Section title="En curso">
          <div className={styles.active}>
            <p className="figures">
              Entrenamiento libre · iniciado {formatTime(session.startedAt)} ·{' '}
              {minutesBetween(session.startedAt, now)} min
            </p>
            <Button variant="primary" onClick={() => setOpen(true)}>
              Continuar entrenamiento
            </Button>
          </div>
        </Section>
      )}

      {session === null && (
        <Section title="Sin rutina">
          <Button variant="primary" onClick={() => void start()}>
            Empezar entrenamiento libre
          </Button>
          <p className={styles.note}>Eliges los ejercicios de tu catálogo sobre la marcha.</p>
        </Section>
      )}

      <Section title="Tus rutinas">
        <EmptyState
          title="Todavía no hay rutinas"
          message="Pronto podrás armar tus días (Push, Pierna…) y empezar un entrenamiento desde una rutina con un toque."
        />
      </Section>

      {open && session && exercises && (
        <WorkoutSheet session={session} exercises={exercises} onHide={() => setOpen(false)} />
      )}
    </>
  )
}
