import { createContext, useContext, useEffect } from 'react'

/** Lets a screen replace the tab bar with its own bottom actions (e.g. while selecting). */
export const TabBarContext = createContext<(hidden: boolean) => void>(() => {})

/** Hides the tab bar while `hidden` is true, and shows it again when the screen goes away. */
export function useHideTabBar(hidden: boolean): void {
  const setHidden = useContext(TabBarContext)
  useEffect(() => {
    setHidden(hidden)
    return () => setHidden(false)
  }, [hidden, setHidden])
}
