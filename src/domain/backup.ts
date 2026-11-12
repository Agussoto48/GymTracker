import { validateExercise } from './exercise.ts'
import { nameKey } from './names.ts'
import { validateRoutine } from './routine.ts'
import type { Exercise, Routine, SessionExercise, WorkoutSession, WorkoutSet } from './types.ts'
import { SESSION_NOTES_MAX_LENGTH, validateSet, withDerivedExerciseIds } from './workout.ts'

// Backup file format (ADR-0003). Bump FORMAT_VERSION when the shape changes and keep reading old ones.
export const BACKUP_APP = 'gymtracker'
export const BACKUP_FORMAT_VERSION = 1
const MAX_ERRORS = 10

export type BackupData = {
  exercises: Exercise[]
  routines: Routine[]
  sessions: WorkoutSession[]
}

export type BackupFile = {
  app: typeof BACKUP_APP
  formatVersion: typeof BACKUP_FORMAT_VERSION
  exportedAt: string
  data: BackupData
}

export type BackupSummary = {
  exportedAt: string
  exercises: number
  routines: number
  sessions: number
  sets: number
}

export type ParsedBackup = { ok: true; data: BackupData; summary: BackupSummary } | { ok: false; errors: string[] }

export function createBackupFile(data: BackupData, exportedAt: string): BackupFile {
  return { app: BACKUP_APP, formatVersion: BACKUP_FORMAT_VERSION, exportedAt, data }
}

export function summarize(data: BackupData, exportedAt: string): BackupSummary {
  return {
    exportedAt,
    exercises: data.exercises.length,
    routines: data.routines.length,
    sessions: data.sessions.length,
    sets: data.sessions.reduce((sum, s) => sum + s.exercises.reduce((n, e) => n + e.sets.length, 0), 0),
  }
}

type Rec = Record<string, unknown>
const isObject = (value: unknown): value is Rec => typeof value === 'object' && value !== null && !Array.isArray(value)
const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 100
const isIsoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const isOptionalIsoDate = (value: unknown): value is string | null => value === null || isIsoDate(value)

