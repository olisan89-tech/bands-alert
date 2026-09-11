# bands-alert

Checks Ticketmaster and Bandsintown once a week for South Florida tour dates
(Miami, Fort Lauderdale, Pompano Beach, West Palm Beach, and the surrounding
area) for a list of tracked artists, and sends a single push-notification
digest of any new shows it found. Runs for free on a GitHub Actions
schedule — no server to maintain.

## How it works

1. `.github/workflows/check-concerts.yml` runs `npm run check` once a week,
   every Monday (and can be triggered manually from the Actions tab).
2. `src/check-concerts.js` looks up each artist in `src/artists.json`
   against the Ticketmaster Discovery API and the Bandsintown API,
   filtering results down to South Florida venues.
3. Any show not already in `data/seen-events.json` is bundled into a single
   notification digest (split into a couple of messages only if there are a
   lot of new shows that week — see `MAX_EVENTS_PER_TEXT` in
   `src/check-concerts.js`) and recorded so you don't get the same alert
   twice. If there's nothing new, no notification is sent. `seen-events.json`
   gets committed back to the repo automatically after each run.
4. Alerts are sent via [ntfy.sh](https://ntfy.sh) — a free, no-signup push
   notification service. A single HTTP POST to a private topic URL delivers
   an instant push notification to your phone through their app.

   > This project's alert method has changed twice during setup: AT&T's
   > free email-to-SMS gateway turned out to be discontinued (Gmail's
   > bounce confirmed the domain no longer resolves), and CallMeBot's free
   > WhatsApp API was full/closed to new signups when we tried it. ntfy.sh
   > has no signup and no capacity cap, so it doesn't have either failure
   > mode.

## One-time setup

### 1. Get a free Ticketmaster API key

Go to https://developer.ticketmaster.com/, sign up, and create an app. Your
**Consumer Key** is the API key.

### 2. Set up ntfy.sh

1. Install the free **ntfy** app: [iOS](https://apps.apple.com/us/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
2. In the app, subscribe to this topic (already generated, unique and hard
   to guess): **`bands-alert-c8b5d58eeb6e`**
   - Use the default public server (`ntfy.sh`) — no account needed.
3. That's it — anything posted to that topic now becomes a push
   notification on your phone.

Treat the topic name like a password: anyone who has it can publish to it
(or read your alerts) since ntfy.sh's public server doesn't require auth by
default. Don't share it or post it publicly.

### 3. Add repo secrets

In this repo: **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Value |
|---|---|
| `TICKETMASTER_API_KEY` | Consumer Key from step 1 |
| `NTFY_TOPIC` | `bands-alert-c8b5d58eeb6e` |

Optional (default is already fine): `BANDSINTOWN_APP_ID`.

If you previously added `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY`, `SMTP_USER`,
`SMTP_PASS`, or `ALERT_EMAIL` secrets from earlier setup attempts, they're
unused now and safe to delete.

### 4. Done

The workflow runs automatically every Monday at ~9am Eastern. To test it
immediately: go to the **Actions** tab → **Check for concerts** → **Run
workflow**.

## Managing the artist list

Edit `src/artists.json` and commit. One artist name per line, spelled the
way you'd search for them.

> Note: your original list had "katrynada" — that's spelled `Kaytranada`
> in `src/artists.json` since that's the actual artist name and searches
> need the correct spelling to match.

## Adjusting the coverage area

`src/southFlorida.js` has the city list and the Ticketmaster search radius
(currently 50 miles from Fort Lauderdale, which comfortably covers Miami up
through West Palm Beach). Add/remove cities or change the radius there.

## Local testing

```bash
cp .env.example .env   # fill in your keys
npm install
npm run check
```

Set `DRY_RUN=true` in `.env` to see what would be found/sent without
actually sending anything or marking events as seen.

## Known limitations

- **Bandsintown's app_id-based endpoint currently returns a hard 403** for
  every lookup (not just this project — it looks like Bandsintown now
  blocks unregistered `app_id` values outright rather than just rate
  limiting them). It's left in the code since it fails harmlessly and costs
  only a few seconds per run; Ticketmaster is doing all the real work right
  now and already found real shows in testing. Worth reassessing later —
  either by getting a proper registered Bandsintown API key, or removing it
  if it never comes back.
- **ntfy.sh's public server is free and unauthenticated by topic** — it's
  reliable in practice, but it's still a shared free service, not a paid
  SLA. If it ever becomes unreliable, the fallback is a paid provider like
  Twilio (real SMS, ~$1/month + pennies per text).
- GitHub Actions' cron doesn't adjust for daylight saving time, so the
  weekly run time shifts by an hour between EDT and EST.
