import { useState } from 'react'
import type { Card } from '../lib/database.types'
import { cardImageUrl } from '../lib/supabase'
import { deleteCard, errorText, updateCard, type CardMeta } from './api'

type Props = { card: Card; onChanged: () => void }

function tagsOf(c: Card): string {
  const m = (c.metadata ?? {}) as CardMeta
  return (m.tags ?? []).join(', ')
}

export function CardEditor({ card, onChanged }: Props) {
  const [label, setLabel] = useState(card.label)
  const [alt, setAlt] = useState(card.alt_text)
  const [tags, setTags] = useState(tagsOf(card))
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  const save = async () => {
    const nextTags = tags.split(',').map((t) => t.trim()).filter(Boolean)
    const dirty = label.trim() !== card.label || alt.trim() !== card.alt_text || nextTags.join(', ') !== tagsOf(card)
    if (!dirty) return
    if (!label.trim() || !alt.trim()) { setState('error'); setError('Name and alt text are required.'); return }
    setState('saving')
    try {
      const metadata = { ...((card.metadata ?? {}) as object), tags: nextTags }
      await updateCard(card.id, { label: label.trim(), alt_text: alt.trim(), metadata })
      setState('saved'); onChanged()
    } catch (e) { setState('error'); setError(errorText(e)) }
  }

  const remove = async () => {
    if (!window.confirm(`Remove "${card.label}" from this draft?`)) return
    try { await deleteCard(card.id); onChanged() } catch (e) { setState('error'); setError(errorText(e)) }
  }

  const id = (f: string) => `${f}-${card.id}`
  return (
    <li className="card-editor">
      <img className="card-editor__img" src={cardImageUrl(card.image_path)} alt="" loading="lazy" />
      <div className="card-editor__fields" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) void save() }}>
        <label htmlFor={id('label')}>Name</label>
        <input id={id('label')} className="setup__input" maxLength={80} value={label} onChange={(e) => { setLabel(e.target.value); setState('idle') }} />
        <label htmlFor={id('alt')}>Alt text <small>(describe the picture)</small></label>
        <input id={id('alt')} className="setup__input" maxLength={300} value={alt} onChange={(e) => { setAlt(e.target.value); setState('idle') }} />
        <label htmlFor={id('tags')}>Tags <small>(comma separated, optional)</small></label>
        <input id={id('tags')} className="setup__input" value={tags} onChange={(e) => { setTags(e.target.value); setState('idle') }} />
      </div>
      <div className="card-editor__foot">
        <span aria-live="polite" className={`card-editor__state card-editor__state--${state}`}>
          {state === 'saving' && 'Saving…'}{state === 'saved' && 'Saved'}{state === 'error' && error}
        </span>
        <button type="button" className="btn btn--secondary btn--small" onClick={remove}>Remove</button>
      </div>
    </li>
  )
}
