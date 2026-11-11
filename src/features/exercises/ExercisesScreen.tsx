import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'

export function ExercisesScreen() {
  return (
    <>
      <ScreenHeader
        title="Ejercicios"
        action={
          <Button disabled aria-label="Nuevo ejercicio">
            Nuevo
          </Button>
        }
      />
      <EmptyState
        title="Tu catálogo está vacío"
        message="Agrega los ejercicios que haces, con su unidad (kg o lb) y una nota fija como «asiento en 4». Después los usarás en tus rutinas."
      />
    </>
  )
}
