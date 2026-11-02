import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createSet, errorText, listSets, type SetSummary } from './api'
import { StatusBadge } from './StatusBadge'

export function AdminHome() {
  const [sets, setSets] = useState<SetSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { listSets().then(setSets).catch((e) => setError(errorText(e))) }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try { navigate(`/admin/sets/${await createSet(name.trim(), description.trim())}`) }
    catch (err) { setError(errorText(err)); setBusy(false) }
  }

  return (
    <>
      <h1>Card sets</h1>
      {error && <p role="alert" className="admin-msg admin-msg--error">{error}</p>}
      {!sets && !error && <p>Loading…</p>}
      {sets && sets.length === 0 && <p>No card sets yet. Create the first one below.</p>}
      {sets && sets.length > 0 && (
        <ul className="admin-sets">
          {sets.map((s) => {
            const live = s.versions.find((v) => v.status === 'approved')
            const draft = s.versions.find((v) => v.status === 'draft')
            const retired = s.versions.length > 0 && s.versions.every((v) => v.status === 'retired' || v.status === 'draft') && !live && s.versions.some((v) => v.status === 'retired')
            return (
              <li key={s.id}>
                <Link to={`/admin/sets/${s.id}`} className="admin-sets__link">
                  <strong>{s.name}</strong>
                  <span className="admin-sets__meta">
                    {live && <><StatusBadge status="approved" /> version {live.version}</>}
                    {draft && <><StatusBadge status="draft" /> version {draft.version}</>}
                    {retired && <StatusBadge status="retired" />}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <form className="admin-card admin-new" onSubmit={create}>
        <h2>New card set</h2>
        <label className="setup__label" htmlFor="set-name">Name</label>
        <input id="set-name" className="setup__input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="setup__label" htmlFor="set-desc">Description (optional)</label>
        <textarea id="set-desc" className="setup__input admin-textarea" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="btn" disabled={busy || !name.trim()}>Create and add cards</button>
      </form>
    </>
  )
}
