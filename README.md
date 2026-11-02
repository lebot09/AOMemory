# AO Memory

A memory card game for web, phones, tablets and conference booth touch screens. Players flip cards to find matching pairs until the board is cleared.

## Status

| Step | What | State |
| --- | --- | --- |
| 1 | Foundations: app shell, AO theme, accessibility settings, database and versioning | done |
| 2 | Single-player game, touch and keyboard play, booth mode | done |
| 3 | Admin interface for card sets | done |
| 4 | Multiplayer: same-screen and online rooms | next |

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

It's a static site: `npm run build` produces `dist/`. `vercel.json` (Vercel) and `public/_redirects` (Netlify) send every page to the app. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.example` in the host's environment settings.

## Branding

Colors, type sizes and button styles follow the AO Digital Style Guide v2.0 (March 2021); see `src/theme/tokens.css`.

- **Logo:** `public/brand/ao-logo-blue.svg` and `ao-logo-white.svg` are the exact vector from page 7 of the style guide. Blue goes on light backgrounds and white on blue, with clear space of half the logo height.
- **Font:** Suisse Int'l is licensed, so the app uses Inter, a free font close to it, with Arial as the fallback.

## Booth mode

Open `/booth` on the booth screen (or tap **Booth mode** on the home page), then use the staff menu to go full screen.

- An attract screen with the AO logo and today's best times runs until someone taps.
- Players can enter a display name (optional) and play. Results show their rank for the day.
- If nobody touches the screen for 45 seconds (configurable), "Still playing?" appears. After 10 more seconds it resets to the attract screen.
- **Staff menu:** tap the top-left corner 5 times quickly, or press Ctrl+Shift+S. From there you can choose the card set and difficulty, set the idle time, turn name entry on or off, clear today's times, toggle full screen and change display settings.
- Today's best times are stored only in that screen's browser, and older days are deleted automatically.
- After one online visit, the game works offline. The built-in "Shapes (demo)" set is always available.

## Accessibility

- Display settings for high contrast, three text sizes and reduced motion. The choice is remembered on the device, and the device's reduced-motion preference is followed by default.
- All touch targets are at least 48px (72px on booth-size screens), with visible focus rings and a skip link.
- White on AO active blue (3.7:1) is only used for large bold button text. High-contrast mode switches buttons to AO blue. `src/theme/contrast.test.ts` checks every color pairing.

## Privacy

The game stores no personal data. Player display names stay on the device and are cleared when a game resets.
