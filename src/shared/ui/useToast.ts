import { createContext, useContext } from 'react'

export type ShowToast = (message: string) => void

export const ToastContext = createContext<ShowToast>(() => {})

/** `const toast = useToast(); toast('Ejercicio «Remo» guardado')`. Needs `<ToastProvider>` above. */
export function useToast(): ShowToast {
  return useContext(ToastContext)
}
