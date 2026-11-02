import { describe, expect, it } from 'vitest'
import { autoShift } from './TouchKeyboard'

describe('on-screen keyboard capitals', () => {
  it('capitalises the start of each name part', () => {
    expect(autoShift('')).toBe(true)
    expect(autoShift('Anna ')).toBe(true)
    expect(autoShift('Jean-')).toBe(true)
    expect(autoShift('An')).toBe(false)
  })
})
