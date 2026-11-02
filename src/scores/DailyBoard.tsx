import { formatTime } from '../game/engine'
import type { Board, Score } from './daily'
import './scores.css'

type Props = { board: Board | null; highlight?: Score; limit?: number; className?: string }

/** "Today's best" list: fastest time first, fewer moves breaks ties. */
export function DailyBoard({ board, highlight, limit, className = '' }: Props) {
  if (!board) return <p className="daily-board__empty">Loading today's times…</p>
  const scores = limit ? board.scores.slice(0, limit) : board.scores
  return (
    <>
      {scores.length === 0
        ? <p className="daily-board__empty">No times yet today. Be the first!</p>
        : (
          <ol className={`daily-board ${className}`}>
            {scores.map((s, i) => (
              <li key={s.id} data-me={s.id === highlight?.id || undefined}>
                <span className="daily-board__pos">{i + 1}</span>
                <span className="daily-board__name">{s.name}</span>
                <span className="daily-board__time">{formatTime(s.ms)}</span>
                <span className="daily-board__moves">{s.moves} moves</span>
              </li>
            ))}
          </ol>
        )}
      {board.source === 'device' && <p className="daily-board__note">Offline: showing times from this screen only.</p>}
    </>
  )
}

/** Rank line for the results panel. */
export function rankText(board: Board | null, mine: Score | undefined): string | null {
  if (!board) return null
  if (!mine) return "Not in today's top 10 this time. Have another go!"
  const pos = board.scores.findIndex((s) => s.id === mine.id) + 1
  return pos === 1 ? "You're number 1 today!" : `You're number ${pos} today!`
}
