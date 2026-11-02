import { useCallback, useEffect, useState } from 'react'
import { fetchDailyBoard, submitDailyScore, type Board, type Score } from './daily'

/** Today's board for one board size. `refreshSeconds` re-fetches so idle screens pick up other players' times. */
export function useDailyBoard(pairs: number, refreshSeconds = 0) {
  const [board, setBoard] = useState<Board | null>(null)
  const [mine, setMine] = useState<Score | undefined>()

  const reload = useCallback(() => {
    let alive = true
    if (pairs < 2) return () => { alive = false }
    fetchDailyBoard(pairs).then((b) => { if (alive) setBoard(b) })
    return () => { alive = false }
  }, [pairs])

  useEffect(() => { setMine(undefined); return reload() }, [reload])

  useEffect(() => {
    if (!refreshSeconds) return
    const t = setInterval(reload, refreshSeconds * 1000)
    return () => clearInterval(t)
  }, [reload, refreshSeconds])

  const submit = useCallback(async (s: { name: string; ms: number; moves: number }) => {
    const res = await submitDailyScore({ ...s, pairs })
    setBoard({ scores: res.scores, source: res.source })
    setMine(res.mine)
    return res
  }, [pairs])

  return { board, mine, submit, reload, clearMine: () => setMine(undefined) }
}
