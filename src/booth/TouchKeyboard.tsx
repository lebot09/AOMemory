import { useState } from 'react'

const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
/** Accents common in names across Europe and Latin America, plus digits. */
const EXTRA = ['1234567890', 'àáâäãåæç', 'èéêëìíîïñ', 'òóôöõøœßùúûü']

type Props = {
  /** Current text of the field being typed into (for automatic capitals). */
  value: string
  onKey: (ch: string) => void
  onBackspace: () => void
  /** Called on every key press (booth idle timer). */
  onActivity?: () => void
}

/** Capitalise the first letter of each name part, like a phone keyboard does. */
export function autoShift(value: string): boolean {
  return value === '' || /[\s-]$/.test(value)
}

/** On-screen keyboard for touch-only booth screens: no physical keyboard needed. */
export function TouchKeyboard({ value, onKey, onBackspace, onActivity }: Props) {
  const [layer, setLayer] = useState<'abc' | 'extra'>('abc')
  const [shift, setShift] = useState<boolean | null>(null) // null: automatic
  const upper = shift ?? autoShift(value)
  const rows = layer === 'abc' ? LETTERS : EXTRA

  const press = (ch: string) => {
    onActivity?.()
    onKey(upper ? ch.toUpperCase() : ch)
    if (shift !== null) setShift(null) // one-shot shift, then back to automatic
  }
  // Keep focus (and the caret) in the name field while tapping keys.
  const keep = (e: React.SyntheticEvent) => e.preventDefault()

  return (
    <div className="touch-kb" role="group" aria-label="On-screen keyboard" onPointerDown={keep} onMouseDown={keep}>
      {rows.map((row) => (
        <div key={row} className="touch-kb__row">
          {[...row].map((ch) => (
            <button key={ch} type="button" className="touch-kb__key" onClick={() => press(ch)}>
              {upper ? ch.toUpperCase() : ch}
            </button>
          ))}
        </div>
      ))}
      <div className="touch-kb__row">
        <button type="button" className="touch-kb__key touch-kb__key--wide" aria-pressed={upper}
          onClick={() => { onActivity?.(); setShift(!upper) }}>
          <span aria-hidden="true">⇧</span><span className="visually-hidden">Capital letters</span>
        </button>
        <button type="button" className="touch-kb__key touch-kb__key--wide"
          onClick={() => { onActivity?.(); setLayer(layer === 'abc' ? 'extra' : 'abc') }}>
          {layer === 'abc' ? 'é 123' : 'abc'}
        </button>
        <button type="button" className="touch-kb__key" onClick={() => press('-')}>-</button>
        <button type="button" className="touch-kb__key" onClick={() => press("'")}>'</button>
        <button type="button" className="touch-kb__key touch-kb__key--space" onClick={() => press(' ')}>space</button>
        <button type="button" className="touch-kb__key touch-kb__key--wide" onClick={() => { onActivity?.(); onBackspace() }}>
          <span aria-hidden="true">⌫</span><span className="visually-hidden">Delete</span>
        </button>
      </div>
    </div>
  )
}
