import { useState } from 'react'
import { getLastExportAt, setLastExportAt, useCurrentDataSummary } from '../../../data/backup.ts'
import { useNow } from '../../../shared/lib/useNow.ts'

const REMIND_AFTER_DAYS = 7

/** What is stored and when it was last exported; `stale` means it is time to remind the user. */
export function useBackupStatus() {
  const current = useCurrentDataSummary()
  const now = useNow(60_000)
  const [lastExportAt, setLastExport] = useState(getLastExportAt)

  const hasData = current !== undefined && current.exercises + current.routines + current.sessions > 0
  const stale =
    hasData && (lastExportAt === null || now - Date.parse(lastExportAt) > REMIND_AFTER_DAYS * 86_400_000)

  function markExported(iso: string) {
    setLastExportAt(iso)
    setLastExport(iso)
  }

  return { current, hasData, lastExportAt, stale, markExported }
}

export type BackupStatus = ReturnType<typeof useBackupStatus>
