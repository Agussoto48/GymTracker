import { useState } from 'react'
import type { Routine } from '../../../domain/types.ts'
import { countRoutinesWorkouts, deleteRoutines, setRoutinesArchived } from '../../../data/routines.ts'
import { count } from '../../../shared/lib/format.ts'
import { AlertDialog } from '../../../shared/ui/AlertDialog.tsx'
import { SelectionBar } from '../../../shared/ui/SelectionBar.tsx'
import { useConfirm } from '../../../shared/ui/useConfirm.tsx'
import { useToast } from '../../../shared/ui/useToast.ts'

/**
 * Archivar (or Restaurar, when every selected one is archived) and Eliminar for the selected
 * routines: one confirmation and one write for all of them, then back to the normal list.
 */
export function RoutineSelectionBar({ selected, onDone }: { selected: readonly Routine[]; onDone: () => void }) {
  const [confirm, confirmSheet] = useConfirm()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const active = selected.filter((r) => r.archivedAt === null)
  const restoring = selected.length > 0 && active.length === 0

  async function run(action: () => Promise<string>, failed: string) {
    setBusy(true)
    try {
      toast(await action())
      onDone()
    } catch {
      setFailure(failed)
    } finally {
      setBusy(false)
    }
  }

  async function archiveOrRestore() {
    const targets = restoring ? selected : active
    const one = targets.length === 1 ? targets[0] : null
    const many = count(targets.length, 'rutina', 'rutinas')
    const confirmed = await confirm(
      restoring
        ? {
            title: one ? `¿Restaurar la rutina «${one.name}»?` : `¿Restaurar ${many}?`,
            message: one ? 'Volverá a aparecer en Entrenar.' : 'Volverán a aparecer en Entrenar.',
            confirmLabel: one ? 'Restaurar rutina' : `Restaurar ${many}`,
          }
        : {
            title: one ? `¿Archivar la rutina «${one.name}»?` : `¿Archivar ${many}?`,
            message: one
              ? 'Pasará a Archivadas y no aparecerá en Entrenar. Su historial se conserva.'
              : 'Pasarán a Archivadas y no aparecerán en Entrenar. Su historial se conserva.',
            confirmLabel: one ? 'Archivar rutina' : `Archivar ${many}`,
          },
    )
    if (!confirmed) return
    await run(async () => {
      await setRoutinesArchived(
        targets.map((r) => r.id),
        !restoring,
      )
      const verb = restoring ? 'restaurada' : 'archivada'
      return one ? `Rutina «${one.name}» ${verb}` : `${many} ${verb}s`
    }, restoring ? 'No se pudieron restaurar' : 'No se pudieron archivar')
  }

  async function remove() {
    const ids = selected.map((r) => r.id)
    const one = selected.length === 1 ? selected[0] : null
    const many = count(selected.length, 'rutina', 'rutinas')
    let workouts
    try {
      workouts = await countRoutinesWorkouts(ids)
    } catch {
      setFailure('No se pudieron eliminar')
      return
    }
    // Their workouts stay in history under their names (data/routines.ts › deleteRoutines).
    const kept =
      workouts === 0
        ? ' Tus ejercicios no se borran.'
        : ` ${workouts === 1 ? 'Tu entrenamiento' : 'Tus entrenamientos'} con ${one ? 'ella' : 'ellas'} ${workouts === 1 ? 'sigue' : 'siguen'} en el historial y tus ejercicios no se borran.`
    const confirmed = await confirm({
      title: one ? `¿Eliminar la rutina «${one.name}»?` : `¿Eliminar ${many}?`,
      message: `${one ? 'La rutina no se puede recuperar.' : 'Las rutinas no se pueden recuperar.'}${kept}`,
      confirmLabel: one ? 'Eliminar rutina' : `Eliminar ${many}`,
      destructive: true,
    })
    if (!confirmed) return
    await run(async () => {
      await deleteRoutines(ids)
      return one ? `Rutina «${one.name}» eliminada` : `${many} eliminadas`
    }, 'No se pudieron eliminar')
  }

  const none = selected.length === 0 || busy
  return (
    <>
      <SelectionBar
        label="Acciones para las rutinas seleccionadas"
        actions={[
          { label: restoring ? 'Restaurar' : 'Archivar', onClick: () => void archiveOrRestore(), disabled: none },
          { label: 'Eliminar', onClick: () => void remove(), destructive: true, disabled: none },
        ]}
      />
      {confirmSheet}
      {failure && <AlertDialog title={failure} message="Intenta de nuevo." actionLabel="Listo" onClose={() => setFailure(null)} />}
    </>
  )
}
