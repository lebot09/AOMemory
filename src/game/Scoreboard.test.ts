import { describe, expect, it } from 'vitest'
import { winnerText, winners } from './Scoreboard'

describe('winners', () => {
  it('names a single winner', () => {
    expect(winnerText([{ name: 'Ana', pairs: 4 }, { name: 'Ben', pairs: 2 }])).toBe('Ana wins!')
  })
  it('handles shared wins and full ties', () => {
    const p = [{ name: 'Ana', pairs: 3 }, { name: 'Ben', pairs: 3 }, { name: 'Cy', pairs: 0 }]
    expect(winners(p)).toHaveLength(2)
    expect(winnerText(p)).toBe('Ana and Ben tie for the win!')
    expect(winnerText([{ name: 'A', pairs: 2 }, { name: 'B', pairs: 2 }])).toBe("It's a tie!")
  })
})
