import { useCallback, useEffect, useRef, useState } from 'react'
import { AoLogo } from '../components/Brand'
import { recordGame } from '../lib/cardSets'
import { DEMO_SET_ID } from '../game/demoSet'
import { DIFFICULTY_PAIRS, formatTime } from '../game/engine'
import { Game, type GameResult } from '../game/Game'
import { useLoadedFaces } from '../game/useLoadedFaces'
import { loadBoothConfig, type BoothConfig } from './config'
import { addScore, loadScores, saveScores, type Score } from './leaderboard'
import { StaffMenu } from './StaffMenu'
import './booth.css'

type Phase = 'attract' | 'name' | 'playing'

/** Seconds the "Still playing?" prompt waits before resetting. */
const CONFIRM_SECONDS = 10
/** Taps on the hidden corner, within 3 s, that open the staff menu. */
const STAFF_TAPS = 5

function Leaderboard({ scores, highlight }: { scores: Score[]; highlight?: Score }) {
  if (scores.length === 0) return <p className="booth-board__empty">No times yet today. Be the first!</p>
  return (
    <ol className="booth-board">
      {scores.map((s, i) => (
        <li key={`${s.at}-${i}`} data-me={s === highlight || undefined}>
          <span className="booth-board__pos">{i + 1}</span>
          <span className="booth-board__name">{s.name}</span>
          <span className="booth-board__time">{formatTime(s.ms)}</span>
          <span className="booth-board__moves">{s.moves} moves</span>
        </li>
      ))}
    </ol>
  )
}

export function Booth() {
  const [config, setConfig] = useState<BoothConfig>(loadBoothConfig)
  const pairs = DIFFICULTY_PAIRS[config.difficulty]
  const loaded = useLoadedFaces(config.versionId)
  const [phase, setPhase] = useState<Phase>('attract')
  const [name, setName] = useState('')
  const [seed, setSeed] = useState(() => Date.now())
  const [scores, setScores] = useState<Score[]>(() => loadScores(pairs))
  const [lastScore, setLastScore] = useState<Score | undefined>()
  const [staffOpen, setStaffOpen] = useState(false)
  const [confirmLeft, setConfirmLeft] = useState<number | null>(null)
  const lastActivity = useRef(Date.now())
  const taps = useRef<number[]>([])

  useEffect(() => { setScores(loadScores(pairs)) }, [pairs])

  const reset = useCallback(() => {
    setPhase('attract'); setName(''); setConfirmLeft(null); setLastScore(undefined)
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

  const begin = (playerName: string) => {
    activity()
    setName(playerName.trim() || 'Guest')
    setSeed(Date.now())
    setLastScore(undefined)
    setPhase('playing')
    if (config.versionId !== DEMO_SET_ID) void recordGame(config.versionId, 'booth', pairs)
  }

  const onFinish = (r: GameResult) => {
    const score: Score = { name: r.name, ms: r.ms, moves: r.moves, pairs, at: Date.now() }
    const { scores: next } = addScore(scores, score)
    setScores(next); saveScores(pairs, next); setLastScore(score)
  }

  const position = lastScore ? scores.indexOf(lastScore) + 1 : 0

  return (
    <div className="booth" onPointerDown={activity} onKeyDown={activity}>
      <button type="button" className="booth__staff-corner" aria-label="Staff menu" tabIndex={-1} onClick={cornerTap} />

      {phase === 'attract' && (
        <button type="button" className="booth-attract" onClick={() => (config.askName ? setPhase('name') : begin('Guest'))}>
          <span className="booth-attract__brand"><AoLogo variant="white" height={120} /></span>
          <span className="booth-attract__title">Memory</span>
          <span className="booth-attract__cards" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <span key={i} className="booth-attract__card" style={{ animationDelay: `${i * 0.6}s` }} />)}
          </span>
          <span className="booth-attract__cta">Tap to play</span>
          <span className="booth-attract__sub">Find all the matching pairs as fast as you can</span>
        </button>
      )}

      {phase === 'attract' && (
        <aside className="booth-attract__scores" aria-label="Today's best times">
          <h2>Today's best</h2>
          <Leaderboard scores={scores.slice(0, 5)} />
        </aside>
      )}

      {phase === 'name' && (
        <form className="booth-name" onSubmit={(e) => { e.preventDefault(); begin(name) }}>
          <h1>What's your name?</h1>
          <p>It's only shown on today's best times on this screen.</p>
          <input aria-label="Your name" value={name} maxLength={16} autoFocus autoComplete="off"
            onChange={(e) => { activity(); setName(e.target.value) }} className="booth-name__input" placeholder="Your name" />
          <div className="booth-name__actions">
            <button type="submit" className="btn">Start</button>
            <button type="button" className="btn btn--secondary booth-name__guest" onClick={() => begin('Guest')}>Play as guest</button>
          </div>
        </form>
      )}

      {phase === 'playing' && loaded.status === 'ready' && (
        <div className="booth-game">
          <Game
            key={seed}
            faces={loaded.faces}
            pairs={pairs}
            playerName={name}
            setName={config.setName}
            seed={seed}
            onExit={reset}
            onPlayAgain={() => (config.askName ? (setName(''), setPhase('name')) : begin('Guest'))}
            onFinish={onFinish}
            onActivity={activity}
            resultsExtra={() => (
              <div className="booth-results">
                {position > 0 && <p className="booth-results__rank">You're number {position} today!</p>}
                <Leaderboard scores={scores.slice(0, 5)} highlight={lastScore} />
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
          onScoresCleared={() => setScores([])}
        />
      )}
    </div>
  )
}
