import { expect, test } from 'vitest'
import { uuidV4FromRandomValues } from './ids.ts'

test('fallback generates unique RFC 4122 v4 UUIDs', () => {
  const ids = Array.from({ length: 200 }, uuidV4FromRandomValues)
  for (const id of ids) {
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  }
  expect(new Set(ids).size).toBe(ids.length)
})
