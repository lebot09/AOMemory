import { useEffect, useReducer, useState } from 'react'
import { deal, reducer, type Face, type GameState } from './engine'

/** How long a missed pair stays visible before turning back. */
export const MISS_DELAY_MS = 1000

export function useGame(faces: Face[], pairs: number, playerNames: string[], seed: number) {
  const [state, dispatch] = useReducer(reducer, undefined, (): GameState => deal(faces, pairs, seed, playerNames))
  const [now, setNow] = useState(() => Date.now())

  // Turn a miss back over after a pause.
  useEffect(() => {
    if (state.last?.kind !== 'miss') return
    const t = setTimeout(() => dispatch({ type: 'hide' }), MISS_DELAY_MS)
    return () => clearTimeout(t)
  }, [state.last])

  // Clock ticks only while a game is running.
  useEffect(() => {
    if (state.startedAt === null || state.finishedAt !== null) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [state.startedAt, state.finishedAt])

  const flip = (index: number) => dispatch({ type: 'flip', index, now: Date.now() })
  return { state, flip, now }
}
