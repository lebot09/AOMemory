import type { Difficulty } from '../game/engine'
import { DEMO_OPTION } from '../game/SetupForm'

export type BoothConfig = {
  versionId: string
  setName: string
  difficulty: Difficulty
  /** Seconds without a touch before "Still playing?" appears. */
  idleSeconds: number
  askName: boolean
}

export const DEFAULT_BOOTH: BoothConfig = {
  versionId: DEMO_OPTION.versionId, setName: DEMO_OPTION.name, difficulty: 'medium', idleSeconds: 45, askName: true,
}

const KEY = 'ao-memory:booth-config'

export function loadBoothConfig(): BoothConfig {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_BOOTH, ...(JSON.parse(raw) as Partial<BoothConfig>) } : DEFAULT_BOOTH
  } catch { return DEFAULT_BOOTH }
}

export function saveBoothConfig(c: BoothConfig): void {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* ignore */ }
}
