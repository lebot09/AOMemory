import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="page">
      <h1>Find the matching pairs</h1>
      <p>Flip two cards at a time. Match every pair to clear the board.</p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <Link className="btn" to="/play">Play now</Link>
        <Link className="btn btn--secondary" to="/online">Play online</Link>
        <Link className="btn btn--secondary" to="/booth">Booth mode</Link>
        <Link className="btn btn--secondary" to="/settings">Display settings</Link>
      </div>
    </div>
  )
}
