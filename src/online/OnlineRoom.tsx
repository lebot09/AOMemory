import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Board } from '../game/Board'
import { formatTime } from '../game/engine'
import { Scoreboard, winnerText } from '../game/Scoreboard'
import { flipTile, joinRoom, loadSeat, normaliseCode, roomError, startRoom, toPlayers, toTiles, type RoomState, type Seat } from './api'
import { useRoom } from './useRoom'
import '../game/game.css'
import './online.css'

function announce(room: RoomState, mySeat: number): string {
  const label = (i: number) => room.tiles[i]?.card?.label ?? 'card'
  const [a, b] = room.last_idx
  const me = room.current_seat === mySeat
  const next = room.players.find((p) => p.seat === room.current_seat)?.name ?? ''
  switch (room.last_kind) {
    case 'flip': return label(a)
    case 'match': return `${label(b)}. Match! ${me ? 'Your turn again.' : `${next} goes again.`}`
    case 'miss': return `${label(b)}. No match: ${label(a)} and ${label(b)}. ${me ? 'Your turn.' : `${next}'s turn.`}`
    case 'won': return `Board cleared. ${winnerText(toPlayers(room))}`
    default: return me ? 'Your turn.' : ''
  }
}

function JoinFromLink({ code, onJoined }: { code: string; onJoined: (s: Seat) => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <form className="admin-card online__join" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError(null)
      try { onJoined(await joinRoom(code, name)) } catch (err) { setError(roomError(err)); setBusy(false) }
    }}>
      <h1>Join game {code}</h1>
      <label className="setup__label" htmlFor="join-name">Your name</label>
      <input id="join-name" className="setup__input" maxLength={20} autoFocus autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      {error && <p role="alert" className="admin-msg admin-msg--error">{error}</p>}
      <button type="submit" className="btn" disabled={busy}>Join</button>
    </form>
  )
}

function Lobby({ room, seat }: { room: RoomState; seat: Seat }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const link = `${window.location.origin}${import.meta.env.BASE_URL}online/${room.code}`
  const host = seat.seat === 0
  return (
    <div className="page online">
      <h1>Waiting for players</h1>
      <div className="online__lobby">
        <div className="admin-card online__share">
          <span className="hud__k">Game code</span>
          <span className="online__code" aria-label={`Game code ${room.code.split('').join(' ')}`}>{room.code}</span>
          <p>Others go to <strong>Play online</strong> and enter this code, or open this link:</p>
          <div className="admin-row">
            <input className="setup__input" readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn--secondary btn--small" onClick={async () => {
              try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* not allowed: they can copy by hand */ }
            }}>{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </div>
        <div className="admin-card">
          <h2>Players ({room.players.length} of 4)</h2>
          <ol className="online__players" aria-live="polite">
            {room.players.map((p) => (
              <li key={p.seat}>{p.name}{p.seat === 0 && ' (host)'}{p.seat === seat.seat && ' (you)'}</li>
            ))}
          </ol>
          <p className="setup__note">{room.set_name} · {room.pairs * 2} cards</p>
          {error && <p role="alert" className="admin-msg admin-msg--error">{error}</p>}
          {host ? (
            <button type="button" className="btn" disabled={busy || room.players.length < 2}
              onClick={async () => { setBusy(true); try { await startRoom(seat) } catch (e) { setError(roomError(e)) } setBusy(false) }}>
              {room.players.length < 2 ? 'Waiting for another player…' : 'Start game'}
            </button>
          ) : <p>Waiting for the host to start…</p>}
        </div>
      </div>
    </div>
  )
}

export function OnlineRoom() {
  const code = normaliseCode(useParams().code ?? '')
  const [seat, setSeat] = useState<Seat | null>(() => loadSeat(code))
  const { room, error, missing, refresh } = useRoom(code)
  const [busy, setBusy] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const resultsHeading = useRef<HTMLHeadingElement>(null)

  const playing = room?.status === 'playing'
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [playing])
  useEffect(() => { if (room?.status === 'finished') resultsHeading.current?.focus() }, [room?.status])

  const tiles = useMemo(() => (room ? toTiles(room) : []), [room])

  if (missing) return <div className="page"><h1>Game not found</h1><p>Check the code. Games are removed after a day.</p><Link className="btn" to="/online">Back</Link></div>
  if (!room) return <div className="page" aria-live="polite"><p>{error ?? 'Connecting…'}</p></div>
  if (!seat) {
    if (room.status !== 'lobby') return <div className="page"><h1>This game has already started</h1><Link className="btn" to="/online">Start or join another game</Link></div>
    return <div className="page"><JoinFromLink code={code} onJoined={(s) => { setSeat(s); void refresh() }} /></div>
  }
  if (room.status === 'lobby') return <Lobby room={room} seat={seat} />

  const myTurn = room.status === 'playing' && room.current_seat === seat.seat
  const players = toPlayers(room)
  const elapsed = room.started_at ? (room.finished_at ? Date.parse(room.finished_at) : now) - Date.parse(room.started_at) : 0
  const missed = room.last_kind === 'miss' && room.open_idx.length === 2 ? room.open_idx : []
  const current = room.players.findIndex((p) => p.seat === room.current_seat)
  const turnName = room.players[current]?.name

  const flip = async (i: number) => {
    if (!myTurn || busy) return
    setBusy(true); setMoveError(null)
    try { await flipTile(seat, i); await refresh() } catch (e) { setMoveError(roomError(e)) }
    setBusy(false)
  }

  return (
    <div className="game">
      <section className="hud" aria-label="Game progress">
        <span className="hud__item"><span className="hud__k">Game</span> <span className="hud__v">{room.code}</span></span>
        <span className="hud__item"><span className="hud__k">Moves</span> <span className="hud__v">{room.moves}</span></span>
        <span className="hud__item"><span className="hud__k">Time</span> <span className="hud__v" aria-hidden="true">{formatTime(Math.max(0, elapsed))}</span></span>
        <span className={`online__turn${myTurn ? ' online__turn--me' : ''}`}>
          {room.status === 'finished' ? 'Game over' : myTurn ? 'Your turn' : `${turnName}'s turn`}
        </span>
        <Link className="btn btn--secondary btn--small hud__exit" to="/online">Leave</Link>
      </section>
      <Scoreboard players={players} current={current} finished={room.status === 'finished'} />
      {(moveError || error) && <p role="alert" className="admin-msg admin-msg--error">{moveError ?? error}</p>}
      <p className="visually-hidden" aria-live="assertive">{announce(room, seat.seat)}</p>

      <Board tiles={tiles} missed={missed} disabled={!myTurn || busy} onFlip={(i) => void flip(i)} />

      {room.status === 'finished' && (
        <div className="results-backdrop">
          <section className="results" role="dialog" aria-modal="true" aria-labelledby="results-title">
            <h2 id="results-title" tabIndex={-1} ref={resultsHeading}>{winnerText(players)}</h2>
            <ol className="results__players">
              {[...room.players].sort((a, b) => b.pairs - a.pairs).map((p) => (
                <li key={p.seat}><span>{p.name}{p.seat === seat.seat && ' (you)'}</span><strong>{p.pairs} {p.pairs === 1 ? 'pair' : 'pairs'}</strong></li>
              ))}
            </ol>
            <dl className="results__stats">
              <div><dt>Time</dt><dd>{formatTime(Math.max(0, elapsed))}</dd></div>
              <div><dt>Moves</dt><dd>{room.moves}</dd></div>
            </dl>
            <div className="results__actions">
              <Link className="btn" to="/online">New online game</Link>
              <Link className="btn btn--secondary" to="/">Done</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
