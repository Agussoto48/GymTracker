import { useState, type ComponentType } from 'react'
import { ExercisesScreen } from '../features/exercises/ExercisesScreen.tsx'
import { ProgressScreen } from '../features/progress/ProgressScreen.tsx'
import { RoutinesScreen } from '../features/routines/RoutinesScreen.tsx'
import { WorkoutScreen } from '../features/workout/WorkoutScreen.tsx'
import { ToastProvider } from '../shared/ui/Toast.tsx'
import { TabBarContext } from '../shared/ui/useTabBar.ts'
import { RotateNotice } from './RotateNotice.tsx'
import { TabBar, type TabId } from './TabBar.tsx'
import { UpdateBanner } from './UpdateBanner.tsx'
import styles from './App.module.css'

const SCREENS: Record<TabId, ComponentType> = {
  workout: WorkoutScreen,
  routines: RoutinesScreen,
  exercises: ExercisesScreen,
  progress: ProgressScreen,
}

export default function App() {
  const [tab, setTab] = useState<TabId>('workout')
  // A screen in selection mode shows its own actions where the tab bar was (like Mail or WhatsApp).
  const [tabBarHidden, setTabBarHidden] = useState(false)
  const Screen = SCREENS[tab]

  return (
    <ToastProvider>
      <TabBarContext.Provider value={setTabBarHidden}>
        <main className={styles.content}>
          <Screen />
        </main>
      </TabBarContext.Provider>
      <UpdateBanner />
      {!tabBarHidden && <TabBar current={tab} onSelect={setTab} />}
      <RotateNotice />
    </ToastProvider>
  )
}
