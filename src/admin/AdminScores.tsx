import { useState } from 'react'
import { DIFFICULTY_LABEL, DIFFICULTY_PAIRS, type Difficulty } from '../game/engine'
import { resetDailyScores } from '../scores/daily'
import { DailyBoard } from '../scores/DailyBoard'
import { useDailyBoard } from '../scores/useDailyBoard'
import { errorText } from './api'

const DIFFICULTIES = Object.keys(DIFFICULTY_PAIRS) as Difficulty[]

function BoardCard({ difficulty, onReset }: { difficulty: Difficulty; onReset: (pairs: number, label: string) => void }) {
  const pairs = DIFFICULTY_PAIRS[difficulty]
  const { board } = useDailyBoard(pairs)
  const label = `${DIFFICULTY_LABEL[difficulty]} · ${pairs * 2} cards`
  return (
    <section className="admin-card admin-scores__board" aria-label={label}>
      <h2>{label}</h2>
      <DailyBoard board={board} />
      <button type="button" className="btn btn--secondary btn--small" disabled={!board?.scores.length}
        onClick={() => onReset(pairs, label)}>Reset this board</button>
    </section>
  )
}

/** Today's best times for single players, with reset to zero. */
export function AdminScores() {
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = async (pairs: number | undefined, label: string) => {
    if (!window.confirm(`Reset ${label}? All times on ${pairs ? 'this board' : 'every board'} are deleted for everyone.`)) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const n = await resetDailyScores(pairs)
      setNotice(`${label}: ${n} ${n === 1 ? 'time' : 'times'} removed.`)
      setVersion((v) => v + 1)
    } catch (e) { setError(errorText(e)) }
    setBusy(false)
  }

  return (
    <>
      <h1>Today's best</h1>
      <p>Single-player times from every screen (web and booth), one board per number of cards. Boards start fresh each day; resetting wipes a board to zero right away.</p>
      {error && <p role="alert" className="admin-msg admin-msg--error">{error}</p>}
      {notice && <p role="status" className="admin-msg admin-msg--info">{notice}</p>}
      <div className="admin-scores">
        {DIFFICULTIES.map((d) => (
          <BoardCard key={`${d}-${version}`} difficulty={d} onReset={(p, l) => void reset(p, l)} />
        ))}
      </div>
      <button type="button" className="btn" disabled={busy} onClick={() => void reset(undefined, 'all boards')}>Reset all boards</button>
    </>
  )
}
