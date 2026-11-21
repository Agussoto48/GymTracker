// Filled 24×24 icons. Decorative: the tab label or the button's aria-label provides the accessible name.

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

/** Rising bars, like SF Symbols' chart.bar.fill: history now, statistics later. */
export function ProgressIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="13" width="5" height="8" rx="1.5" />
      <rect x="9.5" y="8" width="5" height="13" rx="1.5" />
      <rect x="16" y="3" width="5" height="18" rx="1.5" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="10.75" y="4" width="2.5" height="16" rx="1.25" />
      <rect x="4" y="10.75" width="16" height="2.5" rx="1.25" />
    </svg>
  )
}

export function MoreIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

/**
 * Disclosure chevron, pointing down (content hidden). Rotate it to point up when the content is
 * shown (HIG disclosure-controls › Disclosure buttons). Stroked like SF Symbols' chevron, to match
 * the weight of the semibold text next to it.
 */
export function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  )
}

/** Check mark for confirmations, stroked like ChevronIcon to match semibold text next to it. */
export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

/** Magnifying glass for search fields, stroked like SF Symbols' magnifyingglass. */
export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5l5 5" />
    </svg>
  )
}

/** Filled circle with a cut-out ×, like SF Symbols' xmark.circle.fill (clear a field). */
export function ClearIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM8.46 8.46a1 1 0 0 1 1.41 0L12 10.59l2.12-2.13a1 1 0 1 1 1.42 1.42L13.41 12l2.13 2.12a1 1 0 0 1-1.42 1.42L12 13.41l-2.12 2.13a1 1 0 0 1-1.42-1.42L10.59 12 8.46 9.88a1 1 0 0 1 0-1.42z"
      />
    </svg>
  )
}
