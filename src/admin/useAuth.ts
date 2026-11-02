import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AuthState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; session: Session; isAdmin: boolean }

/** Current Supabase session plus whether that user is in public.admins. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(supabase ? { status: 'loading' } : { status: 'unavailable' })

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let alive = true

    const resolve = async (session: Session | null) => {
      if (!session) { if (alive) setState({ status: 'signed-out' }); return }
      const { data, error } = await client.rpc('is_admin')
      if (alive) setState({ status: 'signed-in', session, isAdmin: !error && data === true })
    }

    client.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => { void resolve(session) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  return state
}
