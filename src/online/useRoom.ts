import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getRoom, hideMiss, roomError, type RoomState } from './api'

/** How long a miss stays visible before anyone may turn it back over (server allows 0.9 s). */
const MISS_SHOW_MS = 1200
/** Safety net if a realtime message is missed. */
const POLL_MS = 4000

export function useRoom(code: string) {
  const [room, setRoom] = useState<RoomState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const rev = useRef(-1)

  const refresh = useCallback(async () => {
    try {
      const r = await getRoom(code)
      if (!r) { setMissing(true); return }
      if (r.rev >= rev.current) { rev.current = r.rev; setRoom(r) }
      setError(null)
    } catch (e) { setError(roomError(e)) }
  }, [code])

  // Live updates: the rooms row's rev changes on every move.
  useEffect(() => {
    void refresh()
    if (!supabase) return
    const client = supabase
    const channel = client
      .channel(`room-${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, () => { void refresh() })
      .subscribe()
    const poll = setInterval(() => { void refresh() }, POLL_MS)
    return () => { clearInterval(poll); void client.removeChannel(channel) }
  }, [code, refresh])

  // Turn a shown miss back over after a moment (any client may ask; the server checks timing).
  useEffect(() => {
    if (!room || room.status !== 'playing' || room.open_idx.length !== 2) return
    const t = setTimeout(() => { void hideMiss(code).then(refresh) }, MISS_SHOW_MS)
    return () => clearTimeout(t)
  }, [room, code, refresh])

  return { room, error, missing, refresh }
}
