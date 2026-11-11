import type { ComponentType } from 'react'
import { ExercisesIcon, HistoryIcon, RoutinesIcon, WorkoutIcon } from '../shared/ui/icons.tsx'
import styles from './TabBar.module.css'

export type TabId = 'workout' | 'routines' | 'exercises' | 'history'

type Tab = { id: TabId; label: string; Icon: ComponentType<{ className?: string }> }

const TABS: readonly Tab[] = [
  { id: 'workout', label: 'Entrenar', Icon: WorkoutIcon },
  { id: 'routines', label: 'Rutinas', Icon: RoutinesIcon },
  { id: 'exercises', label: 'Ejercicios', Icon: ExercisesIcon },
  { id: 'history', label: 'Historial', Icon: HistoryIcon },
]

type TabBarProps = {
  current: TabId
  onSelect: (tab: TabId) => void
}

// Tabs only navigate; actions belong in the screen (HIG tab bars).
export function TabBar({ current, onSelect }: TabBarProps) {
  return (
    <nav className={styles.tabBar} aria-label="Secciones">
      <ul className={styles.list}>
        {TABS.map(({ id, label, Icon }) => {
          const selected = id === current
          return (
            <li key={id}>
              <button
                type="button"
                className={styles.item}
                aria-current={selected ? 'page' : undefined}
                onClick={() => onSelect(id)}
              >
                <Icon className={styles.icon} />
                <span className={styles.label}>{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
