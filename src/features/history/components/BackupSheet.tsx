import { useRef, useState } from 'react'
import { parseBackup, type BackupData, type BackupSummary } from '../../../domain/backup.ts'
import { createBackup, replaceAllData } from '../../../data/backup.ts'
import { useActiveSession } from '../../../data/sessions.ts'
import { saveTextFile } from '../../../shared/lib/files.ts'
import { formatShortDate, formatTime } from '../../../shared/lib/format.ts'
import { Sheet } from '../../../shared/ui/Sheet.tsx'
import type { BackupStatus } from '../hooks/useBackupStatus.ts'
import styles from './BackupSheet.module.css'

const MAX_FILE_BYTES = 20 * 1024 * 1024

/** Views inside the one sheet: the main screen, or a step of an import. */
type View =
  | { step: 'main' }
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

type BackupSheetProps = {
  status: BackupStatus
  onClose: () => void
}

/** Export and import of all data (Historial › Respaldo). */
export function BackupSheet({ status: backup, onClose }: BackupSheetProps) {
  const { current, hasData, lastExportAt, stale, markExported } = backup
  const activeSession = useActiveSession()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [view, setView] = useState<View>({ step: 'main' })

  async function exportData() {
    setMessage(null)
    try {
      const file = await createBackup()
      const day = file.exportedAt.slice(0, 10)
      const result = await saveTextFile(`gymtracker-respaldo-${day}.json`, JSON.stringify(file, null, 2))
      if (result === 'cancelled') return
      markExported(file.exportedAt)
      setMessage('Respaldo exportado. Guárdalo fuera de la app (Archivos o iCloud Drive).')
    } catch {
      setMessage('No se pudo exportar. Intenta de nuevo.')
    }
  }

  async function readFile(file: File) {
    setMessage(null)
    if (file.size > MAX_FILE_BYTES) {
      setView({ step: 'invalid', errors: ['El archivo es demasiado grande para ser un respaldo.'] })
      return
    }
    const parsed = parseBackup(await file.text())
    setView(parsed.ok ? { step: 'confirm', data: parsed.data, summary: parsed.summary } : { step: 'invalid', errors: parsed.errors })
  }

  async function confirmImport() {
    if (view.step !== 'confirm') return
    setView({ ...view, step: 'importing' })
    try {
      await replaceAllData(view.data)
      setMessage(`Respaldo importado: ${describe(view.summary)}.`)
    } catch {
      setMessage('No se pudo importar. Tus datos no cambiaron.')
    }
    setView({ step: 'main' })
  }

  const back = () => setView({ step: 'main' })
  const title = view.step === 'main' ? 'Respaldo' : view.step === 'invalid' ? 'Respaldo no válido' : 'Importar respaldo'

  return (
    <Sheet
      title={title}
      closeLabel={view.step === 'main' ? 'Cerrar' : '‹ Atrás'}
      onClose={view.step === 'main' ? onClose : back}
      viewKey={view.step}
    >
      {view.step === 'main' && (
        <div className={styles.view}>
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
            {message && (
              <p role="status" className={styles.meta}>
                {message}
              </p>
            )}
          </div>
          <p className={`${styles.version} figures`}>
            Versión del {formatShortDate(__APP_BUILD_TIME__)}, {formatTime(__APP_BUILD_TIME__)}
          </p>
        </div>
      )}

      {view.step === 'invalid' && (
        <div className={styles.view}>
          <p className={styles.text}>No se importó nada. Problemas encontrados:</p>
          <ul className={styles.errors}>
            {view.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {(view.step === 'confirm' || view.step === 'importing') && (
        <div className={styles.view}>
          <p className={styles.text}>
            Respaldo del <strong>{formatShortDate(view.summary.exportedAt)}</strong>: {describe(view.summary)}.
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
            disabled={view.step === 'importing'}
            onClick={() => void confirmImport()}
          >
            {view.step === 'importing' ? 'Importando…' : hasData ? 'Reemplazar mis datos' : 'Importar'}
          </button>
          {message && (
            <p role="status" className={styles.meta}>
              {message}
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}
