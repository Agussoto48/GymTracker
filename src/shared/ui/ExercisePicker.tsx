import { useState } from 'react'
import { nameKey } from '../../domain/names.ts'
import type { Exercise, Id } from '../../domain/types.ts'
import { AddButton } from './AddButton.tsx'
import { ExerciseSheet } from './ExerciseSheet.tsx'
import { Sheet } from './Sheet.tsx'
import { TextField } from './TextField.tsx'
import styles from './ExercisePicker.module.css'

type ExercisePickerProps = {
  exercises: readonly Exercise[]
  /** Exercises already chosen are hidden. */
  excludeIds: readonly Id[]
  /** Defaults to "Cancelar"; use "Listo" when the picker stays open to add several. */
  closeLabel?: string
  /** Also called with an exercise created from the picker's "+". */
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({ exercises, excludeIds, closeLabel, onPick, onClose }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const available = exercises.filter((e) => e.archivedAt === null && !excludeIds.includes(e.id))
  const key = nameKey(query)
  const matches = key ? available.filter((e) => nameKey(e.name).includes(key)) : available

  return (
    <Sheet
      title="Agregar ejercicio"
      closeLabel={closeLabel}
      onClose={onClose}
      action={<AddButton label="Nuevo ejercicio" onClick={() => setCreating(true)} />}
    >
      {available.length === 0 ? (
        <p className={styles.empty}>
          {exercises.length === 0
            ? 'Tu catálogo está vacío. Crea un ejercicio\u00a0con\u00a0+.'
            : 'Ya agregaste todos los ejercicios disponibles. Crea otro\u00a0con\u00a0+.'}
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
            <p className={styles.empty}>
              Ningún ejercicio coincide con «{query.trim()}». {'Créalo\u00a0con\u00a0+.'}
            </p>
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

      {creating && (
        <ExerciseSheet
          exercise={null}
          // Searched and found nothing: that is most likely the exercise to create.
          initialName={matches.length === 0 ? query.trim() : ''}
          onClose={() => setCreating(false)}
          onCreated={(exercise) => {
            setCreating(false)
            setQuery('')
            onPick(exercise)
          }}
        />
      )}
    </Sheet>
  )
}
