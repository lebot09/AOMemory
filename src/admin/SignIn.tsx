import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function SignIn() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage(null)
    const { error, data } = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMessage({ kind: 'error', text: error.message })
    else if (mode === 'sign-up' && !data.session) {
      setMessage({ kind: 'info', text: 'Check your inbox to confirm your email address, then sign in here.' })
      setMode('sign-in')
    }
  }

  return (
    <form className="admin-signin" onSubmit={submit}>
      <h1>{mode === 'sign-in' ? 'Admin sign in' : 'Create an admin account'}</h1>
      <p>Only people the project owner has made admins can manage card sets.</p>
      <label className="setup__label" htmlFor="email">Email</label>
      <input id="email" className="setup__input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="setup__label" htmlFor="password">Password</label>
      <input id="password" className="setup__input" type="password" required minLength={8}
        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`admin-msg admin-msg--${message.kind}`}>{message.text}</p>}
      <div className="admin-row">
        <button type="submit" className="btn" disabled={busy}>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="btn btn--secondary" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage(null) }}>
          {mode === 'sign-in' ? 'I need an account' : 'I already have an account'}
        </button>
      </div>
    </form>
  )
}
