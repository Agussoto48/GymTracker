import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'

export function HistoryScreen() {
  return (
    <>
      <ScreenHeader title="Historial" />
      <EmptyState
        title="Sin entrenamientos registrados"
        message="Cuando termines tu primer entrenamiento, lo verás aquí con todas sus series."
      />
    </>
  )
}
