import { describe, expect, it } from 'vitest'
import { deal, elapsedMs, formatTime, pairsFound, reducer, type Face, type GameState } from './engine'

const faces: Face[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x) => ({ pairId: x, label: x.toUpperCase(), altText: x }))

function indexesOf(s: GameState, pairId: string): number[] {
  return s.tiles.flatMap((t, i) => (t.pairId === pairId ? [i] : []))
}
function otherPair(s: GameState, pairId: string): string {
  return s.tiles.find((t) => t.pairId !== pairId)!.pairId
}

describe('deal', () => {
  it('puts exactly two of each chosen card on the board', () => {
    const s = deal(faces, 6, 42)
    expect(s.tiles).toHaveLength(12)
    const counts = new Map<string, number>()
    s.tiles.forEach((t) => counts.set(t.pairId, (counts.get(t.pairId) ?? 0) + 1))
    expect([...counts.values()].every((n) => n === 2)).toBe(true)
    expect(new Set(s.tiles.map((t) => t.key)).size).toBe(12)
  })

  it('is reproducible from its seed and differs across seeds', () => {
    const order = (seed: number) => deal(faces, 6, seed).tiles.map((t) => t.key).join()
    expect(order(7)).toBe(order(7))
    expect(order(7)).not.toBe(order(8))
  })

  it('caps pairs at the size of the set', () => {
    expect(deal(faces.slice(0, 3), 10, 1).tiles).toHaveLength(6)
  })

  it('rejects a set with fewer than 2 cards', () => {
    expect(() => deal(faces.slice(0, 1), 6, 1)).toThrow()
  })
})

describe('playing', () => {
  it('matches a pair, counts one move, and credits the player', () => {
    let s = deal(faces, 4, 3)
    const [i, j] = indexesOf(s, s.tiles[0].pairId)
    s = reducer(s, { type: 'flip', index: i, now: 1000 })
    expect(s.last?.kind).toBe('flip')
    s = reducer(s, { type: 'flip', index: j, now: 2000 })
    expect(s.last?.kind).toBe('match')
    expect(s.moves).toBe(1)
    expect(s.tiles[i].matched && s.tiles[j].matched).toBe(true)
    expect(s.players[0].pairs).toBe(1)
    expect(s.open).toEqual([])
  })

  it('leaves a miss face up until hidden, then turns both back', () => {
    let s = deal(faces, 4, 3)
    const a = s.tiles[0].pairId
    const i = indexesOf(s, a)[0]
    const k = indexesOf(s, otherPair(s, a))[0]
    s = reducer(s, { type: 'flip', index: i, now: 0 })
    s = reducer(s, { type: 'flip', index: k, now: 0 })
    expect(s.last?.kind).toBe('miss')
    expect(s.tiles[i].faceUp && s.tiles[k].faceUp).toBe(true)
    s = reducer(s, { type: 'hide' })
    expect(s.tiles[i].faceUp || s.tiles[k].faceUp).toBe(false)
  })

  it('a third tap during a miss hides the miss and flips the new card', () => {
    let s = deal(faces, 4, 3)
    const a = s.tiles[0].pairId
    const i = indexesOf(s, a)[0]
    const b = otherPair(s, a)
    const k = indexesOf(s, b)[0]
    s = reducer(s, { type: 'flip', index: i, now: 0 })
    s = reducer(s, { type: 'flip', index: k, now: 0 })
    const third = s.tiles.findIndex((_t, n) => n !== i && n !== k)
    s = reducer(s, { type: 'flip', index: third, now: 0 })
    expect(s.open).toEqual([third])
    expect(s.tiles[i].faceUp).toBe(false)
  })

  it('ignores taps on face-up or matched cards', () => {
    let s = deal(faces, 4, 3)
    s = reducer(s, { type: 'flip', index: 0, now: 0 })
    expect(reducer(s, { type: 'flip', index: 0, now: 0 })).toBe(s)
  })

  it('finishes when the board is cleared and stops the clock', () => {
    let s = deal(faces, 3, 9)
    let t = 0
    for (const id of [...new Set(s.tiles.map((x) => x.pairId))]) {
      for (const i of indexesOf(s, id)) s = reducer(s, { type: 'flip', index: i, now: (t += 1000) })
    }
    expect(s.last?.kind).toBe('won')
    expect(pairsFound(s)).toBe(3)
    expect(s.moves).toBe(3)
    expect(elapsedMs(s, 999_999)).toBe(5000)
    expect(reducer(s, { type: 'flip', index: 0, now: 0 })).toBe(s)
  })

  it('passes the turn after a miss when there are several players', () => {
    let s = deal(faces, 4, 3, ['Ana', 'Ben'])
    const a = s.tiles[0].pairId
    s = reducer(s, { type: 'flip', index: indexesOf(s, a)[0], now: 0 })
    s = reducer(s, { type: 'flip', index: indexesOf(s, otherPair(s, a))[0], now: 0 })
    s = reducer(s, { type: 'hide' })
    expect(s.current).toBe(1)
  })

  it('renames a player', () => {
    const s = reducer(deal(faces, 2, 1), { type: 'rename', player: 0, name: 'Sam' })
    expect(s.players[0].name).toBe('Sam')
  })
})

describe('elapsedMs', () => {
  it('never goes negative when the clock lags the first flip', () => {
    const s = reducer(deal(faces, 2, 1), { type: 'flip', index: 0, now: 5000 })
    expect(elapsedMs(s, 4000)).toBe(0)
  })
})

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65_400)).toBe('1:05')
  })
})
