import type { Face } from './engine'

/**
 * Built-in demo set: simple shapes, so the game works offline and before any
 * card set has been approved in the admin area. Neutral artwork only, no AO marks.
 */
const SHAPES: Record<string, string> = {
  Circle: '<circle cx="50" cy="50" r="34"/>',
  Square: '<rect x="18" y="18" width="64" height="64" rx="6"/>',
  Triangle: '<path d="M50 14 88 82H12z"/>',
  Diamond: '<path d="M50 10 88 50 50 90 12 50z"/>',
  Star: '<path d="m50 10 11.8 24 26.5 3.8-19.2 18.7 4.5 26.4L50 70.4 26.4 82.9l4.5-26.4L11.7 37.8l26.5-3.8z"/>',
  Hexagon: '<path d="M30 15h40l20 35-20 35H30L10 50z"/>',
  Heart: '<path d="M50 86 16 52a20 20 0 0 1 34-28 20 20 0 0 1 34 28z"/>',
  Cross: '<path d="M38 12h24v26h26v24H62v26H38V62H12V38h26z"/>',
  Ring: '<path fill-rule="evenodd" d="M50 14a36 36 0 1 1 0 72 36 36 0 0 1 0-72zm0 18a18 18 0 1 0 0 36 18 18 0 0 0 0-36z"/>',
  Moon: '<path d="M62 12a38 38 0 1 0 26 58A32 32 0 0 1 62 12z"/>',
  Bolt: '<path d="M58 8 18 56h26l-6 36 42-50H54z"/>',
  Drop: '<path d="M50 8C38 30 22 46 22 62a28 28 0 0 0 56 0C78 46 62 30 50 8z"/>',
  Arrow: '<path d="M14 40h40V20l32 30-32 30V60H14z"/>',
  Leaf: '<path d="M84 14C40 14 16 36 16 66c0 8 2 14 4 18 30-2 64-20 64-70zM24 80l30-34"/>',
  Plus: '<path d="M44 14h12v30h30v12H56v30H44V56H14V44h30z"/>',
}

function svgDataUrl(body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#042d98" stroke="none">${body}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const DEMO_SET_ID = 'demo'
export const DEMO_SET_NAME = 'Shapes (demo)'

export const DEMO_FACES: Face[] = Object.entries(SHAPES).map(([name, body]) => ({
  pairId: `demo-${name.toLowerCase()}`,
  label: name,
  altText: `${name} shape`,
  imageUrl: svgDataUrl(body),
}))
