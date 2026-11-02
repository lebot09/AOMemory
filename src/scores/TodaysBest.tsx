import { useState } from 'react'
import { DIFFICULTY_LABEL, DIFFICULTY_PAIRS, type Difficulty } from '../game/engine'
import { DailyBoard } from './DailyBoard'
import { useDailyBoard } from './useDailyBoard'

/** "Today's best" for single players, one board per difficulty (board size). */
export function TodaysBest({ initial = 'easy' }: { initial?: Difficulty }) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initial)
  const pairs = DIFFICULTY_PAIRS[difficulty]
  const { board } = useDailyBoard(pairs, 60)
  return (
    <section className="daily-panel" aria-labelledby="todays-best">
      <h2 id="todays-best">Today's best</h2>
      <fieldset className="choice">
        <legend>Single-player times, {pairs * 2} cards</legend>
        {(Object.keys(DIFFICULTY_PAIRS) as Difficulty[]).map((d) => (
          <label key={d} className="choice__option">
            <input type="radio" name="best-difficulty" value={d} checked={d === difficulty} onChange={() => setDifficulty(d)} />
            <span>{DIFFICULTY_LABEL[d]} · {DIFFICULTY_PAIRS[d] * 2} cards</span>
          </label>
        ))}
      </fieldset>
      <DailyBoard board={board} />
    </section>
  )
}
