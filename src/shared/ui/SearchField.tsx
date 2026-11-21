import { useRef } from 'react'
import { count } from '../lib/format.ts'
import { ClearIcon, SearchIcon } from './icons.tsx'
import styles from './SearchField.module.css'

type SearchFieldProps = {
  /** Accessible name, e.g. "Buscar ejercicios"; the visible placeholder is just "Buscar". */
  label: string
  value: string
  onChange: (value: string) => void
  /** How many items match; read out to screen readers while searching ("3 resultados"). */
  resultCount: number
}

/**
 * iOS-style inline search field (HIG search fields: placeholder, Search icon, Clear button), for
 * filtering the list below it as the person types.
 */
export function SearchField({ label, value, onChange, resultCount }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const clear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div role="search" className={styles.field}>
      <SearchIcon className={styles.icon} />
      <input
        ref={inputRef}
        type="search"
        className={styles.input}
        aria-label={label}
        placeholder="Buscar"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Results update while typing, so "Buscar" on the keyboard only has to hide it.
          if (event.key === 'Enter') event.currentTarget.blur()
          else if (event.key === 'Escape' && value) {
            event.preventDefault()
            onChange('')
          }
        }}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {value && (
        <button type="button" className={styles.clear} aria-label="Borrar búsqueda" onClick={clear}>
          <ClearIcon className={styles.clearIcon} />
        </button>
      )}
      <p role="status" className="visually-hidden">
        {!value.trim() ? '' : resultCount === 0 ? 'Sin resultados' : count(resultCount, 'resultado', 'resultados')}
      </p>
    </div>
  )
}
