import { describe, expect, it } from 'vitest'
import { addScore, BOARD_SIZE, dayKey, rank, type Score } from './local'

const s = (name: string, ms: number, moves = 10, at = 0): Score => ({ id: name, name, ms, moves, pairs: 6, at })

describe('leaderboard', () => {
  it('ranks by time, then moves', () => {
    expect(rank([s('a', 30_000), s('b', 20_000, 12), s('c', 20_000, 9)]).map((x) => x.name)).toEqual(['c', 'b', 'a'])
  })
  it('reports the new position and keeps the top 10', () => {
    const full = Array.from({ length: BOARD_SIZE }, (_, i) => s(`p${i}`, 10_000 + i * 1000))
    const fast = addScore(full, s('fast', 5_000))
    expect(fast.position).toBe(1)
    expect(fast.scores).toHaveLength(BOARD_SIZE)
    expect(addScore(full, s('slow', 99_000)).position).toBeNull()
  })
  it('keys scores by local day', () => {
    expect(dayKey(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02')
  })
})
