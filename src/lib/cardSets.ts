import { supabase } from './supabase'
import type { Card, GameMode, PlayableSet } from './database.types'

/** Fail fast on bad booth Wi-Fi instead of showing a spinner forever. */
const TIMEOUT_MS = 8000

/** Sets players may start a new game with: one approved version per set. */
export async function fetchPlayableSets(): Promise<PlayableSet[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('playable_sets').select('*').order('name').abortSignal(AbortSignal.timeout(TIMEOUT_MS))
  if (error) throw error
  return data ?? []
}

/**
 * Cards of one exact version. Games always load by version id, never "latest",
 * so a game keeps the cards it started with even after a newer version is approved.
 */
export async function fetchVersionCards(versionId: string): Promise<Card[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('version_id', versionId)
    .order('position')
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS))
  if (error) throw error
  return data ?? []
}

/** Record that a game started on an exact version (no player data). Best effort: never blocks play. */
export async function recordGame(versionId: string, mode: GameMode, pairs: number): Promise<void> {
  if (!supabase) return
  try {
    await supabase.from('games').insert({ version_id: versionId, mode, pairs })
  } catch { /* offline: fine */ }
}
