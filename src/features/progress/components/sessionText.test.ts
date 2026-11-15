import { expect, test } from 'vitest'
import { sessionMeta, sessionName } from './sessionText.ts'

test('sessionName: routine name, a deleted routine\'s kept name, or free workout', () => {
  const names = new Map([['r1', 'Push']])
  expect(sessionName({ routineId: 'r1', routineName: null }, names)).toBe('Push')
  expect(sessionName({ routineId: null, routineName: 'Pierna' }, names)).toBe('Pierna')
  expect(sessionName({ routineId: null, routineName: null }, names)).toBe('Entrenamiento libre')
  expect(sessionName({ routineId: 'gone', routineName: null }, names)).toBe('Rutina')
})

test('sessionMeta lists exercises, sets and duration', () => {
  expect(sessionMeta({ exerciseCount: 4, setCount: 16, durationMinutes: 54 })).toBe('4 ejercicios · 16 series · 54 min')
  expect(sessionMeta({ exerciseCount: 1, setCount: 1, durationMinutes: 65 })).toBe('1 ejercicio · 1 serie · 1 h 5 min')
})

test('sessionMeta never shows "0 min" and flags a workout without sets', () => {
  expect(sessionMeta({ exerciseCount: 1, setCount: 2, durationMinutes: 0 })).toBe('1 ejercicio · 2 series')
  expect(sessionMeta({ exerciseCount: 1, setCount: 2, durationMinutes: null })).toBe('1 ejercicio · 2 series')
  expect(sessionMeta({ exerciseCount: 0, setCount: 0, durationMinutes: 3 })).toBe('Sin series')
})
