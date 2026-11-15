import { EmptyState } from '../../../shared/ui/EmptyState.tsx'
import { Section } from '../../../shared/ui/Section.tsx'
import styles from './StatsPreview.module.css'

type Planned = { title: string; description: string }

/*
 * Placeholders only: no numbers, no charts, no queries. Each tile is replaced by its real component
 * when that statistic is built (one at a time; plan in docs/PROGRESS.md › Estadísticas).
 */
const SUMMARY: readonly Planned[] = [
  { title: 'Entrenamientos', description: 'Cuántos haces por semana y por mes.' },
  { title: 'Tiempo total', description: 'Las horas que llevas entrenando.' },
  { title: 'Volumen total', description: 'Peso × reps de todas tus series.' },
  { title: 'Frecuencia', description: 'Qué días de la semana entrenas.' },
]

const BY_EXERCISE: readonly Planned[] = [
  { title: 'Evolución de cargas', description: 'Cómo cambia el peso que levantas en cada ejercicio.' },
  { title: 'Récords personales', description: 'Tu mejor marca en cada ejercicio.' },
]

export function StatsPreview() {
  return (
    <>
      <EmptyState
        variant="plain"
        title="Próximamente"
        message="Aquí verás tu progreso, calculado con los entrenamientos de tu historial."
      />
      <Section title="Resumen">
        <TileGrid items={SUMMARY} />
      </Section>
      <Section title="Por ejercicio">
        <TileGrid items={BY_EXERCISE} wide />
      </Section>
    </>
  )
}

function TileGrid({ items, wide = false }: { items: readonly Planned[]; wide?: boolean }) {
  return (
    <ul className={wide ? `${styles.grid} ${styles.wide}` : styles.grid}>
      {items.map((item) => (
        <li key={item.title} className={styles.tile}>
          <h3 className={styles.title}>{item.title}</h3>
          <p className={styles.description}>{item.description}</p>
        </li>
      ))}
    </ul>
  )
}
