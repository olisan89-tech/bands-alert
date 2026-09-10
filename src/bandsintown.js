import { isSouthFloridaCity } from "./southFlorida.js";

// Bandsintown's public "artist events" endpoint works with any app_id string
// identifying your app; no signup/approval is required for this read-only,
// personal-use lookup. See https://www.artists.bandsintown.com/support/api-installation
export async function fetchBandsintownEvents(artistQuery, appId) {
  const url = new URL(
    `https://rest.bandsintown.com/artists/${encodeURIComponent(artistQuery)}/events`
  );
  url.searchParams.set("app_id", appId);
  url.searchParams.set("date", "upcoming");

  const res = await fetch(url);
  if (res.status === 404) return []; // artist not found in Bandsintown's catalog
  if (!res.ok) {
    throw new Error(`Bandsintown API error ${res.status}: ${await res.text()}`);
  }
  const events = await res.json();
  if (!Array.isArray(events)) return [];

  return events
    .map((event) => {
      const venue = event.venue ?? {};
      const [date, time] = (event.datetime ?? "").split("T");
      return {
        source: "bandsintown",
        id: event.id,
        artistQuery,
        eventName: `${artistQuery} at ${venue.name ?? "TBA"}`,
        date,
        time: time?.slice(0, 5),
        venueName: venue.name ?? "Venue TBA",
        city: venue.city ?? "",
        state: venue.region ?? "",
        url: event.url,
      };
    })
    .filter((e) => e.state === "FL" && isSouthFloridaCity(e.city));
}
