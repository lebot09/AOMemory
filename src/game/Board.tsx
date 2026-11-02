import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Tile } from './engine'
import { bestGrid } from './layout'
import './board.css'

type Props = {
  tiles: Tile[]
  missed: number[]
  disabled?: boolean
  onFlip: (index: number) => void
}

function tileLabel(t: Tile, i: number): string {
  const pos = `Card ${i + 1}`
  if (t.matched) return `${pos}, ${t.label}, matched`
  if (t.faceUp) return `${pos}, ${t.label}`
  return `${pos}, face down`
}

export function Board({ tiles, missed, disabled, onFlip }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [focus, setFocus] = useState(0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const gap = size.width > 1600 ? 20 : size.width > 700 ? 12 : 6
  const grid = bestGrid(tiles.length, size.width, size.height, gap)

  // Arrow keys move between cards (roving tabindex); Enter/Space flip via the button itself.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowRight: 1, ArrowLeft: -1, ArrowDown: grid.cols, ArrowUp: -grid.cols,
    }
    let next = focus
    if (e.key in step) next = focus + step[e.key]
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tiles.length - 1
    else return
    e.preventDefault()
    next = Math.max(0, Math.min(tiles.length - 1, next))
    setFocus(next)
    buttons.current[next]?.focus()
  }

  return (
    <div className="board-area" ref={ref}>
      <div
        className="board"
        role="group"
        aria-label={`Game board, ${tiles.length} cards in ${grid.rows} rows of ${grid.cols}`}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, ${grid.cardWidth}px)`,
          gap: `${gap}px`,
          ['--card-w' as string]: `${grid.cardWidth}px`,
        }}
      >
        {tiles.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { buttons.current[i] = el }}
            type="button"
            className="tile"
            data-face-up={t.faceUp || undefined}
            data-matched={t.matched || undefined}
            data-missed={missed.includes(i) || undefined}
            tabIndex={i === focus ? 0 : -1}
            aria-label={tileLabel(t, i)}
            aria-disabled={disabled || t.faceUp || t.matched || undefined}
            onFocus={() => setFocus(i)}
            onClick={() => { if (!disabled) onFlip(i) }}
          >
            <span className="tile__inner" aria-hidden="true">
              <span className="tile__back" />
              <span className="tile__front">
                {t.imageUrl && <img src={t.imageUrl} alt="" draggable={false} />}
                <span className="tile__label">{t.label}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
