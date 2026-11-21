import { useState } from 'react'
import type { DeleteBlocker } from '../../../domain/exercise.ts'
import type { Exercise } from '../../../domain/types.ts'
import { deleteExercises, previewExerciseDeletion, setExercisesArchived } from '../../../data/exercises.ts'
import { count, quoted } from '../../../shared/lib/format.ts'
import { AlertDialog } from '../../../shared/ui/AlertDialog.tsx'
import { SelectionBar } from '../../../shared/ui/SelectionBar.tsx'
import { useConfirm } from '../../../shared/ui/useConfirm.tsx'
import { useToast } from '../../../shared/ui/useToast.ts'

type Alert = { title: string; message: string }

/**
 * Archivar (or Restaurar, when every selected one is archived) and Eliminar for the selected
 * exercises: one confirmation and one write for all of them, then back to the normal list.
 */
export function ExerciseSelectionBar({ selected, onDone }: { selected: readonly Exercise[]; onDone: () => void }) {
  const [confirm, confirmSheet] = useConfirm()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<Alert | null>(null)

  const active = selected.filter((e) => e.archivedAt === null)
  const restoring = selected.length > 0 && active.length === 0

  async function run(action: () => Promise<string>, failure: string) {
    setBusy(true)
    try {
      toast(await action())
      onDone()
    } catch {
      setAlert({ title: failure, message: 'Intenta de nuevo.' })
    } finally {
      setBusy(false)
    }
  }

  async function archiveOrRestore() {
    const targets = restoring ? selected : active
    const one = targets.length === 1 ? targets[0] : null
    const confirmed = await confirm(
      restoring
        ? {
            title: one ? `¿Restaurar «${one.name}»?` : `¿Restaurar ${count(targets.length, 'ejercicio', 'ejercicios')}?`,
            message: one
              ? 'Volverá al catálogo y a las rutinas que lo incluyen.'
              : 'Volverán al catálogo y a las rutinas que los incluyen.',
            confirmLabel: one ? 'Restaurar ejercicio' : `Restaurar ${count(targets.length, 'ejercicio', 'ejercicios')}`,
          }
        : {
            title: one ? `¿Archivar «${one.name}»?` : `¿Archivar ${count(targets.length, 'ejercicio', 'ejercicios')}?`,
            message: one
              ? 'Pasará a Archivados y no aparecerá al entrenar. Su historial se conserva.'
              : 'Pasarán a Archivados y no aparecerán al entrenar. Su historial se conserva.',
            confirmLabel: one ? 'Archivar ejercicio' : `Archivar ${count(targets.length, 'ejercicio', 'ejercicios')}`,
          },
    )
    if (!confirmed) return
    await run(async () => {
      await setExercisesArchived(
        targets.map((e) => e.id),
        !restoring,
      )
      const verb = restoring ? 'restaurado' : 'archivado'
      return one ? `Ejercicio «${one.name}» ${verb}` : `${count(targets.length, 'ejercicio', 'ejercicios')} ${verb}s`
    }, restoring ? 'No se pudieron restaurar' : 'No se pudieron archivar')
  }

  async function remove() {
    const ids = selected.map((e) => e.id)
    let preview
    try {
      preview = await previewExerciseDeletion(ids)
    } catch {
      setAlert({ title: 'No se pudieron eliminar', message: 'Intenta de nuevo.' })
      return
    }
    const skippedLines = preview.skipped.map(({ exercise, blocker }) => `«${exercise.name}» ${skipReason(blocker)}`)
    if (preview.deletable.length === 0) {
      setAlert({
        title: selected.length === 1 ? 'No se puede eliminar' : 'No se pueden eliminar',
        message: skippedLines.join(' '),
      })
      return
    }

    const n = preview.deletable.length
    const one = n === 1 ? preview.deletable[0] : null
    const parts: string[] = []
    const routines = preview.routineNames
    if (routines.length > 0) {
      parts.push(`Se ${one ? 'quitará' : 'quitarán'} de ${routines.length === 1 ? 'la rutina' : 'las rutinas'} ${quoted(routines)}.`)
    }
    if (preview.usedCount > 0) {
      parts.push(`Tu historial ${one ? 'lo' : 'los'} seguirá mostrando, pero ya no verás su progreso.`)
    }
    parts.push(...skippedLines, 'No se puede deshacer.')
    const confirmed = await confirm({
      title: one ? `¿Eliminar «${one.name}»?` : `¿Eliminar ${count(n, 'ejercicio', 'ejercicios')}?`,
      message: parts.join(' '),
      confirmLabel: one ? 'Eliminar ejercicio' : `Eliminar ${count(n, 'ejercicio', 'ejercicios')}`,
      destructive: true,
    })
    if (!confirmed) return
    await run(async () => {
      const deleted = await deleteExercises(preview.deletable.map((e) => e.id))
      return deleted === 1 && one ? `Ejercicio «${one.name}» eliminado` : `${count(deleted, 'ejercicio', 'ejercicios')} eliminados`
    }, 'No se pudieron eliminar')
  }

  const none = selected.length === 0 || busy
  return (
    <>
      <SelectionBar
        label="Acciones para los ejercicios seleccionados"
        actions={[
          { label: restoring ? 'Restaurar' : 'Archivar', onClick: () => void archiveOrRestore(), disabled: none },
          { label: 'Eliminar', onClick: () => void remove(), destructive: true, disabled: none },
        ]}
      />
      {confirmSheet}
      {alert && <AlertDialog title={alert.title} message={alert.message} actionLabel="Listo" onClose={() => setAlert(null)} />}
    </>
  )
}

/** Why a selected exercise stays, as the end of a sentence that starts with its name. */
function skipReason(blocker: DeleteBlocker): string {
  return blocker.reason === 'active-workout'
    ? 'se queda: está en el entrenamiento en curso.'
    : `se queda: la rutina «${blocker.routineName}» se quedaría sin ejercicios.`
}
