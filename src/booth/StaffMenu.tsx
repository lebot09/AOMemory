import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SetupForm } from '../game/SetupForm'
import { SettingsPanel } from '../settings/SettingsPanel'
import { saveBoothConfig, type BoothConfig } from './config'
import { clearScores } from './leaderboard'

type Props = {
  config: BoothConfig
  onClose: () => void
  onSave: (c: BoothConfig) => void
  onScoresCleared: () => void
}

export function StaffMenu({ config, onClose, onSave, onScoresCleared }: Props) {
  const [idleSeconds, setIdleSeconds] = useState(config.idleSeconds)
  const [askName, setAskName] = useState(config.askName)
  const [touchKeyboard, setTouchKeyboard] = useState(config.touchKeyboard)
  const [cleared, setCleared] = useState(false)

  const fullscreen = () => {
    const el = document.documentElement
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.().catch(() => {})
  }

  return (
    <div className="results-backdrop">
      <section className="staff" role="dialog" aria-modal="true" aria-labelledby="staff-title">
        <div className="staff__head">
          <h2 id="staff-title">Booth settings</h2>
          <button type="button" className="btn btn--secondary btn--small" onClick={onClose}>Close</button>
        </div>

        <div className="staff__row">
          <button type="button" className="btn btn--secondary" onClick={fullscreen}>Toggle full screen</button>
          <button type="button" className="btn btn--secondary" disabled={cleared}
            onClick={() => { clearScores(); onScoresCleared(); setCleared(true) }}>
            {cleared ? "Today's times cleared" : "Clear today's best times"}
          </button>
          <Link className="btn btn--secondary" to="/">Leave booth mode</Link>
        </div>

        <div className="staff__row">
          <label className="setup__label" htmlFor="idle">Reset after no touch for</label>
          <select id="idle" className="setup__input" value={idleSeconds} onChange={(e) => setIdleSeconds(Number(e.target.value))}>
            {[30, 45, 60, 90, 120].map((s) => <option key={s} value={s}>{s} seconds</option>)}
          </select>
          <label className="staff__check">
            <input type="checkbox" checked={askName} onChange={(e) => setAskName(e.target.checked)} />
            Ask players for a name
          </label>
          <label className="staff__check">
            <input type="checkbox" checked={touchKeyboard} onChange={(e) => setTouchKeyboard(e.target.checked)} />
            On-screen keyboard for names
          </label>
        </div>

        <SetupForm
          askName={false}
          submitLabel="Save and restart"
          initial={{ versionId: config.versionId, difficulty: config.difficulty }}
          onStart={(s) => {
            const next: BoothConfig = { ...config, versionId: s.versionId, setName: s.setName, difficulty: s.difficulty, idleSeconds, askName, touchKeyboard }
            saveBoothConfig(next)
            onSave(next)
          }}
        />

        <details className="staff__display">
          <summary>Display settings</summary>
          <SettingsPanel />
        </details>
      </section>
    </div>
  )
}
