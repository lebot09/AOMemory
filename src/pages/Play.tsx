import { useState } from 'react'
import { recordGame } from '../lib/cardSets'
import { DEMO_SET_ID } from '../game/demoSet'
import { DIFFICULTY_PAIRS } from '../game/engine'
import { Game } from '../game/Game'
import { SetupForm, type Setup } from '../game/SetupForm'
import { useLoadedFaces } from '../game/useLoadedFaces'

export function Play() {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [seed, setSeed] = useState(() => Date.now())
  const loaded = useLoadedFaces(setup?.versionId ?? null)

  const start = (s: Setup) => {
    setSeed(Date.now())
    setSetup(s)
    if (s.versionId !== DEMO_SET_ID) void recordGame(s.versionId, 'solo', DIFFICULTY_PAIRS[s.difficulty])
  }

  if (!setup) {
    return (
      <div className="page">
        <h1>New game</h1>
        <SetupForm onStart={start} />
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
      playerName={setup.playerName}
      setName={setup.setName}
      seed={seed}
      onExit={() => setSetup(null)}
      onPlayAgain={() => start(setup)}
    />
  )
}
