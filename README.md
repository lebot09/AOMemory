# AO Memory

A memory card game for web, phones, tablets and conference booth touch screens. Players flip cards to find matching pairs until the board is cleared.

## Status

| Step | What | State |
| --- | --- | --- |
| 1 | Foundations: app shell, AO theme, accessibility settings, database and versioning | done |
| 2 | Single-player game, touch and keyboard play, booth mode | done |
| 3 | Admin interface for card sets | done |
| 4 | Multiplayer: 2 to 4 players taking turns on one big screen | done |

## Run it

```bash
cp .env.example .env   # Supabase URL + publishable key (safe for the browser)
npm install
npm run dev            # http://localhost:5173
npm test               # unit tests (game rules, layout, leaderboard, color contrast)
npm run build          # production build with offline support
```

## How card set versions work

The database lives in the `aomemory_db` Supabase project; the schema is in `supabase/migrations/`.

- A **card set** has numbered **versions**. Each version moves `draft → approved → superseded → retired`.
- Admins edit only drafts. Once a version is approved, the database refuses any change to it or its cards.
- Exactly one version per set is `approved`; that's what new games use. Approving a new draft marks the old one `superseded`.
- Every game stores the exact version id it started with, and superseded or retired versions stay readable, so updates never break a game in progress.
- Players (signed in or not) can never see drafts. Only admins can write.
- Card images live in the public `card-images` storage bucket and are never overwritten. A changed image is uploaded under a new name, so older versions keep their pictures.

### Admin area

Go to **Admin** (`/admin`) and sign in with email and password.

1. **Create a card set**: give it a name. Version 1 starts as a draft.
2. **Add cards**: drop images or choose files. Each image becomes one card and is resized to 1024 px WebP. Then edit each card's name, alt text (a short description of the picture for screen reader users) and optional tags. Changes save when you leave a field.
3. **Approve and go live**: you need at least 2 cards with different names and alt text. The version is then frozen and new games use it.
4. **Update later**: **Start version N+1** copies the live cards into a new draft. Players keep the live version until you approve the new one, and games in progress are never affected. **Discard draft** throws a draft away. **Retire set** hides the set from players.

### Adding an admin

Anyone can create an account, but only admins can manage card sets. After the person has created an account (and confirmed their email), run this in the Supabase SQL editor:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'person@example.org';
```

## Hosting

It's a static site: `npm run build` produces `dist/`, and the Supabase settings in `.env` are built into it.

### Hostinger

`public/.htaccess` is included in the build. It sends every page (`/play`, `/booth`, `/admin/...`) to the app, forces HTTPS, and sets cache headers so updates show up right away. It was tested on Apache.

**Option A: automatic (recommended).** Every push to `main` runs the **Build for Hostinger** GitHub Action. It runs the tests, builds the site and puts the ready-to-serve files on the `hostinger` branch. To set it up in hPanel:
1. Go to **Websites › your site › Advanced › Git**.
2. Add the repository `https://github.com/lebot09/AOMemory.git` with branch **hostinger** and an empty install path (that means `public_html`). For a private repo, add the SSH key that hPanel shows as a deploy key in GitHub (**Settings › Deploy keys**).
3. Click **Deploy**. To update automatically, copy the webhook URL hPanel shows into GitHub (**Settings › Webhooks**).

**Option B: manual upload.** Run `npm run build` locally, then upload the *contents* of `dist/` (including the hidden `.htaccess`) into `public_html` with hPanel's File Manager or FTP.

Turn on the free SSL certificate in hPanel. HTTPS is required for the installable, offline app.

### GitHub Pages (test copy)

Every push to `main` also publishes a test copy to **https://lebot09.github.io/AOMemory/** (`.github/workflows/pages.yml`). One-time setup: go to **Settings › Pages** and set Source to **GitHub Actions**. Pages on a private repository needs a paid GitHub plan (Pro, Team or Enterprise); on a free plan, the repository has to be public.

### Vercel / Netlify

