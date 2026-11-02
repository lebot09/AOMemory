import { useEffect, useState } from 'react'
import { fetchPlayableSets } from '../lib/cardSets'
import type { PlayableSet } from '../lib/database.types'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; sets: PlayableSet[] }

export function Play() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = () => {
    setState({ status: 'loading' })
    fetchPlayableSets()
      .then((sets) => setState({ status: 'ready', sets }))
      .catch((e: unknown) => {
        console.error('Loading card sets failed', e)
        setState({ status: 'error' })
      })
  }
  useEffect(load, [])

  return (
    <div className="page">
      <h1>Choose a card set</h1>
      <div aria-live="polite">
        {state.status === 'loading' && <p>Loading card sets…</p>}
        {state.status === 'error' && (
          <div role="alert">
            <p>Couldn't load card sets. Check the internet connection and try again.</p>
            <button className="btn" type="button" onClick={load}>Try again</button>
          </div>
        )}
        {state.status === 'ready' && state.sets.length === 0 && (
          <p>No card sets have been approved yet. An admin can add one in the admin area.</p>
        )}
        {state.status === 'ready' && state.sets.length > 0 && (
          <ul>
            {state.sets.map((s) => (
              <li key={s.version_id}>{s.name} (version {s.version}, {s.card_count} cards)</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
