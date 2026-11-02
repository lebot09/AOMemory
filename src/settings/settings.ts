export type Contrast = 'standard' | 'high'
export type Motion = 'system' | 'reduced' | 'full'
export type TextSize = 'normal' | 'large' | 'larger'
export type Theme = 'light' | 'dark' | 'system'

export type Settings = { contrast: Contrast; motion: Motion; textSize: TextSize; theme: Theme }

export const DEFAULT_SETTINGS: Settings = { contrast: 'standard', motion: 'system', textSize: 'normal', theme: 'light' }

export const TEXT_SCALE: Record<TextSize, number> = { normal: 1, large: 1.25, larger: 1.5 }

const KEY = 'ao-memory:settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: keep in memory only */ }
}

export function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** The theme actually shown: 'system' follows the device. */
export function resolvedTheme(theme: Theme, prefersDark = systemPrefersDark()): 'light' | 'dark' {
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
}

/** Mirror settings onto <html> so CSS tokens switch without re-rendering. */
export function applySettings(s: Settings, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = resolvedTheme(s.theme)
  root.dataset.contrast = s.contrast
  if (s.motion === 'system') delete root.dataset.motion
  else root.dataset.motion = s.motion
  if (s.textSize === 'normal') root.style.removeProperty('--text-scale')
  else root.style.setProperty('--text-scale', String(TEXT_SCALE[s.textSize]))
}
