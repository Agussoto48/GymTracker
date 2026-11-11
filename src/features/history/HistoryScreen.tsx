import { EmptyState } from '../../shared/ui/EmptyState.tsx'
import { ScreenHeader } from '../../shared/ui/ScreenHeader.tsx'
import { Section } from '../../shared/ui/Section.tsx'
import { BackupSection } from './components/BackupSection.tsx'

export function HistoryScreen() {
  return (
    <>
      <ScreenHeader title="Historial" />
      <Section title="Entrenamientos">
        <EmptyState
          title="Pronto verás tus entrenamientos aquí"
          message="La lista de entrenamientos terminados con todas sus series llegará en la próxima versión."
        />
      </Section>
      <BackupSection />
    </>
  )
}
