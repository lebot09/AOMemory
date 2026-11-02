/** Card aspect ratio (width / height). */
export const CARD_ASPECT = 3 / 4

/**
 * Pick the column count that makes cards as large as possible inside a
 * width x height area, for `count` cards with `gap` px between them.
 */
export function bestGrid(count: number, width: number, height: number, gap: number): { cols: number; rows: number; cardWidth: number } {
  let best = { cols: 1, rows: count, cardWidth: 0 }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const byWidth = (width - gap * (cols - 1)) / cols
    const byHeight = ((height - gap * (rows - 1)) / rows) * CARD_ASPECT
    const cardWidth = Math.floor(Math.min(byWidth, byHeight))
    if (cardWidth > best.cardWidth) best = { cols, rows, cardWidth }
  }
  return best
}
