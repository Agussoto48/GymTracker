// Iconos de pestañas: rellenos, 24×24, un solo lenguaje visual (HIG tab-bars › Best practices).
// Son decorativos: la etiqueta de texto de cada pestaña da el nombre accesible.

type IconProps = { className?: string }

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
} as const

export function WorkoutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="1" y="9.5" width="2" height="5" rx="1" />
      <rect x="3.5" y="6.5" width="3" height="11" rx="1.2" />
      <rect x="6.5" y="10.75" width="11" height="2.5" />
      <rect x="17.5" y="6.5" width="3" height="11" rx="1.2" />
      <rect x="21" y="9.5" width="2" height="5" rx="1" />
    </svg>
  )
}

export function RoutinesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="5" cy="6" r="1.75" />
      <rect x="9" y="5" width="12" height="2" rx="1" />
      <circle cx="5" cy="12" r="1.75" />
      <rect x="9" y="11" width="12" height="2" rx="1" />
      <circle cx="5" cy="18" r="1.75" />
      <rect x="9" y="17" width="12" height="2" rx="1" />
    </svg>
  )
}

export function ExercisesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  )
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        fillRule="evenodd"
        d="M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Zm-1 5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8Z"
      />
      <rect x="7" y="2.5" width="2" height="4" rx="1" />
      <rect x="15" y="2.5" width="2" height="4" rx="1" />
      <rect x="7" y="12" width="3" height="3" rx="0.75" />
    </svg>
  )
}
