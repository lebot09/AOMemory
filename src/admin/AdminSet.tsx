import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Card } from '../lib/database.types'
import { cardImageUrl } from '../lib/supabase'
import {
  addCardFromFile, approvalProblems, approvalWarnings, approveVersion, createDraft, discardDraft,
  errorText, getSet, listCards, retireSet, updateSet, type SetSummary,
} from './api'
import { CardEditor } from './CardEditor'
import { StatusBadge } from './StatusBadge'

const MAX_FILE_MB = 15

export function AdminSet() {
  const { id = '' } = useParams()
  const [set, setSet] = useState<SetSummary | null>(null)
  const [draftCards, setDraftCards] = useState<Card[]>([])
  const [liveCards, setLiveCards] = useState<Card[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [upload, setUpload] = useState<{ done: number; total: number; failed: string[] } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const draft = set?.versions.find((v) => v.status === 'draft')
  const live = set?.versions.find((v) => v.status === 'approved')
  const latest = set?.versions[0]

  const reload = useCallback(async () => {
    try {
      const s = await getSet(id)
      setSet(s); setName(s.name); setDescription(s.description)
      const d = s.versions.find((v) => v.status === 'draft')
      const l = s.versions.find((v) => v.status === 'approved')
      setDraftCards(d ? await listCards(d.id) : [])
      setLiveCards(l ? await listCards(l.id) : [])
    } catch (e) { setError(errorText(e)) }
  }, [id])

  useEffect(() => { void reload() }, [reload])

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setError(null); setNotice(null)
    try { await fn(); if (done) setNotice(done); await reload() } catch (e) { setError(errorText(e)) }
  }

  const addFiles = async (files: FileList | File[]) => {
    if (!set || !draft) return
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    const failed: string[] = []
    let position = draftCards.reduce((m, c) => Math.max(m, c.position + 1), 0)
    setUpload({ done: 0, total: list.length, failed })
    for (const [i, f] of list.entries()) {
      try {
        if (f.size > MAX_FILE_MB * 1024 * 1024) throw new Error('too large')
        await addCardFromFile(set.id, draft.id, f, position++)
      } catch { failed.push(f.name) }
      setUpload({ done: i + 1, total: list.length, failed: [...failed] })
    }
    await reload()
  }

  if (error && !set) return <p role="alert" className="admin-msg admin-msg--error">{error}</p>
  if (!set) return <p>Loading…</p>

  const problems = draft ? approvalProblems(draftCards) : []
  const warnings = draft ? approvalWarnings(draftCards) : []
  const isRetired = !live && set.versions.some((v) => v.status === 'retired')

  return (
    <>
      <p><Link to="/admin">‹ All card sets</Link></p>
      <h1>{set.name}</h1>
      {error && <p role="alert" className="admin-msg admin-msg--error">{error}</p>}
      {notice && <p role="status" className="admin-msg admin-msg--info">{notice}</p>}

      <form className="admin-card" onSubmit={(e) => { e.preventDefault(); void run(() => updateSet(set.id, { name: name.trim(), description: description.trim() }), 'Details saved.') }}>
        <h2>Details</h2>
        <label className="setup__label" htmlFor="name">Name</label>
        <input id="name" className="setup__input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="setup__label" htmlFor="desc">Description</label>
        <textarea id="desc" className="setup__input admin-textarea" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="btn btn--secondary" disabled={name.trim() === set.name && description.trim() === set.description}>Save details</button>
      </form>

      <section className="admin-card">
        <h2>Versions</h2>
        <table className="admin-table">
          <thead><tr><th scope="col">Version</th><th scope="col">Status</th><th scope="col">Approved</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            {set.versions.map((v) => (
              <tr key={v.id}>
                <td>{v.version}</td>
                <td><StatusBadge status={v.status} /></td>
                <td>{v.approved_at ? new Date(v.approved_at).toLocaleString() : '—'}</td>
                <td>{v.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="admin-help">Players only see the <strong>Live</strong> version. Games already in progress keep the version they started with, even after you approve a new one.</p>
        {!draft && latest && (
          <button type="button" className="btn" onClick={() => run(() => createDraft(set.id), `Version ${latest.version + 1} draft started with a copy of version ${latest.version}'s cards.`)}>
            Start version {latest.version + 1}
          </button>
        )}
      </section>

      {draft && (
        <section className="admin-card" aria-labelledby="draft-title">
          <h2 id="draft-title">Editing draft: version {draft.version}</h2>

          <div
            className="dropzone" data-dragging={dragging || undefined}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files) }}
          >
            <p><strong>Add card images.</strong> Drop images here or choose files. Each image becomes one card (the game shows it twice). Use PNG, JPEG or WebP. Images are resized to 1024 px.</p>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="visually-hidden" id="files"
              onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = '' }} />
            <label htmlFor="files" className="btn">Choose images</label>
            {upload && (
              <p role="status">
                {upload.done < upload.total ? `Uploading ${upload.done + 1} of ${upload.total}…` : `Uploaded ${upload.total - upload.failed.length} of ${upload.total}.`}
                {upload.failed.length > 0 && ` Couldn't add: ${upload.failed.join(', ')}.`}
              </p>
            )}
          </div>

          {draftCards.length > 0 && (
            <ul className="card-editors">
              {draftCards.map((c) => <CardEditor key={c.id} card={c} onChanged={() => void reload()} />)}
            </ul>
          )}

          <div className="admin-approve">
            <h3>Approve version {draft.version}</h3>
            {problems.length > 0 && <ul className="admin-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
            {warnings.length > 0 && <ul className="admin-warnings">{warnings.map((p) => <li key={p}>{p}</li>)}</ul>}
            <div className="admin-row">
              <button type="button" className="btn" disabled={problems.length > 0}
                onClick={() => {
                  if (window.confirm(`Approve version ${draft.version} with ${draftCards.length} cards? It goes live for new games and can't be edited afterwards.`))
                    void run(() => approveVersion(draft.id), `Version ${draft.version} is live.`)
                }}>
                Approve and go live
              </button>
              <button type="button" className="btn btn--secondary"
                onClick={() => {
                  if (window.confirm(`Discard the version ${draft.version} draft and its card changes?`))
                    void run(() => discardDraft(draft.id), 'Draft discarded.')
                }}>
                Discard draft
              </button>
            </div>
          </div>
        </section>
      )}

      {live && (
        <section className="admin-card">
          <h2>Live: version {live.version} ({liveCards.length} cards)</h2>
          <ul className="admin-thumbs">
            {liveCards.map((c) => (
              <li key={c.id}><img src={cardImageUrl(c.image_path)} alt={c.alt_text} loading="lazy" /><span>{c.label}</span></li>
            ))}
          </ul>
        </section>
      )}

      {!isRetired && (live || set.versions.some((v) => v.status === 'superseded')) && (
        <section className="admin-card admin-danger">
          <h2>Retire this set</h2>
          <p>Removes the set from the player list. Games already being played can finish. You can bring it back later by approving a new version.</p>
          <button type="button" className="btn btn--secondary"
            onClick={() => { if (window.confirm(`Retire "${set.name}"? Players won't be able to start new games with it.`)) void run(() => retireSet(set.id), 'Set retired.') }}>
            Retire set
          </button>
        </section>
      )}
    </>
  )
}
