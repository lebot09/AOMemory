import { useCallback, useEffect, useRef, useState } from 'react'
import { AoLogo } from '../components/Brand'
import { recordGame } from '../lib/cardSets'
import { DEMO_SET_ID } from '../game/demoSet'
import { DIFFICULTY_PAIRS } from '../game/engine'
import { MAX_PLAYERS } from '../game/SetupForm'
import { Game, type GameResult } from '../game/Game'
import { useLoadedFaces } from '../game/useLoadedFaces'
import { BOOTH_BOARD, BOOTH_ZOOM, loadBoothConfig, type BoothConfig } from './config'
import { DailyBoard, rankText } from '../scores/DailyBoard'
import { useDailyBoard } from '../scores/useDailyBoard'
import { StaffMenu } from './StaffMenu'
import { TouchKeyboard } from './TouchKeyboard'
import './booth.css'

type Phase = 'attract' | 'name' | 'playing'

/** Seconds the "Still playing?" prompt waits before resetting. */
const CONFIRM_SECONDS = 10
/** Taps on the hidden corner, within 3 s, that open the staff menu. */
const STAFF_TAPS = 5

export function Booth() {
  const [config, setConfig] = useState<BoothConfig>(loadBoothConfig)
  const pairs = DIFFICULTY_PAIRS[config.difficulty]
  const loaded = useLoadedFaces(config.versionId)
  const [phase, setPhase] = useState<Phase>('attract')
  const [names, setNames] = useState<string[]>([''])
  const [activeName, setActiveName] = useState(0)
  const NAME_MAX = 16
  const [seed, setSeed] = useState(() => Date.now())
  // Shared "Today's best" for this board size; refreshed so the attract screen shows other screens' times.
  const daily = useDailyBoard(pairs, 30)
  const [submitted, setSubmitted] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const [confirmLeft, setConfirmLeft] = useState<number | null>(null)
  const lastActivity = useRef(Date.now())
  const taps = useRef<number[]>([])

  const reset = useCallback(() => {
    setPhase('attract'); setNames(['']); setConfirmLeft(null); setSubmitted(false)
  }, [])

  const activity = useCallback(() => {
    lastActivity.current = Date.now()
    setConfirmLeft(null)
  }, [])

  // Idle watchdog: after idleSeconds without a touch, ask "Still playing?", then reset.
  useEffect(() => {
    if (phase === 'attract' || staffOpen) return
    const t = setInterval(() => {
      const idle = (Date.now() - lastActivity.current) / 1000
      if (idle < config.idleSeconds) return
      const left = Math.ceil(config.idleSeconds + CONFIRM_SECONDS - idle)
      if (left <= 0) reset()
      else setConfirmLeft(left)
    }, 250)
    return () => clearInterval(t)
  }, [phase, staffOpen, config.idleSeconds, reset])

  // Staff menu: Ctrl+Shift+S, or five quick taps on the top-left corner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); setStaffOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const cornerTap = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 3000), now]
    if (taps.current.length >= STAFF_TAPS) { taps.current = []; setStaffOpen(true) }
  }

  const begin = (entered: string[]) => {
    activity()
    setNames(entered.length > 1 ? entered.map((n, i) => n.trim() || `Player ${i + 1}`) : [entered[0]?.trim() || 'Guest'])
    setSeed(Date.now())
    setSubmitted(false)
    setPhase('playing')
    if (config.versionId !== DEMO_SET_ID) void recordGame(config.versionId, 'booth', pairs)
  }

  const onFinish = (r: GameResult) => {
    if (r.players.length > 1) return // today's best times are for solo games
    void daily.submit({ name: r.name, ms: r.ms, moves: r.moves }).then(() => setSubmitted(true))
  }

  return (
    <div className="booth" style={{ '--booth-zoom': BOOTH_ZOOM[config.size], '--booth-board': BOOTH_BOARD[config.size] } as React.CSSProperties} onPointerDown={activity} onKeyDown={activity}>
      <button type="button" className="booth__staff-corner" aria-label="Staff menu" tabIndex={-1} onClick={cornerTap} />

      {phase === 'attract' && (
        <button type="button" className="booth-attract" onClick={() => (config.askName ? setPhase('name') : begin(['Guest']))}>
          <span className="booth-attract__brand"><AoLogo variant="white" height={120} /></span>
          <span className="booth-attract__title">Memory</span>
          <span className="booth-attract__cards" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <span key={i} className="booth-attract__card" style={{ animationDelay: `${i * 0.6}s` }} />)}
          </span>
          <span className="booth-attract__cta">Tap to play</span>
          <span className="booth-attract__sub">Sharp mind. Fast hands. Ready?<br />Match the pairs. Race the clock. Set your best time.</span>
        </button>
      )}

      {phase === 'attract' && (
        <aside className="booth-attract__scores" aria-labelledby="booth-scores-title">
          <h2 id="booth-scores-title">Fastest Minds <em className="booth-attract__scores-mode">Single Player</em> Dashboard</h2>
          <p className="booth-attract__scores-sub">Today's best times</p>
          <DailyBoard board={daily.board} limit={5} />
        </aside>
      )}

      {phase === 'name' && (
        <form className={`booth-name${config.touchKeyboard ? ' booth-name--kb' : ''}`} onSubmit={(e) => { e.preventDefault(); begin(names) }}>
          <div className="booth-players" role="radiogroup" aria-label="Number of players">
            {Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={names.length === n}
                className="booth-players__opt" onClick={() => { activity(); setActiveName(0); setNames((p) => Array.from({ length: n }, (_, k) => p[k] ?? '')) }}>
                {n === 1 ? '1 player' : `${n} players`}
              </button>
            ))}
          </div>
          <h1>{names.length === 1 ? "What's your name?" : "What are your names?"}</h1>
          <p>{names.length === 1 ? "It's shown with your time on today's best. A nickname is fine." : 'Play together on this screen. Take turns, and find a pair to go again.'}</p>
          {names.map((n, i) => (
            <input key={i} aria-label={names.length === 1 ? 'Your name' : `Player ${i + 1} name`} value={n} maxLength={NAME_MAX}
              autoFocus={i === 0} autoComplete="off" className="booth-name__input"
              // With the on-screen keyboard, keep the device's own keyboard from popping up.
              inputMode={config.touchKeyboard ? 'none' : undefined}
              data-active={(config.touchKeyboard && i === Math.min(activeName, names.length - 1)) || undefined}
              onFocus={() => setActiveName(i)}
              placeholder={names.length === 1 ? 'Your name' : `Player ${i + 1}`}
              onChange={(e) => { activity(); setNames((p) => p.map((x, k) => (k === i ? e.target.value : x))) }} />
          ))}
          {config.touchKeyboard && (() => {
            const idx = Math.min(activeName, names.length - 1)
            const edit = (f: (v: string) => string) => setNames((p) => p.map((x, k) => (k === idx ? f(x).slice(0, NAME_MAX) : x)))
            return (
              <TouchKeyboard value={names[idx]} onActivity={activity}
                onKey={(ch) => edit((v) => (ch === ' ' && (v === '' || v.endsWith(' ')) ? v : v + ch))}
                onBackspace={() => edit((v) => v.slice(0, -1))} />
            )
          })()}
          <div className="booth-name__actions">
            <button type="submit" className="btn">Start</button>
            {names.length === 1 && <button type="button" className="btn btn--secondary booth-name__guest" onClick={() => begin(['Guest'])}>Play as guest</button>}
          </div>
        </form>
      )}

      {phase === 'playing' && loaded.status === 'ready' && (
        <div className="booth-game">
          <Game
            key={seed}
            faces={loaded.faces}
            pairs={pairs}
            playerNames={names}
            setName={config.setName}
            seed={seed}
            onExit={reset}
            onPlayAgain={() => (names.length > 1 ? begin(names) : config.askName ? (setNames(['']), setPhase('name')) : begin(['Guest']))}
            onFinish={onFinish}
            onActivity={activity}
            resultsExtra={() => (
              <div className="daily-results">
                {submitted && <p className="daily-rank">{rankText(daily.board, daily.mine)}</p>}
                <DailyBoard board={daily.board} highlight={daily.mine} limit={5} />
              </div>
            )}
          />
        </div>
      )}
      {phase === 'playing' && loaded.status !== 'ready' && (
        <div className="booth-name"><p>{loaded.status === 'error' ? 'This card set is not available. Staff: open the staff menu.' : 'Shuffling cards…'}</p></div>
      )}

      {confirmLeft !== null && (
        <div className="results-backdrop">
          <section className="results" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
            <h2 id="idle-title">Still playing?</h2>
            <p>The game resets in {confirmLeft} seconds.</p>
            <div className="results__actions">
              <button type="button" className="btn" autoFocus onClick={activity}>Keep playing</button>
              <button type="button" className="btn btn--secondary" onClick={reset}>Finish</button>
            </div>
          </section>
        </div>
      )}

      {staffOpen && (
        <StaffMenu
          config={config}
          onClose={() => setStaffOpen(false)}
          onSave={(c) => { setConfig(c); setStaffOpen(false); reset() }}
        />
      )}
    </div>
  )
}
