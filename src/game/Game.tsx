import { useEffect, useRef, useState } from 'react'
import { Board } from './Board'
import { elapsedMs, formatTime, pairsFound, pairsTotal, type Face, type GameState, type Player } from './engine'
import { Scoreboard, winnerText } from './Scoreboard'
import { useGame } from './useGame'
import { ThemeToggle } from '../settings/ThemeToggle'
import './game.css'

export type GameResult = { name: string; ms: number; moves: number; pairs: number; players: Player[] }

type Props = {
  faces: Face[]
  pairs: number
  playerNames: string[]
  seed: number
  setName: string
  onExit: () => void
  onPlayAgain: () => void
  onFinish?: (r: GameResult) => void
  /** Called on every tap, so booth mode can reset its idle timer. */
  onActivity?: () => void
  /** Extra content for the results panel (e.g. booth leaderboard). */
  resultsExtra?: (r: GameResult) => React.ReactNode
}

export function announce(s: GameState): string {
  const l = s.last
  if (!l) return ''
  const names = l.tiles.map((i) => s.tiles[i].label)
  const progress = `${pairsFound(s)} of ${pairsTotal(s)} pairs found.`
  const multi = s.players.length > 1
  switch (l.kind) {
    case 'flip': return names[0]
    case 'match': return `${names[1]}. Match! ${progress}${multi ? ` ${s.players[s.current].name} goes again.` : ''}`
    case 'miss': {
      const next = s.players[(s.current + 1) % s.players.length].name
      return `${names[1]}. No match: ${names[0]} and ${names[1]}.${multi ? ` Next: ${next}.` : ''}`
    }
    case 'won': return `${names[1]}. Match! Board cleared in ${s.moves} moves.${multi ? ` ${winnerText(s.players)}` : ''}`
  }
}

export function Game(props: Props) {
  const { state, flip, now } = useGame(props.faces, props.pairs, props.playerNames, props.seed)
  const finished = state.finishedAt !== null
  const multi = state.players.length > 1
  const ms = elapsedMs(state, now)
  const result: GameResult = { name: state.players[0].name, ms, moves: state.moves, pairs: pairsTotal(state), players: state.players }
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const [reported, setReported] = useState(false)

  useEffect(() => {
    if (!finished || reported) return
    setReported(true)
    props.onFinish?.(result)
    resultsHeading.current?.focus()
  }, [finished, reported]) // eslint-disable-line react-hooks/exhaustive-deps

  const missed = state.last?.kind === 'miss' ? state.last.tiles : []

  return (
    <div className="game">
      <section className="hud" aria-label="Game progress">
        {!multi && <span className="hud__item"><span className="hud__k">Player</span> <span className="hud__v">{state.players[0].name}</span></span>}
        <span className="hud__item"><span className="hud__k">Pairs</span> <span className="hud__v">{pairsFound(state)}/{pairsTotal(state)}</span></span>
        <span className="hud__item"><span className="hud__k">Moves</span> <span className="hud__v">{state.moves}</span></span>
        <span className="hud__item"><span className="hud__k">Time</span> <span className="hud__v" aria-hidden="true">{formatTime(ms)}</span></span>
        <ThemeToggle className="hud__theme" />
        <button type="button" className="btn btn--secondary btn--small" onClick={props.onExit}>Quit</button>
      </section>
      {multi && <Scoreboard players={state.players} current={state.current} finished={finished} />}
      {multi && !finished && (
        // Big, glanceable turn marker for a shared screen. Screen readers get the turn from the announcer.
        <p className="turn-banner" key={state.current} aria-hidden="true">
          Your turn, <span className="turn-banner__name">{state.players[state.current].name}</span>
        </p>
      )}

      <p className="visually-hidden" aria-live="assertive">{announce(state)}</p>

      <Board
        tiles={state.tiles}
        missed={missed}
        disabled={finished}
        onFlip={(i) => { props.onActivity?.(); flip(i) }}
      />

      {finished && (
        <div className="results-backdrop">
          <section className="results" role="dialog" aria-modal="true" aria-labelledby="results-title">
            <h2 id="results-title" tabIndex={-1} ref={resultsHeading}>{multi ? winnerText(state.players) : 'Board cleared!'}</h2>
            {multi ? (
              <ol className="results__players">
                {[...state.players].sort((a, b) => b.pairs - a.pairs).map((p, i) => (
                  <li key={i}><span>{p.name}</span><strong>{p.pairs} {p.pairs === 1 ? 'pair' : 'pairs'}</strong></li>
                ))}
              </ol>
            ) : (
              <p className="results__lead">Well done, {result.name}. You found all {result.pairs} pairs of {props.setName}.</p>
            )}
            <dl className="results__stats">
              <div><dt>Time</dt><dd>{formatTime(result.ms)}</dd></div>
              <div><dt>Moves</dt><dd>{result.moves}</dd></div>
            </dl>
            {props.resultsExtra?.(result)}
            <div className="results__actions">
              <button type="button" className="btn" onClick={props.onPlayAgain}>Play again</button>
              <button type="button" className="btn btn--secondary" onClick={props.onExit}>Done</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
