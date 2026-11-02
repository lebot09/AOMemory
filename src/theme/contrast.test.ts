import { describe, expect, it } from 'vitest'

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const AO = {
  blue: '#042d98', yellow: '#fff500', activeBlue: '#3b7ff6', darkGray: '#333333',
  darkBlue: '#001b62', white: '#ffffff', lightBlue: '#edf0f6', lightGray: '#f7f7f7',
}

describe('AO color pairings used by the app meet WCAG AA', () => {
  it.each([
    ['body text on white', AO.darkGray, AO.white, 4.5],
    ['body text on light gray', AO.darkGray, AO.lightGray, 4.5],
    ['headings on white', AO.blue, AO.white, 4.5],
    ['white text on AO blue header', AO.white, AO.blue, 4.5],
    ['white on AO blue (selected options)', AO.white, AO.blue, 4.5],
    ['AO yellow on AO blue (active nav, highlights)', AO.yellow, AO.blue, 4.5],
    ['AO blue on AO yellow (badges)', AO.blue, AO.yellow, 4.5],
    ['white on dark blue (card backs, booth)', AO.white, AO.darkBlue, 4.5],
    ['white on active blue buttons (large bold text only)', AO.white, AO.activeBlue, 3],
    ['active blue outline/links on white (non-text, 3:1)', AO.activeBlue, AO.white, 3],
  ])('%s', (_name, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min)
  })

  it('white on active blue is below 4.5:1, so it must not be used for small text', () => {
    expect(contrast(AO.white, AO.activeBlue)).toBeLessThan(4.5)
  })
})
