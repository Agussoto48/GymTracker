import { describe, expect, test } from 'vitest'
import { ROUTINE_MAX_EXERCISES, ROUTINE_NAME_MAX_LENGTH, moveItem, validateRoutine } from './routine.ts'

describe('validateRoutine', () => {
  test('accepts a named routine and normalizes the name', () => {
    expect(validateRoutine({ name: '  Push   día A ', exerciseIds: ['a', 'b'] })).toEqual({
      ok: true,
      value: { name: 'Push día A', exerciseIds: ['a', 'b'] },
    })
  })

  test.each([
    ['empty name', { name: ' ' }, 'name'],
    ['long name', { name: 'x'.repeat(ROUTINE_NAME_MAX_LENGTH + 1) }, 'name'],
    ['no exercises', { exerciseIds: [] }, 'exerciseIds'],
    ['repeated exercise', { exerciseIds: ['a', 'a'] }, 'exerciseIds'],
    ['non-array ids', { exerciseIds: 'a' }, 'exerciseIds'],
    ['empty id', { exerciseIds: [''] }, 'exerciseIds'],
    ['too many exercises', { exerciseIds: Array.from({ length: ROUTINE_MAX_EXERCISES + 1 }, (_, i) => `e${i}`) }, 'exerciseIds'],
  ])('rejects %s', (_label, patch, field) => {
    const result = validateRoutine({ name: 'Push', exerciseIds: ['a'], ...patch })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual([field])
  })
})

describe('moveItem', () => {
  const items = ['a', 'b', 'c', 'd']

  test('moves up and down without mutating the input', () => {
    expect(moveItem(items, 2, 1)).toEqual(['a', 'c', 'b', 'd'])
    expect(moveItem(items, 0, 1)).toEqual(['b', 'a', 'c', 'd'])
    expect(items).toEqual(['a', 'b', 'c', 'd'])
  })

  test('clamps targets and ignores invalid sources', () => {
    expect(moveItem(items, 0, -1)).toEqual(items)
    expect(moveItem(items, 3, 10)).toEqual(items)
    expect(moveItem(items, 9, 0)).toEqual(items)
  })
})
