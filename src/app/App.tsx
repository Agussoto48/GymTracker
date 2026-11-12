import { useState, type ComponentType } from 'react'
import { ExercisesScreen } from '../features/exercises/ExercisesScreen.tsx'
import { HistoryScreen } from '../features/history/HistoryScreen.tsx'
import { RoutinesScreen } from '../features/routines/RoutinesScreen.tsx'
import { WorkoutScreen } from '../features/workout/WorkoutScreen.tsx'
import { TabBar, type TabId } from './TabBar.tsx'
import { UpdateBanner } from './UpdateBanner.tsx'
import styles from './App.module.css'

const SCREENS: Record<TabId, ComponentType> = {
  workout: WorkoutScreen,
  routines: RoutinesScreen,
  exercises: ExercisesScreen,
  history: HistoryScreen,
}

export default function App() {
  const [tab, setTab] = useState<TabId>('workout')
  const Screen = SCREENS[tab]

  return (
    <>
      <main className={styles.content}>
        <Screen />
      </main>
      <UpdateBanner />
      <TabBar current={tab} onSelect={setTab} />
    </>
  )
}
