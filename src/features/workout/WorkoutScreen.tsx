import { useState } from 'react'
import { useExercises } from '../../data/exercises.ts'
import { useRoutines } from '../../data/routines.ts'
import { startSession, useActiveSession } from '../../data/sessions.ts'
import { formatLongDate, formatTime, minutesBetween } from '../../shared/lib/format.ts'
import { useNow } from '../../shared/lib/useNow.ts'
import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { WorkoutSheet } from './components/WorkoutSheet.tsx'
import styles from './WorkoutScreen.module.css'

export function WorkoutScreen() {
  // Computed once on mount, not on every render.
  const [today] = useState(() => formatLongDate(new Date()))
  const now = useNow()
  const session = useActiveSession()
  const exercises = useExercises()
  const routines = useRoutines()
  const [open, setOpen] = useState(false)
  const activeRoutines = routines?.filter((r) => r.archivedAt === null) ?? []
  const sessionRoutine = session?.routineId ? routines?.find((r) => r.id === session.routineId) : undefined
  const sessionName = sessionRoutine?.name ?? (session?.routineId ? 'Rutina' : 'Entrenamiento libre')
  // A routine workout is continued from its row; the "En curso" card is for free workouts
  // (or a routine archived meanwhile, which has no row).
  const inProgressId = activeRoutines.some((r) => r.id === session?.routineId) ? session?.routineId : null
  const othersBlocked = Boolean(session) && activeRoutines.some((r) => r.id !== inProgressId)
  // The routine in progress is pinned first so it never ends up below the fold.
  const shownRoutines = inProgressId
    ? [...activeRoutines.filter((r) => r.id === inProgressId), ...activeRoutines.filter((r) => r.id !== inProgressId)]
    : activeRoutines

  async function start(routineId: string | null = null) {
    await startSession(routineId)
    setOpen(true)
  }

  return (
    <>
      <ScreenHeader title="Entrenar" subtitle={today} />

      {session && !inProgressId && (
        <Section title="En curso">
          <div className={styles.active}>
            <div className={styles.activeText}>
              <p className={styles.activeName}>{sessionName}</p>
              <p className={`${styles.activeMeta} figures`}>
                Iniciado {formatTime(session.startedAt)} · {minutesBetween(session.startedAt, now)} min
              </p>
            </div>
            <Button variant="primary" onClick={() => setOpen(true)}>
              Continuar entrenamiento
            </Button>
          </div>
        </Section>
      )}

      {session === null && (
        <div className={styles.start}>
          <Button variant="primary" onClick={() => void start()}>
            Empezar entrenamiento libre
          </Button>
          <p className={styles.note}>Eliges los ejercicios de tu catálogo sobre la marcha.</p>
        </div>
      )}

      <Section title="Tus rutinas">
        {activeRoutines.length === 0 ? (
          <EmptyState variant="plain" message="Aquí aparecerán las rutinas que crees en la pestaña Rutinas." />
        ) : (
          <ul className={styles.routines}>
            {shownRoutines.map((routine) =>
              session && routine.id === inProgressId ? (
                <li key={routine.id} className={styles.routine}>
                  <span className={styles.routineText}>
                    <span className={styles.routineName}>{routine.name}</span>
                    <span className={`${styles.routineMeta} figures`}>
                      En curso · {formatTime(session.startedAt)} · {minutesBetween(session.startedAt, now)} min
                    </span>
                  </span>
                  <Button
                    variant="primary"
                    className={styles.continue}
                    onClick={() => setOpen(true)}
                    aria-label={`Continuar ${routine.name}`}
                  >
                    Continuar
                  </Button>
                </li>
              ) : (
                <li key={routine.id} className={styles.routine}>
                  <span className={styles.routineText}>
                    <span className={styles.routineName}>{routine.name}</span>
                    <span className={styles.routineMeta}>
                      {routine.exerciseIds.length} {routine.exerciseIds.length === 1 ? 'ejercicio' : 'ejercicios'}
                    </span>
                  </span>
                  <Button
                    className={styles.startRoutine}
                    disabled={Boolean(session)}
                    onClick={() => void start(routine.id)}
                    aria-label={`Empezar ${routine.name}`}
                  >
                    Empezar
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}
        {othersBlocked && (
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
