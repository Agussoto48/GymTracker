import { useState } from 'react'
import { nameKey } from '../../domain/names.ts'
import type { Exercise, Id } from '../../domain/types.ts'
import { Sheet } from './Sheet.tsx'
import { TextField } from './TextField.tsx'
import styles from './ExercisePicker.module.css'

type ExercisePickerProps = {
  exercises: readonly Exercise[]
  /** Exercises already chosen are hidden. */
  excludeIds: readonly Id[]
  /** Defaults to "Cancelar"; use "Listo" when the picker stays open to add several. */
  closeLabel?: string
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({ exercises, excludeIds, closeLabel, onPick, onClose }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const available = exercises.filter((e) => e.archivedAt === null && !excludeIds.includes(e.id))
  const key = nameKey(query)
  const matches = key ? available.filter((e) => nameKey(e.name).includes(key)) : available

  return (
    <Sheet title="Agregar ejercicio" closeLabel={closeLabel} onClose={onClose}>
      {available.length === 0 ? (
        <p className={styles.empty}>
          {exercises.length === 0
            ? 'Tu catálogo está vacío. Crea ejercicios en la pestaña Ejercicios.'
            : 'Ya agregaste todos los ejercicios disponibles.'}
        </p>
      ) : (
        <div className={styles.content}>
          <TextField
            label="Buscar"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej.: press"
            autoComplete="off"
            enterKeyHint="search"
          />
          {matches.length === 0 ? (
            <p className={styles.empty}>Ningún ejercicio coincide con «{query.trim()}».</p>
          ) : (
            <ul className={styles.list}>
              {matches.map((exercise) => (
                <li key={exercise.id}>
                  <button type="button" className={styles.row} onClick={() => onPick(exercise)}>
                    <span className={styles.name}>{exercise.name}</span>
                    {exercise.notes && <span className={styles.meta}>{exercise.notes}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  )
}
