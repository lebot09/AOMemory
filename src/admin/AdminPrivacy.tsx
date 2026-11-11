import { useState } from 'react'
import { resetDailyScores } from '../scores/daily'
import { clearScores } from '../scores/local'
import { errorText } from './api'

/** What player data the app keeps, where, for how long, and a button to delete all of it. */
export function AdminPrivacy() {
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const deleteAll = async () => {
    if (!window.confirm('Delete all player data? Every leaderboard entry is deleted for everyone, for all days and board sizes. This cannot be undone.')) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const n = await resetDailyScores()
      clearScores()
      setNotice(`All player data deleted: ${n} ${n === 1 ? 'entry' : 'entries'} removed from the database, and the offline copy on this device cleared.`)
    } catch (e) { setError(errorText(e)) }
    setBusy(false)
  }

  return (
    <div className="admin-privacy">
      <h1>Data &amp; privacy</h1>

      <section>
        <h2>What player data this app stores</h2>
        <p>The only player data this app stores is the <strong>Today's best</strong> leaderboard for single-player games. Each entry holds:</p>
        <ul>
          <li>the display name the player typed (max. 20 characters, optional; it is "Guest" if left empty; a nickname is fine)</li>
          <li>the time and number of moves for that game</li>
          <li>the board size, the date, and the time the entry was saved</li>
        </ul>
        <p>No email addresses, accounts, photos, device IDs, locations or contact details are collected from players.
          There is no tracking or analytics, and no cookies are set for players. Names typed for multiplayer games stay
          on the screen in use and are never saved or sent anywhere.</p>
      </section>

      <section>
        <h2>Where it is stored</h2>
        <ul>
          <li><strong>Central database:</strong> leaderboard entries are stored in a Supabase database (PostgreSQL),
            project <code>aomemory_db</code>, hosted on Amazon Web Services in the <strong>eu-west-2 region (London, United Kingdom)</strong>.
            Data is encrypted in transit (HTTPS).</li>
          <li><strong>Access:</strong> the public can only see today's and yesterday's boards. Nobody can change or delete
            entries from the game; only signed-in admins can delete them.</li>
          <li><strong>Offline fallback:</strong> if a screen has no internet connection, its results are kept temporarily in
            that device's browser storage only, and removed automatically the next day.</li>
        </ul>
      </section>

      <section>
        <h2>How long it is stored</h2>
        <p>Entries are kept for at most 3 days and then deleted automatically. The database checks for expired entries
          every hour. Admins can delete all entries at any time with the button below.</p>
      </section>

      <section className="admin-card admin-danger">
        <h2>Delete all player data</h2>
        <p>Removes every leaderboard entry from the central database, for all days and board sizes, plus the offline copy
          on this device. This cannot be undone.</p>
        {error && <p role="alert" className="admin-msg admin-msg--error">{error}</p>}
        {notice && <p role="status" className="admin-msg admin-msg--info">{notice}</p>}
        <button type="button" className="btn" disabled={busy} onClick={() => void deleteAll()}>
          {busy ? 'Deleting…' : 'Delete all player data'}
        </button>
      </section>
    </div>
  )
}
