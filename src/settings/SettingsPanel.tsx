import { useSettings } from './SettingsContext'
import type { Contrast, Motion, TextSize, Theme } from './settings'
import './settings.css'

function Choice<T extends string>(props: {
  legend: string; name: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <fieldset className="choice">
      <legend>{props.legend}</legend>
      {props.options.map((o) => (
        <label key={o.value} className="choice__option">
          <input type="radio" name={props.name} value={o.value}
            checked={props.value === o.value} onChange={() => props.onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

export function SettingsPanel() {
  const { settings, update } = useSettings()
  return (
    <section aria-labelledby="settings-title" className="settings">
      <h2 id="settings-title">Display settings</h2>
      <Choice<Theme> legend="Theme" name="theme" value={settings.theme}
        options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Follow device' }]}
        onChange={(theme) => update({ theme })} />
      <Choice<Contrast> legend="Contrast" name="contrast" value={settings.contrast}
        options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High contrast' }]}
        onChange={(contrast) => update({ contrast })} />
      <Choice<TextSize> legend="Text size" name="text-size" value={settings.textSize}
        options={[{ value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }, { value: 'larger', label: 'Larger' }]}
        onChange={(textSize) => update({ textSize })} />
      <Choice<Motion> legend="Animations" name="motion" value={settings.motion}
        options={[{ value: 'system', label: 'Follow device' }, { value: 'reduced', label: 'Reduced' }, { value: 'full', label: 'Full' }]}
        onChange={(motion) => update({ motion })} />
    </section>
  )
}
