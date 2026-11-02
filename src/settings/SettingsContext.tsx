import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applySettings, loadSettings, saveSettings, type Settings } from './settings'

type Ctx = { settings: Settings; update: (patch: Partial<Settings>) => void }
const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  useEffect(() => { applySettings(settings); saveSettings(settings) }, [settings])
  // "Follow device": re-apply when the device switches between light and dark.
  useEffect(() => {
    if (settings.theme !== 'system' || typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applySettings(settings)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings])
  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
