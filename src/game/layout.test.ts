import { describe, expect, it } from 'vitest'
import { bestGrid } from './layout'

describe('bestGrid', () => {
  it('uses a wide grid on a landscape booth screen', () => {
    const g = bestGrid(20, 1920, 1000, 16)
    expect(g.cols).toBeGreaterThan(g.rows)
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(20)
  })
  it('uses a tall grid on a portrait phone', () => {
    const g = bestGrid(12, 360, 640, 8)
    expect(g.rows).toBeGreaterThan(g.cols)
  })
  it('keeps cards at least touch-sized on a phone with the hard board', () => {
    expect(bestGrid(30, 360, 600, 6).cardWidth).toBeGreaterThanOrEqual(48)
  })
})
