import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTY_PAIRS } from '../game/engine'
import { SetupForm } from '../game/SetupForm'
import { createRoom, joinRoom, normaliseCode, roomError } from './api'
import './online.css'

export function OnlineStart() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = async (fn: () => Promise<{ code: string }>) => {
    setBusy(true); setError(null)
    try { navigate(`/online/${(await fn()).code}`) } catch (e) { setError(roomError(e)); setBusy(false) }
  }

  return (
    <div className="page online">
      <h1>Play online</h1>
      <p>Play with up to 4 people on their own phones or computers. One person hosts and shares the game code.</p>

      <div className="online__name">
        <label className="setup__label" htmlFor="online-name">Your name</label>
        <input id="online-name" className="setup__input" maxLength={20} autoComplete="off" placeholder="Shown to the other players"
          value={name} onChange={(e) => setName(e.target.value)} />
        <small className="setup__note">Only other players in your game see it. Games are deleted after a day.</small>
      </div>

      {error && <p role="alert" className="admin-msg admin-msg--error">{error}</p>}

      <div className="online__cols">
        <form className="admin-card" onSubmit={(e) => { e.preventDefault(); void go(() => joinRoom(code, name)) }}>
          <h2>Join a game</h2>
          <label className="setup__label" htmlFor="code">Game code</label>
          <input id="code" className="setup__input online__code-input" inputMode="text" autoCapitalize="characters"
            autoComplete="off" placeholder="ABCDE" value={code} onChange={(e) => setCode(normaliseCode(e.target.value))} />
          <button type="submit" className="btn" disabled={busy || code.length !== 5}>Join</button>
        </form>

        <section className="admin-card">
          <h2>Host a game</h2>
          <SetupForm askName={false} includeDemo={false} submitLabel="Create game" disabled={busy}
            onStart={(s) => void go(() => createRoom(s.versionId, DIFFICULTY_PAIRS[s.difficulty], name))} />
        </section>
      </div>
    </div>
  )
}
