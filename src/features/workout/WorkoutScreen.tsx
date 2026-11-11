import { useState } from 'react'
import { useExercises } from '../../data/exercises.ts'
import { useRoutines } from '../../data/routines.ts'
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
  const routines = useRoutines()
  const [open, setOpen] = useState(false)
  const activeRoutines = routines?.filter((r) => r.archivedAt === null) ?? []
  const sessionRoutine = session?.routineId ? routines?.find((r) => r.id === session.routineId) : undefined
  const sessionName = sessionRoutine?.name ?? (session?.routineId ? 'Rutina' : 'Entrenamiento libre')

  async function start(routineId: string | null = null) {
    await startSession(routineId)
    setOpen(true)
  }

  return (
    <>
      <ScreenHeader title="Entrenar" subtitle={today} />

      {session && (
        <Section title="En curso">
          <div className={styles.active}>
            <p className="figures">
              {sessionName} · iniciado {formatTime(session.startedAt)} ·{' '}
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
        {activeRoutines.length === 0 ? (
          <EmptyState
            title="Todavía no hay rutinas"
            message="Arma tus días (Push, Pierna…) en la pestaña Rutinas y empieza desde aquí con un toque."
          />
        ) : (
          <ul className={styles.routines}>
            {activeRoutines.map((routine) => (
              <li key={routine.id} className={styles.routine}>
                <span className={styles.routineText}>
                  <span className={styles.routineName}>{routine.name}</span>
                  <span className={styles.routineMeta}>
                    {routine.exerciseIds.length} {routine.exerciseIds.length === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>
                </span>
                <Button
                  disabled={Boolean(session)}
                  onClick={() => void start(routine.id)}
                  aria-label={`Empezar ${routine.name}`}
                >
                  Empezar
                </Button>
              </li>
            ))}
          </ul>
        )}
        {session && activeRoutines.length > 0 && (
          <p className={styles.note}>Termina o descarta el entrenamiento en curso para empezar otro.</p>
        )}
      </Section>

      {open && session && exercises && (
        <WorkoutSheet
          session={session}
          exercises={exercises}
          routineName={session.routineId ? sessionName : null}
          onHide={() => setOpen(false)}
        />
      )}
    </>
  )
}
