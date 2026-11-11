import { Dexie, type EntityTable } from 'dexie'
import type { Exercise, Routine, WorkoutSession } from '../domain/types.ts'

// Only this folder may import Dexie (ADR-0002). Schema changes need a new version + upgrade (ADR-0003).
export class GymTrackerDb extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>

  constructor() {
    super('gymtracker')
    this.version(1).stores({
      exercises: 'id, name',
      routines: 'id, name',
      sessions: 'id, startedAt, *exerciseIds',
    })
  }
}

export const db = new GymTrackerDb()
