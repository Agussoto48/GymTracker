import type { Id } from './types.ts'

/** Trims and collapses inner whitespace. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Comparison key that ignores case and accents ("Press Banca" = "press banca"). */
export function nameKey(name: string): string {
  return normalizeName(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
}

/** True if another item (archived or not) already uses this name. */
export function isDuplicateName(
  name: string,
  existing: readonly { id: Id; name: string }[],
  excludeId?: Id,
): boolean {
  const key = nameKey(name)
  return existing.some((item) => item.id !== excludeId && nameKey(item.name) === key)
}

export function compareByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
}
