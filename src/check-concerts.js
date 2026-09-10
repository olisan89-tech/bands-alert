import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import artists from "./artists.json" with { type: "json" };
import { fetchTicketmasterEvents } from "./ticketmaster.js";
import { fetchBandsintownEvents } from "./bandsintown.js";
import { formatDateTime } from "./format.js";
import { sendSms } from "./notify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "..", "data", "seen-events.json");

const {
  TICKETMASTER_API_KEY,
  BANDSINTOWN_APP_ID = "bands-alert-app",
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "465",
  SMTP_USER,
  SMTP_PASS,
  ALERT_EMAIL,
  DRY_RUN,
} = process.env;

function dedupeKey(event) {
  const artist = event.artistQuery.toLowerCase().replace(/[^a-z0-9]/g, "");
  const city = event.city.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${artist}|${event.date}|${city}`;
}

async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function saveState(state) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}

async function fetchAllEventsForArtist(artist) {
  const results = [];

  try {
    if (TICKETMASTER_API_KEY) {
      results.push(...(await fetchTicketmasterEvents(artist, TICKETMASTER_API_KEY)));
    } else {
      console.warn("TICKETMASTER_API_KEY not set; skipping Ticketmaster lookup.");
    }
  } catch (err) {
    console.error(`Ticketmaster lookup failed for "${artist}": ${err.message}`);
  }

  try {
    results.push(...(await fetchBandsintownEvents(artist, BANDSINTOWN_APP_ID)));
  } catch (err) {
    console.error(`Bandsintown lookup failed for "${artist}": ${err.message}`);
  }

  return results;
}

async function main() {
  const state = await loadState();
  const newEvents = [];

  for (const artist of artists) {
    const events = await fetchAllEventsForArtist(artist);
    for (const event of events) {
      const key = dedupeKey(event);
      if (!state[key]) {
        state[key] = { firstSeen: new Date().toISOString(), ...event };
        newEvents.push(event);
      }
    }
  }

  if (newEvents.length === 0) {
    console.log("No new South Florida shows found.");
    return;
  }

  console.log(`Found ${newEvents.length} new show(s):`);
  for (const event of newEvents) {
    console.log(`  - ${event.artistQuery}: ${event.eventName} (${event.date})`);
  }

  if (DRY_RUN === "true") {
    console.log("DRY_RUN=true, skipping SMS send and state save.");
    return;
  }

  if (!SMTP_USER || !SMTP_PASS || !ALERT_EMAIL) {
    console.error(
      "Missing SMTP_USER, SMTP_PASS, or ALERT_EMAIL; cannot send SMS. New events were found but no text will be sent."
    );
    process.exitCode = 1;
    return;
  }

  for (const event of newEvents) {
    const when = formatDateTime(event.date, event.time);
    const body = `New show: ${event.artistQuery}\n${when}\n${event.venueName}, ${event.city} FL\n${event.url ?? ""}`.trim();
    try {
      await sendSms({
        smtpHost: SMTP_HOST,
        smtpPort: SMTP_PORT,
        smtpUser: SMTP_USER,
        smtpPass: SMTP_PASS,
        toAddress: ALERT_EMAIL,
        body,
      });
      console.log(`Texted alert for ${event.artistQuery} (${event.date}).`);
    } catch (err) {
      console.error(`Failed to send SMS for ${event.artistQuery}: ${err.message}`);
      // Don't persist events we failed to text; retry them on the next run.
      delete state[dedupeKey(event)];
    }
  }

  await saveState(state);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
