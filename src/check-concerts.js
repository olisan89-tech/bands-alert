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

// Groups new shows into a handful of digest texts instead of one text per
// show, so a week with several new shows doesn't blow up your phone.
const MAX_EVENTS_PER_TEXT = 5;

function buildDigestChunks(events) {
  const chunks = [];
  for (let i = 0; i < events.length; i += MAX_EVENTS_PER_TEXT) {
    chunks.push(events.slice(i, i + MAX_EVENTS_PER_TEXT));
  }
  return chunks;
}

function formatDigest(events, chunkIndex, totalChunks) {
  const header =
    totalChunks > 1
      ? `New shows (${chunkIndex + 1}/${totalChunks}):`
      : "New shows this week:";
  const lines = events.map((event) => {
    const when = formatDateTime(event.date, event.time);
    return `${event.artistQuery} - ${when} @ ${event.venueName}, ${event.city} FL${event.url ? `\n${event.url}` : ""}`;
  });
  return [header, ...lines].join("\n\n");
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

  const chunks = buildDigestChunks(newEvents);
  for (const [index, chunk] of chunks.entries()) {
    const body = formatDigest(chunk, index, chunks.length);
    try {
      await sendSms({
        smtpHost: SMTP_HOST,
        smtpPort: SMTP_PORT,
        smtpUser: SMTP_USER,
        smtpPass: SMTP_PASS,
        toAddress: ALERT_EMAIL,
        body,
      });
      console.log(`Texted digest ${index + 1}/${chunks.length} (${chunk.length} show(s)).`);
    } catch (err) {
      console.error(`Failed to send digest ${index + 1}/${chunks.length}: ${err.message}`);
      // Don't persist events we failed to text; retry them on the next run.
      for (const event of chunk) delete state[dedupeKey(event)];
    }
  }

  await saveState(state);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
