import { useEffect, useState } from 'react'
import type { Face } from './engine'
import { loadFaces } from './sources'

export type Loaded = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; faces: Face[] }

export function useLoadedFaces(versionId: string | null): Loaded {
  const [state, setState] = useState<Loaded>({ status: 'idle' })
  useEffect(() => {
    if (!versionId) { setState({ status: 'idle' }); return }
    let alive = true
    setState({ status: 'loading' })
    loadFaces(versionId)
      .then((faces) => { if (alive) setState(faces.length >= 2 ? { status: 'ready', faces } : { status: 'error' }) })
      .catch(() => { if (alive) setState({ status: 'error' }) })
    return () => { alive = false }
  }, [versionId])
  return state
}
