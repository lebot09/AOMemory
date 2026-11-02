import { useState } from 'react'
import { recordGame } from '../lib/cardSets'
import { DEMO_SET_ID } from '../game/demoSet'
import { DIFFICULTY_PAIRS } from '../game/engine'
import { Game } from '../game/Game'
import { SetupForm, type Setup } from '../game/SetupForm'
import { useLoadedFaces } from '../game/useLoadedFaces'
import { DailyBoard, rankText } from '../scores/DailyBoard'
import { TodaysBest } from '../scores/TodaysBest'
import { useDailyBoard } from '../scores/useDailyBoard'

export function Play() {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [seed, setSeed] = useState(() => Date.now())
  const loaded = useLoadedFaces(setup?.versionId ?? null)
  const solo = setup?.playerNames.length === 1
  // Today's best is for single players only; one board per board size.
  const daily = useDailyBoard(setup ? DIFFICULTY_PAIRS[setup.difficulty] : 0)
  const [submitted, setSubmitted] = useState(false)

  const start = (s: Setup) => {
    setSeed(Date.now())
    setSetup(s)
    setSubmitted(false)
    if (s.versionId !== DEMO_SET_ID) void recordGame(s.versionId, s.playerNames.length > 1 ? 'local' : 'solo', DIFFICULTY_PAIRS[s.difficulty])
  }

  if (!setup) {
    return (
      <div className="page">
        <h1>New game</h1>
        <SetupForm onStart={start} />
        <TodaysBest />
      </div>
    )
  }

  if (loaded.status !== 'ready') {
    return (
      <div className="page" aria-live="polite">
        {loaded.status === 'error' ? (
          <div role="alert">
            <p>Couldn't load this card set. Check the internet connection, or pick the demo set.</p>
            <button className="btn" type="button" onClick={() => setSetup(null)}>Back</button>
          </div>
        ) : <p>Shuffling cards…</p>}
      </div>
    )
  }

  return (
    <Game
      key={seed}
      faces={loaded.faces}
      pairs={DIFFICULTY_PAIRS[setup.difficulty]}
      playerNames={setup.playerNames}
      setName={setup.setName}
      seed={seed}
      onExit={() => setSetup(null)}
      onPlayAgain={() => start(setup)}
      onFinish={solo ? (r) => { void daily.submit({ name: r.name, ms: r.ms, moves: r.moves }).then(() => setSubmitted(true)) } : undefined}
      resultsExtra={solo ? () => (
        <div className="daily-results">
          <h3>Today's best</h3>
          {submitted ? <p className="daily-rank">{rankText(daily.board, daily.mine)}</p> : <p>Saving your time…</p>}
          <DailyBoard board={daily.board} highlight={daily.mine} />
        </div>
      ) : undefined}
    />
  )
}
