/**
 * "Today's best times" for the booth. Kept only in this device's browser storage,
 * only for the current day; older days are deleted automatically. No personal data
 * beyond the display name a visitor chose to type.
 */
export type Score = { name: string; ms: number; moves: number; pairs: number; at: number }

const PREFIX = 'ao-memory:booth-scores:'
export const BOARD_SIZE = 10

export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Fastest first; fewer moves breaks ties. */
export function rank(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => a.ms - b.ms || a.moves - b.moves || a.at - b.at)
}

export function addScore(scores: Score[], s: Score): { scores: Score[]; position: number | null } {
  const ranked = rank([...scores, s]).slice(0, BOARD_SIZE)
  const i = ranked.indexOf(s)
  return { scores: ranked, position: i === -1 ? null : i + 1 }
}

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export function loadScores(pairs: number, day = dayKey()): Score[] {
  const ls = storage()
  if (!ls) return []
  try {
    // Drop scores from earlier days.
    for (let i = ls.length - 1; i >= 0; i--) {
      const k = ls.key(i)
      if (k?.startsWith(PREFIX) && !k.startsWith(PREFIX + day)) ls.removeItem(k)
    }
    const raw = ls.getItem(`${PREFIX}${day}:${pairs}`)
    return raw ? rank(JSON.parse(raw) as Score[]) : []
  } catch { return [] }
}

export function saveScores(pairs: number, scores: Score[], day = dayKey()): void {
  try { storage()?.setItem(`${PREFIX}${day}:${pairs}`, JSON.stringify(scores)) } catch { /* ignore */ }
}

export function clearScores(): void {
  const ls = storage()
  if (!ls) return
  try {
    for (let i = ls.length - 1; i >= 0; i--) {
      const k = ls.key(i)
      if (k?.startsWith(PREFIX)) ls.removeItem(k)
    }
  } catch { /* ignore */ }
}