`vercel.json` (Vercel) and `public/_redirects` (Netlify) handle routing. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.example` in the host's environment settings.

### Supabase sign-in links

In Supabase, go to **Authentication › URL Configuration** and set **Site URL** to your live address (e.g. `https://memory.example.org`), so admin confirmation emails link back to the site.

## Today's best (single player)

- Every single-player game (on **Play** or in booth mode) adds its time to **Today's best**. There is one board per number of cards (12, 20 or 30), ranked by time, then moves.
- The boards are shared by every screen through the `daily_scores` table and start fresh each day (the player's local date). Only the display name the player typed is stored, and entries older than 3 days are deleted automatically by an hourly database job (`purge_old_daily_scores`, scheduled with pg_cron).
- Scores go in only through `submit_daily_score`, which checks the date and that the time and moves are possible. Nobody can edit or delete them from the browser.
- Admins can wipe one board or all of them to zero under **Admin › Today's best** (`/admin/scores`), using `reset_daily_scores`.
- Offline, a screen keeps its own board in the browser until the connection is back.
- **Admin › Data & privacy** (`/admin/privacy`) explains for legal what player data is stored, where and for how long, and has a **Delete all player data** button.

## Multiplayer

Multiplayer is played together on one screen (a booth display, TV or tablet), not online.

- On **Play**, or in booth mode after tapping the attract screen, pick 2 to 4 players and type their names.
- Players take turns flipping two cards. Finding a pair earns that player another turn; a miss passes the turn on.
- The scoreboard and a large "Your turn, *Name*" banner show whose turn it is, readable from a few metres away. Screen readers hear who plays next after each move.
- At the end, players are ranked by pairs found. **Play again** starts a rematch with the same names.
- Multiplayer names stay on the device and are never sent anywhere. Multiplayer games have no scoreboard.

## Branding

Colors, type sizes and button styles follow the AO Digital Style Guide v2.0 (March 2021); see `src/theme/tokens.css`.

- **Logo:** `public/brand/ao-logo-blue.svg` and `ao-logo-white.svg` are the exact vector from page 7 of the style guide. Blue goes on light backgrounds and white on blue, with clear space of half the logo height.
- **Font:** Suisse Int'l is licensed, so the app uses Inter, a free font close to it, with Arial as the fallback.

## Booth mode

Open `/booth` on the booth screen (or tap **Booth mode** on the home page), then use the staff menu to go full screen.

- An attract screen with the AO logo and today's best times runs until someone taps.
- Players can enter a display name (optional) and play. Results show their rank for the day.
- **On-screen keyboard:** names are typed on a large keyboard shown on screen (with capitals, accents and digits), so the booth needs no physical keyboard. The device's own pop-up keyboard is suppressed. Turn it off in the staff menu if a keyboard is attached.
- If nobody touches the screen for 45 seconds (configurable), "Still playing?" appears. After 10 more seconds it resets to the attract screen.
- **Staff menu:** tap the top-left corner 5 times quickly, or press Ctrl+Shift+S. From there you can choose the card set and difficulty, set the screen size (Small, Medium or Large), set the idle time, turn name entry and the on-screen keyboard on or off, toggle full screen and change display settings. Today's best times are reset in **Admin › Today's best**.
- After one online visit, the game works offline. The built-in "Shapes (demo)" set is always available.

## Accessibility

- Light and dark themes: a **Dark mode** button sits next to Quit while playing, and **Settings** also offers "Follow device". The dark theme is built from the AO palette (deep navy page, AO blue card backs, yellow highlights). The admin area always stays light.
- Display settings for high contrast, three text sizes and reduced motion. The choice is remembered on the device, and the device's reduced-motion preference is followed by default.
- All touch targets are at least 48px (72px on booth-size screens), with visible focus rings and a skip link.
- White on AO active blue (3.7:1) is only used for large bold button text. High-contrast mode switches buttons to AO blue. `src/theme/contrast.test.ts` checks every color pairing.

## Privacy

The game collects no email or other personal data. A single player's display name (any name or nickname they type) is shown with their time on Today's best and deleted automatically after 3 days. Multiplayer names stay on the device and are cleared when a game resets.
