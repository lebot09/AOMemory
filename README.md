# AO Memory

A memory card game for web, phones, tablets and conference booth touch screens. Players flip cards to find matching pairs until the board is cleared.

## Status

| Step | What | State |
| --- | --- | --- |
| 1 | Foundations: app shell, AO theme, accessibility settings, database and versioning | done |
| 2 | Single-player game, touch and keyboard play, booth mode | next |
| 3 | Admin interface for card sets | planned |
| 4 | Multiplayer: same-screen and online rooms | planned |

## Run it

```bash
cp .env.example .env   # Supabase URL + publishable key (safe for the browser)
npm install
npm run dev            # http://localhost:5173
npm test               # unit tests (brand color contrast)
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

### Adding an admin

Admins sign in with Supabase Auth (admin UI arrives in step 3). To make someone an admin, run this in the Supabase SQL editor after they have signed in once:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'person@example.org';
```

## Branding

Colors, type sizes and button styles follow the AO Digital Style Guide v2.0 (March 2021); see `src/theme/tokens.css`.

Still to add:
- **Logo:** the official AO logo SVG from brand.aofoundation.org goes at `public/brand/ao-logo.svg`. Then set `HAS_OFFICIAL_LOGO` in `src/components/Brand.tsx`. A placeholder wordmark is used until then.
- **Font:** Suisse Int'l is licensed. If AO provides web font files, add them and an `@font-face` for `Suisse Intl`. Until then, Inter is used.

## Accessibility

- Display settings for high contrast, three text sizes and reduced motion. The choice is remembered on the device, and the device's reduced-motion preference is followed by default.
- All touch targets are at least 48px (72px on booth-size screens), with visible focus rings and a skip link.
- White on AO active blue (3.7:1) is only used for large bold button text. High-contrast mode switches buttons to AO blue. `src/theme/contrast.test.ts` checks every color pairing.

## Privacy

The game stores no personal data. Player display names stay on the device and are cleared when a game resets.
