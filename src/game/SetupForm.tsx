import { useEffect, useState } from 'react'
import { fetchPlayableSets } from '../lib/cardSets'
import { DEMO_FACES, DEMO_SET_ID, DEMO_SET_NAME } from './demoSet'
import { DIFFICULTY_LABEL, DIFFICULTY_PAIRS, type Difficulty } from './engine'
import './setup.css'

export type SetOption = { versionId: string; name: string; cardCount: number; version?: number }

export const DEMO_OPTION: SetOption = { versionId: DEMO_SET_ID, name: DEMO_SET_NAME, cardCount: DEMO_FACES.length }

/** Approved sets from the server, plus the built-in demo (always available, even offline). */
export function useSetOptions() {
  const [options, setOptions] = useState<SetOption[]>([DEMO_OPTION])
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading')
  useEffect(() => {
    let alive = true
    fetchPlayableSets()
      .then((sets) => {
        if (!alive) return
        const remote = sets
          .filter((s) => s.version_id && (s.card_count ?? 0) >= 2)
          .map((s) => ({ versionId: s.version_id!, name: s.name ?? 'Untitled', cardCount: s.card_count ?? 0, version: s.version ?? undefined }))
        setOptions([...remote, DEMO_OPTION])
        setStatus('ready')
      })
      .catch(() => { if (alive) setStatus('offline') })
    return () => { alive = false }
  }, [])
  return { options, status }
}

export type Setup = { versionId: string; setName: string; difficulty: Difficulty; playerName: string }

type Props = { initial?: Partial<Setup>; onStart: (s: Setup) => void; askName?: boolean; submitLabel?: string }

export function SetupForm({ initial, onStart, askName = true, submitLabel = 'Start game' }: Props) {
  const { options, status } = useSetOptions()
  const [versionId, setVersionId] = useState(initial?.versionId ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'easy')
  const [playerName, setPlayerName] = useState(initial?.playerName ?? 'Player 1')

  const selected = options.find((o) => o.versionId === versionId) ?? options[0]

  return (
    <form
      className="setup"
      onSubmit={(e) => {
        e.preventDefault()
        onStart({ versionId: selected.versionId, setName: selected.name, difficulty, playerName: playerName.trim() || 'Player 1' })
      }}
    >
      <fieldset className="setup__group">
        <legend>Card set</legend>
        {status === 'loading' && <p className="setup__note">Checking for card sets…</p>}
        {status === 'offline' && <p className="setup__note">Offline: only the built-in demo set is available.</p>}
        <div className="setup__sets">
          {options.map((o) => (
            <label key={o.versionId} className="setup__set">
              <input type="radio" name="set" value={o.versionId}
                checked={selected.versionId === o.versionId} onChange={() => setVersionId(o.versionId)} />
              <span>
                <strong>{o.name}</strong>
                <small>{o.cardCount} cards{o.version ? ` · version ${o.version}` : ''}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="setup__group">
        <legend>Difficulty</legend>
        <div className="choice">
          {(Object.keys(DIFFICULTY_PAIRS) as Difficulty[]).map((d) => {
            const pairs = Math.min(DIFFICULTY_PAIRS[d], selected.cardCount)
            return (
              <label key={d} className="choice__option">
                <input type="radio" name="difficulty" value={d} checked={difficulty === d} onChange={() => setDifficulty(d)} />
                <span>{DIFFICULTY_LABEL[d]} · {pairs * 2} cards</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {askName && (
        <div className="setup__group">
          <label htmlFor="player-name" className="setup__label">Player name</label>
          <input id="player-name" className="setup__input" value={playerName} maxLength={20}
            autoComplete="off" onChange={(e) => setPlayerName(e.target.value)} onFocus={(e) => e.target.select()} />
          <small className="setup__note">Only shown on this screen. Nothing is saved or sent anywhere.</small>
        </div>
      )}

      <button type="submit" className="btn">{submitLabel}</button>
    </form>
  )
}
