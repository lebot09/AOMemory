import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { SignIn } from './SignIn'
import { useAuth } from './useAuth'
import './admin.css'

/** Shows children only to signed-in admins. */
export function AdminGate({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.status === 'loading') return <div className="page"><p>Checking your access…</p></div>
  if (auth.status === 'unavailable') return <div className="page"><p>The admin area needs a connection to the card set database.</p></div>
  if (auth.status === 'signed-out') return <div className="page"><SignIn /></div>
  if (!auth.isAdmin) {
    return (
      <div className="page">
        <h1>Not an admin yet</h1>
        <p>You're signed in as <strong>{auth.session.user.email}</strong>, but this account can't manage card sets.
          Ask the project owner to add it as an admin.</p>
        <button type="button" className="btn btn--secondary" onClick={() => void supabase?.auth.signOut()}>Sign out</button>
      </div>
    )
  }
  return (
    <div className="page admin">
      <div className="admin-bar">
        <span>Signed in as {auth.session.user.email}</span>
        <button type="button" className="btn btn--secondary btn--small" onClick={() => void supabase?.auth.signOut()}>Sign out</button>
      </div>
      {children}
    </div>
  )
}
