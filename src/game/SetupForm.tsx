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

export type Setup = { versionId: string; setName: string; difficulty: Difficulty; playerNames: string[] }

export const MAX_PLAYERS = 4
const defaultName = (i: number) => `Player ${i + 1}`

type Props = {
  initial?: Partial<Setup>; onStart: (s: Setup) => void; askName?: boolean; submitLabel?: string
}

export function SetupForm({ initial, onStart, askName = true, submitLabel = 'Start game' }: Props) {
  const { options, status } = useSetOptions()
  const [versionId, setVersionId] = useState(initial?.versionId ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'easy')
  const [names, setNames] = useState<string[]>(initial?.playerNames ?? [defaultName(0)])
  const setCount = (n: number) => setNames((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? defaultName(i)))

  const selected: SetOption | undefined = options.find((o) => o.versionId === versionId) ?? options[0]

  return (
    <form
      className="setup"
      onSubmit={(e) => {
        e.preventDefault()
        if (!selected) return
        onStart({ versionId: selected.versionId, setName: selected.name, difficulty, playerNames: names.map((n, i) => n.trim() || defaultName(i)) })
      }}
    >
      <fieldset className="setup__group">
        <legend>Card set</legend>
        {status === 'loading' && <p className="setup__note">Checking for card sets…</p>}
        {status === 'offline' && <p className="setup__note">Offline: only the built-in demo set is available.</p>}
        {status === 'ready' && options.length === 0 && <p className="setup__note">No card sets have been approved yet. An admin can add one in the admin area.</p>}
        <div className="setup__sets">
          {options.map((o) => (
            <label key={o.versionId} className="setup__set">
              <input type="radio" name="set" value={o.versionId}
                checked={selected?.versionId === o.versionId} onChange={() => setVersionId(o.versionId)} />
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
            const pairs = Math.min(DIFFICULTY_PAIRS[d], selected?.cardCount ?? DIFFICULTY_PAIRS[d])
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
        <>
          <fieldset className="setup__group">
            <legend>Players on this screen</legend>
            <div className="choice">
              {Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).map((n) => (
                <label key={n} className="choice__option">
                  <input type="radio" name="players" value={n} checked={names.length === n} onChange={() => setCount(n)} />
                  <span>{n === 1 ? '1 player' : `${n} players`}</span>
                </label>
              ))}
            </div>
            {names.length > 1 && <small className="setup__note">Everyone plays on this screen and takes turns. Find a pair and you go again.</small>}
          </fieldset>
          <fieldset className="setup__group">
            <legend>{names.length === 1 ? 'Player name' : 'Player names'}</legend>
            {names.map((n, i) => (
              <div key={i} className="setup__name">
                <label htmlFor={`player-${i}`} className="visually-hidden">Player {i + 1} name</label>
                <input id={`player-${i}`} className="setup__input" value={n} maxLength={20} autoComplete="off"
                  onChange={(e) => setNames((prev) => prev.map((x, k) => (k === i ? e.target.value : x)))}
                  onFocus={(e) => e.target.select()} />
              </div>
            ))}
            <small className="setup__note">{names.length === 1 ? "Your name is shown with your time on today's best. A nickname is fine." : 'Names are only shown on this screen. Nothing is saved or sent anywhere.'}</small>
          </fieldset>
        </>
      )}

      <button type="submit" className="btn" disabled={!selected}>{submitLabel}</button>
    </form>
  )
}