/** Parses and fully validates a backup without touching the database. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['El archivo no es un JSON válido.'] }
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP) {
    return { ok: false, errors: ['El archivo no es un respaldo de GymTracker.'] }
  }
  if (typeof raw.formatVersion !== 'number' || raw.formatVersion > BACKUP_FORMAT_VERSION) {
    return { ok: false, errors: ['El respaldo es de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.'] }
  }
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, errors: [`Versión de respaldo no reconocida (${String(raw.formatVersion)}).`] }
  }
  const data = raw.data
  if (!isObject(data) || !Array.isArray(data.exercises) || !Array.isArray(data.routines) || !Array.isArray(data.sessions)) {
    return { ok: false, errors: ['Faltan datos en el respaldo (ejercicios, rutinas o entrenamientos).'] }
  }
  const exportedAt = isIsoDate(raw.exportedAt) ? raw.exportedAt : new Date(0).toISOString()

  const errors: string[] = []
  const fail = (message: string) => {
    if (errors.length < MAX_ERRORS) errors.push(message)
  }

  const exercises = parseExercises(data.exercises, fail)
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const routines = parseRoutines(data.routines, exerciseById, fail)
  const routineIds = new Set(routines.map((r) => r.id))
  const sessions = parseSessions(data.sessions, exerciseById, routineIds, fail)

  if (errors.length > 0) return { ok: false, errors }
  const parsed = { exercises, routines, sessions }
  return { ok: true, data: parsed, summary: summarize(parsed, exportedAt) }
}

function parseExercises(items: unknown[], fail: (m: string) => void): Exercise[] {
  const result: Exercise[] = []
  const names = new Set<string>()
  items.forEach((item, index) => {
    const where = `Ejercicio ${index + 1}`
    if (!isObject(item) || !isId(item.id)) return fail(`${where}: falta el identificador.`)
    if (result.some((e) => e.id === item.id)) return fail(`${where}: identificador repetido.`)
    // Targets are optional: backups exported before schema v2 don't have them.
    const checked = validateExercise({
      name: item.name,
      kind: item.kind,
      defaultUnit: item.defaultUnit,
      notes: item.notes,
      targetWeight: item.targetWeight,
      targetSets: item.targetSets,
      targetReps: item.targetReps,
    })
    if (!checked.ok) return fail(`${where}: ${Object.values(checked.errors)[0]}`)
    if (names.has(nameKey(checked.value.name))) return fail(`${where}: nombre repetido («${checked.value.name}»).`)
    const targetUpdatedAt = item.targetUpdatedAt ?? null
    if (
      !isOptionalIsoDate(item.archivedAt) ||
      !isIsoDate(item.createdAt) ||
      !isIsoDate(item.updatedAt) ||
      !isOptionalIsoDate(targetUpdatedAt)
    ) {
      return fail(`${where}: fechas inválidas.`)
    }
    names.add(nameKey(checked.value.name))
    result.push({
      id: item.id,
      ...checked.value,
      targetUpdatedAt,
      archivedAt: item.archivedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  })
  return result
}

function parseRoutines(items: unknown[], exercises: Map<string, Exercise>, fail: (m: string) => void): Routine[] {
  const result: Routine[] = []
  const names = new Set<string>()
  items.forEach((item, index) => {
    const where = `Rutina ${index + 1}`
    if (!isObject(item) || !isId(item.id)) return fail(`${where}: falta el identificador.`)
    if (result.some((r) => r.id === item.id)) return fail(`${where}: identificador repetido.`)
    const checked = validateRoutine({ name: item.name, exerciseIds: item.exerciseIds })
    if (!checked.ok) return fail(`${where}: ${Object.values(checked.errors)[0]}`)
    if (names.has(nameKey(checked.value.name))) return fail(`${where}: nombre repetido («${checked.value.name}»).`)
    if (checked.value.exerciseIds.some((id) => !exercises.has(id))) return fail(`${where}: usa un ejercicio que no existe.`)
    if (!isOptionalIsoDate(item.archivedAt) || !isIsoDate(item.createdAt) || !isIsoDate(item.updatedAt)) {
      return fail(`${where}: fechas inválidas.`)
    }
    names.add(nameKey(checked.value.name))
    result.push({
      id: item.id,
      ...checked.value,
      archivedAt: item.archivedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  })
  return result
}

function parseSessions(
  items: unknown[],
  exercises: Map<string, Exercise>,
  routineIds: Set<string>,
  fail: (m: string) => void,
): WorkoutSession[] {
  const result: WorkoutSession[] = []
  const setIds = new Set<string>()
  let inProgress = 0

  items.forEach((item, index) => {
    const where = `Entrenamiento ${index + 1}`
    if (!isObject(item) || !isId(item.id)) return fail(`${where}: falta el identificador.`)
    if (result.some((s) => s.id === item.id)) return fail(`${where}: identificador repetido.`)
    if (item.routineId !== null && !(isId(item.routineId) && routineIds.has(item.routineId))) {
      return fail(`${where}: usa una rutina que no existe.`)
    }
    if (!isIsoDate(item.startedAt) || !isOptionalIsoDate(item.finishedAt)) return fail(`${where}: fechas inválidas.`)
    if (item.finishedAt !== null && Date.parse(item.finishedAt) < Date.parse(item.startedAt)) {
      return fail(`${where}: termina antes de empezar.`)
    }
    if (item.finishedAt === null && ++inProgress > 1) return fail(`${where}: hay más de un entrenamiento en curso.`)
    if (!Array.isArray(item.exercises)) return fail(`${where}: lista de ejercicios inválida.`)

    const entries: SessionExercise[] = []
    for (const [position, rawEntry] of item.exercises.entries()) {
      const at = `${where}, ejercicio ${position + 1}`
      if (!isObject(rawEntry) || !isId(rawEntry.exerciseId)) return fail(`${at}: falta el ejercicio.`)
      const exercise = exercises.get(rawEntry.exerciseId)
      if (!exercise) return fail(`${at}: usa un ejercicio que no existe.`)
      if (entries.some((e) => e.exerciseId === exercise.id)) return fail(`${at}: ejercicio repetido.`)
      if (typeof rawEntry.notes !== 'string' || rawEntry.notes.length > SESSION_NOTES_MAX_LENGTH) {
        return fail(`${at}: nota inválida.`)
      }
      if (!Array.isArray(rawEntry.sets)) return fail(`${at}: lista de series inválida.`)

      const sets: WorkoutSet[] = []
      for (const [n, rawSet] of rawEntry.sets.entries()) {
        const setAt = `${at}, serie ${n + 1}`
        if (!isObject(rawSet) || !isId(rawSet.id) || setIds.has(rawSet.id)) return fail(`${setAt}: identificador inválido o repetido.`)
        if (!isIsoDate(rawSet.completedAt)) return fail(`${setAt}: fecha inválida.`)
        const weight = rawSet.weight
        if (weight !== null && !(isObject(weight) && (weight.unit === 'kg' || weight.unit === 'lb'))) {
          return fail(`${setAt}: peso inválido.`)
        }
        const checked = validateSet(
          {
            weight: weight === null ? null : (weight.value as number),
            unit: weight === null ? exercise.defaultUnit : (weight.unit as 'kg' | 'lb'),
            reps: rawSet.reps as number | null,
            rpe: (rawSet.rpe ?? null) as number | null,
          },
          exercise.kind,
        )
        if (!checked.ok) return fail(`${setAt}: ${Object.values(checked.errors)[0]}`)
        setIds.add(rawSet.id)
        sets.push({ id: rawSet.id, ...checked.value, completedAt: rawSet.completedAt })
      }
      entries.push({ exerciseId: exercise.id, notes: rawEntry.notes, sets })
    }

    result.push(
      withDerivedExerciseIds({
        id: item.id,
        routineId: item.routineId,
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
        exercises: entries,
        exerciseIds: [],
      }),
    )
  })
  return result
}
