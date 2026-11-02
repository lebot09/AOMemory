import type { Difficulty } from '../game/engine'
import { DEMO_OPTION } from '../game/SetupForm'

export type BoothSize = 'small' | 'medium' | 'large'
/** Zoom factor per size; 'large' is the original booth sizing. */
export const BOOTH_ZOOM: Record<BoothSize, number> = { small: 0.7, medium: 0.82, large: 1 }
/** Share of the screen the card board may use per size. */
export const BOOTH_BOARD: Record<BoothSize, number> = { small: 0.72, medium: 0.86, large: 1 }

export type BoothConfig = {
  versionId: string
  setName: string
  difficulty: Difficulty
  /** Seconds without a touch before "Still playing?" appears. */
  idleSeconds: number
  askName: boolean
  /** Show an on-screen keyboard for names, so the booth needs no physical keyboard. */
  touchKeyboard: boolean
  /** Overall size of text, buttons and keyboard on the booth screen. */
  size: BoothSize
}

export const DEFAULT_BOOTH: BoothConfig = {
  versionId: DEMO_OPTION.versionId, setName: DEMO_OPTION.name, difficulty: 'medium', idleSeconds: 45, askName: true, touchKeyboard: true, size: 'medium',
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
