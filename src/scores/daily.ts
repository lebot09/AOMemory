import { supabase } from '../lib/supabase'
import { addScore, BOARD_SIZE, dayKey, loadScores, saveScores, type Score } from './local'

export type { Score }
export { BOARD_SIZE, dayKey }

/** 'shared': the database board every screen sees. 'device': offline fallback on this device only. */
export type BoardSource = 'shared' | 'device'
export type Board = { scores: Score[]; source: BoardSource }

const TIMEOUT_MS = 8000

/** Today's top times for one board size (number of pairs). */
export async function fetchDailyBoard(pairs: number, day = dayKey()): Promise<Board> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_scores')
        .select('id, name, ms, moves, pairs, created_at')
        .eq('day', day).eq('pairs', pairs)
        .order('ms').order('moves').order('created_at')
        .limit(BOARD_SIZE)
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS))
      if (error) throw error
      return {
        source: 'shared',
        scores: (data ?? []).map((r) => ({ id: r.id, name: r.name, ms: r.ms, moves: r.moves, pairs: r.pairs, at: Date.parse(r.created_at) })),
      }
    } catch { /* fall back to this device */ }
  }
  return { source: 'device', scores: loadScores(pairs, day) }
}

/** Add a single-player result. Returns the updated board and the new entry, if it made the top 10. */
export async function submitDailyScore(s: { name: string; ms: number; moves: number; pairs: number }): Promise<Board & { mine?: Score }> {
  const day = dayKey()
  if (supabase) {
    try {
      const { data: id, error } = await supabase.rpc('submit_daily_score', {
        p_day: day, p_pairs: s.pairs, p_name: s.name, p_ms: Math.max(1, Math.round(s.ms)), p_moves: s.moves,
      }).abortSignal(AbortSignal.timeout(TIMEOUT_MS))
      if (error) throw error
      const board = await fetchDailyBoard(s.pairs, day)
      if (board.source === 'shared') return { ...board, mine: board.scores.find((x) => x.id === id) }
    } catch { /* fall back to this device */ }
  }
  const entry: Score = { ...s, id: `local-${Date.now()}`, at: Date.now() }
  const { scores } = addScore(loadScores(s.pairs, day), entry)
  saveScores(s.pairs, scores, day)
  return { source: 'device', scores, mine: scores.includes(entry) ? entry : undefined }
}

/** Admins only: wipe one board size, or every board when pairs is omitted. Returns how many times were removed. */
export async function resetDailyScores(pairs?: number): Promise<number> {
  if (!supabase) throw new Error('No database connection')
  const { data, error } = await supabase.rpc('reset_daily_scores', pairs === undefined ? {} : { p_pairs: pairs })
  if (error) throw error
  return data ?? 0
}
