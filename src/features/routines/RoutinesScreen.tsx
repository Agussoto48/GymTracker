import { Button } from '../../shared/ui/Button.tsx'
import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'

export function RoutinesScreen() {
  return (
    <>
      <ScreenHeader
        title="Rutinas"
        action={
          <Button disabled aria-label="Nueva rutina">
            Nueva
          </Button>
        }
      />
      <EmptyState
        title="Arma tu primera rutina"
        message="Cada rutina es un día de tu split, como «Push» o «Pierna», con los ejercicios que quieras en el orden que prefieras."
      />
    </>
  )
}
