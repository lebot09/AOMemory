import type { Player } from './engine'

/** Player list for multiplayer games. The player whose turn it is gets a yellow marker. */
export function Scoreboard({ players, current, finished }: { players: Player[]; current: number; finished: boolean }) {
  return (
    <ol className="scoreboard" aria-label="Scores">
      {players.map((p, i) => {
        const active = !finished && i === current
        return (
          <li key={i} className="scoreboard__player" data-active={active || undefined} aria-current={active ? 'true' : undefined}>
            <span className="scoreboard__name">{p.name}</span>
            <span className="scoreboard__pairs">{p.pairs}<span className="visually-hidden"> pairs</span></span>
            {active && <span className="scoreboard__turn">Turn</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function winners(players: Player[]): Player[] {
  const best = Math.max(...players.map((p) => p.pairs))
  return players.filter((p) => p.pairs === best)
}

export function winnerText(players: Player[]): string {
  const w = winners(players)
  if (w.length === players.length) return "It's a tie!"
  if (w.length > 1) return `${w.map((p) => p.name).join(' and ')} tie for the win!`
  return `${w[0].name} wins!`
}
