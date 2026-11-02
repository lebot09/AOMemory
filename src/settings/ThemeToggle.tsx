import { useSettings } from './SettingsContext'
import { resolvedTheme } from './settings'

/** One-tap light/dark switch, shown while playing. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { settings, update } = useSettings()
  const dark = resolvedTheme(settings.theme) === 'dark'
  return (
    <button type="button" className={`btn btn--secondary btn--small theme-toggle ${className}`}
      aria-pressed={dark} onClick={() => update({ theme: dark ? 'light' : 'dark' })}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {dark
          ? <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          : <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
      </svg>
      Dark mode
    </button>
  )
}
