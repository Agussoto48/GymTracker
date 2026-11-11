import { useRef, useState } from 'react'
import { parseBackup, type BackupData, type BackupSummary } from '../../../domain/backup.ts'
import {
  createBackup,
  getLastExportAt,
  replaceAllData,
  setLastExportAt,
  useCurrentDataSummary,
} from '../../../data/backup.ts'
import { useActiveSession } from '../../../data/sessions.ts'
import { saveTextFile } from '../../../shared/lib/files.ts'
import { formatShortDate } from '../../../shared/lib/format.ts'
import { useNow } from '../../../shared/lib/useNow.ts'
import { Section } from '../../../shared/ui/Section.tsx'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import styles from './BackupSection.module.css'

const MAX_FILE_BYTES = 20 * 1024 * 1024
const REMIND_AFTER_DAYS = 7

type ImportState =
  | { step: 'idle' }
  | { step: 'invalid'; errors: string[] }
  | { step: 'confirm'; data: BackupData; summary: BackupSummary }
  | { step: 'importing'; data: BackupData; summary: BackupSummary }

function describe(summary: BackupSummary): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return [
    plural(summary.exercises, 'ejercicio', 'ejercicios'),
    plural(summary.routines, 'rutina', 'rutinas'),
    plural(summary.sessions, 'entrenamiento', 'entrenamientos'),
    plural(summary.sets, 'serie', 'series'),
  ].join(', ')
}

export function BackupSection() {
  const current = useCurrentDataSummary()
  const now = useNow(60_000)
  const activeSession = useActiveSession()
  const fileInput = useRef<HTMLInputElement>(null)
  const [lastExportAt, setLastExport] = useState(getLastExportAt)
  const [status, setStatus] = useState<string | null>(null)
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' })

  const hasData = current !== undefined && current.exercises + current.routines + current.sessions > 0
  const stale =
    hasData && (lastExportAt === null || now - Date.parse(lastExportAt) > REMIND_AFTER_DAYS * 86_400_000)

  async function exportData() {
    setStatus(null)
    try {
      const backup = await createBackup()
      const day = backup.exportedAt.slice(0, 10)
      const result = await saveTextFile(`gymtracker-respaldo-${day}.json`, JSON.stringify(backup, null, 2))
      if (result === 'cancelled') return
      setLastExportAt(backup.exportedAt)
      setLastExport(backup.exportedAt)
      setStatus('Respaldo exportado. Guárdalo fuera de la app (Archivos o iCloud Drive).')
    } catch {
      setStatus('No se pudo exportar. Intenta de nuevo.')
    }
  }

  async function readFile(file: File) {
    setStatus(null)
    if (file.size > MAX_FILE_BYTES) {
      setImportState({ step: 'invalid', errors: ['El archivo es demasiado grande para ser un respaldo.'] })
      return
    }
    const parsed = parseBackup(await file.text())
    setImportState(parsed.ok ? { step: 'confirm', data: parsed.data, summary: parsed.summary } : { step: 'invalid', errors: parsed.errors })
  }

  async function confirmImport() {
    if (importState.step !== 'confirm') return
    setImportState({ ...importState, step: 'importing' })
    try {
      await replaceAllData(importState.data)
      setImportState({ step: 'idle' })
      setStatus(`Respaldo importado: ${describe(importState.summary)}.`)
    } catch {
      setImportState({ step: 'idle' })
      setStatus('No se pudo importar. Tus datos no cambiaron.')
    }
  }

  const closeImport = () => setImportState({ step: 'idle' })

  return (
    <Section title="Tus datos">
      <div className={styles.card}>
        <p className={styles.text}>
          Tus entrenamientos se guardan solo en este dispositivo. Exporta un respaldo de vez en cuando y guárdalo
          fuera de la app.
        </p>
        <p className={stale ? styles.warning : styles.meta}>
          {lastExportAt ? `Último respaldo: ${formatShortDate(lastExportAt)}.` : 'Aún no has exportado un respaldo.'}
          {stale && ' Te recomendamos exportar uno ahora.'}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => void exportData()} disabled={!hasData}>
            Exportar respaldo
          </button>
          <button type="button" className={styles.secondary} onClick={() => fileInput.current?.click()}>
            Importar respaldo
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void readFile(file)
          }}
        />
        {status && (
          <p role="status" className={styles.meta}>
            {status}
          </p>
        )}
      </div>

      {importState.step === 'invalid' && (
        <Sheet title="Respaldo no válido" closeLabel="Cerrar" onClose={closeImport}>
          <p className={styles.text}>No se importó nada. Problemas encontrados:</p>
          <ul className={styles.errors}>
            {importState.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Sheet>
      )}

      {(importState.step === 'confirm' || importState.step === 'importing') && (
        <Sheet title="Importar respaldo" onClose={closeImport}>
          <div className={styles.confirm}>
            <p className={styles.text}>
              Respaldo del <strong>{formatShortDate(importState.summary.exportedAt)}</strong>:{' '}
              {describe(importState.summary)}.
            </p>
            {hasData && current && (
              <p className={styles.warning}>
                Reemplazará todo lo que hay ahora en la app ({describe(current)})
                {activeSession ? ', incluido el entrenamiento en curso' : ''}. Esta acción no se puede deshacer.
              </p>
            )}
            {hasData && (
              <button type="button" className={styles.secondary} onClick={() => void exportData()}>
                Exportar mis datos actuales primero
              </button>
            )}
            <button
              type="button"
              className={styles.danger}
              disabled={importState.step === 'importing'}
              onClick={() => void confirmImport()}
            >
              {importState.step === 'importing' ? 'Importando…' : hasData ? 'Reemplazar mis datos' : 'Importar'}
            </button>
            {status && (
              <p role="status" className={styles.meta}>
                {status}
              </p>
            )}
          </div>
        </Sheet>
      )}
    </Section>
  )
}
