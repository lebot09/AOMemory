/**
 * Memory game rules as a pure reducer, so the same logic drives solo, booth and
 * (in step 4) multiplayer games, and can be unit-tested without a browser.
 */

export type Face = {
  /** Same for both cards of a pair. */
  pairId: string
  label: string
  altText: string
  imageUrl?: string
}

export type Tile = Face & {
  /** Position-independent id for React keys. */
  key: string
  faceUp: boolean
  matched: boolean
}

export type Player = { name: string; pairs: number }

export type GameState = {
  tiles: Tile[]
  /** Indexes of face-up, not yet resolved tiles (0, 1 or 2). */
  open: number[]
  moves: number
  players: Player[]
  current: number
  startedAt: number | null
  finishedAt: number | null
  /** Last thing that happened, for feedback and screen reader announcements. */
  last: { kind: 'flip' | 'match' | 'miss' | 'won'; tiles: number[] } | null
}

export type Action =
  | { type: 'flip'; index: number; now: number }
  | { type: 'hide' }
  | { type: 'rename'; player: number; name: string }

/** Small seeded PRNG (mulberry32) so a deal can be reproduced from its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick `pairs` faces at random, double them, and shuffle onto the board. */
export function deal(faces: readonly Face[], pairs: number, seed: number, playerNames: string[] = ['Player 1']): GameState {
  if (faces.length < 2) throw new Error('A card set needs at least 2 cards')
  const random = rng(seed)
  const chosen = shuffle(faces, random).slice(0, Math.min(pairs, faces.length))
  const tiles = shuffle(
    chosen.flatMap((f) => [
      { ...f, key: `${f.pairId}-a`, faceUp: false, matched: false },
      { ...f, key: `${f.pairId}-b`, faceUp: false, matched: false },
    ]),
    random,
  )
  return {
    tiles,
    open: [],
    moves: 0,
    players: playerNames.map((name) => ({ name, pairs: 0 })),
    current: 0,
    startedAt: null,
    finishedAt: null,
    last: null,
  }
}

export function isFinished(s: GameState): boolean {
  return s.finishedAt !== null
}

export function pairsTotal(s: GameState): number {
  return s.tiles.length / 2
}

export function pairsFound(s: GameState): number {
  return s.tiles.filter((t) => t.matched).length / 2
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'rename': {
      const players = s.players.map((p, i) => (i === a.player ? { ...p, name: a.name } : p))
      return { ...s, players }
    }

    case 'hide': {
      if (s.open.length !== 2) return s
      const tiles = s.tiles.map((t, i) => (s.open.includes(i) && !t.matched ? { ...t, faceUp: false } : t))
      // Turn passes to the next player after a miss (no-op for one player).
      return { ...s, tiles, open: [], current: (s.current + 1) % s.players.length, last: null }
    }

    case 'flip': {
      const tile = s.tiles[a.index]
      if (!tile || tile.faceUp || tile.matched || isFinished(s)) return s
      // A third tap while a miss is showing hides the miss first, so play never feels blocked.
      if (s.open.length === 2) s = reducer(s, { type: 'hide' })

      const tiles = s.tiles.map((t, i) => (i === a.index ? { ...t, faceUp: true } : t))
      const startedAt = s.startedAt ?? a.now
      const open = [...s.open, a.index]

      if (open.length === 1) {
        return { ...s, tiles, open, startedAt, last: { kind: 'flip', tiles: open } }
      }

      const moves = s.moves + 1
      const [i, j] = open
      if (tiles[i].pairId === tiles[j].pairId) {
        tiles[i] = { ...tiles[i], matched: true }
        tiles[j] = { ...tiles[j], matched: true }
        const players = s.players.map((p, k) => (k === s.current ? { ...p, pairs: p.pairs + 1 } : p))
        const won = tiles.every((t) => t.matched)
        return {
          ...s, tiles, players, moves, startedAt, open: [],
          finishedAt: won ? a.now : null,
          last: { kind: won ? 'won' : 'match', tiles: open },
        }
      }
      return { ...s, tiles, open, moves, startedAt, last: { kind: 'miss', tiles: open } }
    }
  }
}

export function elapsedMs(s: GameState, now: number): number {
  if (s.startedAt === null) return 0
  return Math.max(0, (s.finishedAt ?? now) - s.startedAt)
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTY_PAIRS: Record<Difficulty, number> = { easy: 6, medium: 10, hard: 15 }
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
