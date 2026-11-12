import type { ExerciseKind, Weight, WeightUnit } from '../../domain/types.ts'

const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2, useGrouping: false })

/** 62.5 → "62,5" */
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** Weighted: "62,5 kg × 10". Bodyweight: "8 reps", or "+10 kg × 8" with added load. */
export function formatSet(set: { weight: Weight | null; reps: number }, kind: ExerciseKind): string {
  const loaded = set.weight !== null && (kind === 'weighted' || set.weight.value > 0)
  if (!loaded) return kind === 'bodyweight' ? `${set.reps} reps` : `— × ${set.reps}`
  const sign = kind === 'bodyweight' ? '+' : ''
  return `${sign}${formatNumber(set.weight!.value)} ${set.weight!.unit} × ${set.reps}`
}

/** Targets: "3 × 10 · 40 kg", "3 series", "10 reps · +5 kg" (bodyweight). Empty when there are none. */
export function formatTarget(target: {
  sets: number | null
  reps: number | null
  weight: number | null
  unit: WeightUnit
  kind: ExerciseKind
}): string {
  const parts: string[] = []
  if (target.sets !== null && target.reps !== null) parts.push(`${target.sets} × ${target.reps}`)
  else if (target.sets !== null) parts.push(`${target.sets} ${target.sets === 1 ? 'serie' : 'series'}`)
  else if (target.reps !== null) parts.push(`${target.reps} reps`)
  if (target.weight !== null && (target.kind === 'weighted' || target.weight > 0)) {
    parts.push(`${target.kind === 'bodyweight' ? '+' : ''}${formatNumber(target.weight)} ${target.unit}`)
  }
  return parts.join(' · ')
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

/** "Jueves, 6 de noviembre" (capitalised, for headings). */
export function formatLongDate(date: Date | string): string {
  const text = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "2026-11" → "Noviembre 2026" */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const text = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' })
    .format(new Date(year, monthNumber - 1, 1))
    .replace(' de ', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** 52 → "52 min"; 65 → "1 h 5 min"; 120 → "2 h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** count(3, 'serie', 'series') → "3 series" */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
