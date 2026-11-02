import { supabase } from '../lib/supabase'
import { cardImageUrl } from '../lib/supabase'
import type { Player, Tile } from '../game/engine'

export type RoomStatus = 'lobby' | 'playing' | 'finished'
export type RoomTile = {
  idx: number; face_up: boolean; matched: boolean
  card: { id: string; label: string; alt_text: string; image_path: string } | null
}
export type RoomState = {
  code: string; status: RoomStatus; pairs: number; set_name: string
  current_seat: number; moves: number; open_idx: number[]
  last_kind: 'flip' | 'match' | 'miss' | 'won' | null; last_idx: number[]; rev: number
  started_at: string | null; finished_at: string | null; updated_at: string
  players: { seat: number; name: string; pairs: number }[]
  tiles: RoomTile[]
}
export type Seat = { code: string; seat: number; token: string }

function db() {
  if (!supabase) throw new Error('Online games need an internet connection')
  return supabase
}

/** Server error messages are written for players; anything else gets a generic line. */
export function roomError(e: unknown): string {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return msg && !/fetch|network|timeout|abort/i.test(msg) ? msg : "Couldn't reach the game server. Check the internet connection."
}

export const normaliseCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)

// The seat token lives only on this device, so a refresh keeps your place in the game.
const seatKey = (code: string) => `ao-memory:room:${code}`
export function saveSeat(s: Seat): void { try { localStorage.setItem(seatKey(s.code), JSON.stringify(s)) } catch { /* ignore */ } }
export function loadSeat(code: string): Seat | null {
  try { const raw = localStorage.getItem(seatKey(code)); return raw ? (JSON.parse(raw) as Seat) : null } catch { return null }
}

export async function createRoom(versionId: string, pairs: number, name: string): Promise<Seat> {
  const { data, error } = await db().rpc('create_room', { p_version_id: versionId, p_pairs: pairs, p_name: name })
  if (error) throw error
  const seat = data as unknown as Seat
  saveSeat(seat)
  return seat
}

export async function joinRoom(code: string, name: string): Promise<Seat> {
  const { data, error } = await db().rpc('join_room', { p_code: normaliseCode(code), p_name: name })
  if (error) throw error
  const seat = data as unknown as Seat
  saveSeat(seat)
  return seat
}

export async function startRoom(seat: Seat): Promise<void> {
  const { error } = await db().rpc('start_room', { p_code: seat.code, p_token: seat.token })
  if (error) throw error
}

export async function flipTile(seat: Seat, idx: number): Promise<void> {
  const { error } = await db().rpc('flip_tile', { p_code: seat.code, p_token: seat.token, p_idx: idx })
  if (error) throw error
}

export async function hideMiss(code: string): Promise<void> {
  await db().rpc('hide_miss', { p_code: code })
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const { data, error } = await db().rpc('get_room', { p_code: normaliseCode(code) }).abortSignal(AbortSignal.timeout(8000))
  if (error) throw error
  return (data as unknown as RoomState) ?? null
}

/** Map server tiles onto the shared Board's tile shape. Hidden tiles carry no card data. */
export function toTiles(room: RoomState): Tile[] {
  return room.tiles.map((t) => ({
    key: `t${t.idx}`,
    pairId: t.card?.id ?? `hidden-${t.idx}`,
    label: t.card?.label ?? '',
    altText: t.card?.alt_text ?? '',
    imageUrl: t.card ? cardImageUrl(t.card.image_path) : undefined,
    faceUp: t.face_up,
    matched: t.matched,
  }))
}

export function toPlayers(room: RoomState): Player[] {
  return room.players.map((p) => ({ name: p.name, pairs: p.pairs }))
}
