import { useLiveQuery } from 'dexie-react-hooks'
import { createBackupFile, summarize, type BackupData, type BackupFile, type BackupSummary } from '../domain/backup.ts'
import { db } from './db.ts'

const LAST_EXPORT_KEY = 'gymtracker.lastExportAt'

export async function readAllData(): Promise<BackupData> {
  return db.transaction('r', db.exercises, db.routines, db.sessions, async () => ({
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    sessions: await db.sessions.toArray(),
  }))
}

export async function createBackup(): Promise<BackupFile> {
  return createBackupFile(await readAllData(), new Date().toISOString())
}

/**
 * Replaces everything with an already validated backup (see parseBackup).
 * One transaction: if any write fails, nothing changes.
 */
export async function replaceAllData(data: BackupData): Promise<void> {
  await db.transaction('rw', db.exercises, db.routines, db.sessions, async () => {
    await Promise.all([db.exercises.clear(), db.routines.clear(), db.sessions.clear()])
    await db.exercises.bulkAdd(data.exercises)
    await db.routines.bulkAdd(data.routines)
    await db.sessions.bulkAdd(data.sessions)
  })
}

/** Counts of what is stored now, to warn before replacing it. */
export function useCurrentDataSummary(): BackupSummary | undefined {
  return useLiveQuery(async () => summarize(await readAllData(), new Date().toISOString()))
}

// The last export date is only a reminder, so localStorage is enough (not workout data).
export function getLastExportAt(): string | null {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY)
  } catch {
    return null
  }
}

export function setLastExportAt(iso: string): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, iso)
  } catch {
    // Storage unavailable: the reminder is optional.
  }
}
