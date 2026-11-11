import type { ExerciseKind, Weight } from '../../domain/types.ts'

const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2, useGrouping: false })

/** 62.5 → "62,5" */
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** Weighted: "62,5 kg". Bodyweight: "Corporal" or "+10 kg" (added load). */
export function formatWeight(weight: Weight | null, kind: ExerciseKind): string {
  if (kind === 'bodyweight') return weight && weight.value > 0 ? `+${formatNumber(weight.value)} ${weight.unit}` : 'Corporal'
  return weight ? `${formatNumber(weight.value)} ${weight.unit}` : '—'
}

export function formatSet(set: { weight: Weight | null; reps: number }, kind: ExerciseKind): string {
  return `${formatWeight(set.weight, kind)} × ${set.reps}`
}

/** "jue 6 nov" */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replace(/[.,]/g, '')
}

/** "18:05" */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function minutesBetween(fromIso: string, to: number): number {
  return Math.max(0, Math.floor((to - Date.parse(fromIso)) / 60000))
}
