# bands-alert

Checks Ticketmaster and Bandsintown every day for South Florida tour dates
(Miami, Fort Lauderdale, Pompano Beach, West Palm Beach, and the surrounding
area) for a list of tracked artists, and texts you about any new show it
finds. Runs for free on a GitHub Actions schedule — no server to maintain.

## How it works

1. `.github/workflows/check-concerts.yml` runs `npm run check` once a day
   (and can be triggered manually from the Actions tab).
2. `src/check-concerts.js` looks up each artist in `src/artists.json`
   against the Ticketmaster Discovery API and the Bandsintown API,
   filtering results down to South Florida venues.
3. Any show not already in `data/seen-events.json` is texted to you and
   recorded so you don't get the same alert twice. That file gets committed
   back to the repo automatically after each run.
4. Texts are sent by emailing your phone's carrier SMS gateway (for AT&T,
   `yournumber@txt.att.net`) through Gmail's SMTP server — no paid SMS
   service required.

## One-time setup

### 1. Get a free Ticketmaster API key

Go to https://developer.ticketmaster.com/, sign up, and create an app. Your
**Consumer Key** is the API key.

### 2. Create a Gmail App Password

You'll send the alert emails from a Gmail account (a new one is fine, or
use an existing one):

1. Turn on 2-Step Verification on the Google account: https://myaccount.google.com/security
2. Create an App Password at https://myaccount.google.com/apppasswords
   (choose "Mail" / "Other"). Copy the 16-character password.

### 3. Add repo secrets

In this repo: **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Value |
|---|---|
| `TICKETMASTER_API_KEY` | Consumer Key from step 1 |
| `SMTP_USER` | The Gmail address you're sending from |
| `SMTP_PASS` | The App Password from step 2 |
| `ALERT_EMAIL` | `3053386230@txt.att.net` |

Optional (defaults are already fine): `BANDSINTOWN_APP_ID`, `SMTP_HOST`,
`SMTP_PORT`.

### 4. Done

The workflow runs automatically every day at ~9am Eastern. To test it
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

Set `DRY_RUN=true` in `.env` to see what would be found/texted without
actually sending anything or marking events as seen.

## Known limitations

- **AT&T's email-to-SMS gateway** (`@txt.att.net`) is free but not
  officially guaranteed — carriers occasionally delay or drop these emails,
  especially if flagged as bulk/spam. If alerts stop arriving reliably,
  the most robust fix is switching to a paid provider like Twilio.
- **Bandsintown's app_id-based endpoint** is commonly used for exactly this
  kind of personal lookup without a formal signup, but it's not a
  contractual guarantee of service — if it ever stops responding, the
  Ticketmaster results alone still cover most major-venue shows.
- GitHub Actions' cron doesn't adjust for daylight saving time, so the
  daily run time shifts by an hour between EDT and EST.
