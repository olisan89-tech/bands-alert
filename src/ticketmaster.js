import { TM_CENTER_LATLONG, TM_RADIUS_MILES, isSouthFloridaCity } from "./southFlorida.js";

function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Confirms the event is actually about the artist we searched for, not just
// a keyword match on the event/venue name.
function attractionMatches(event, artistQuery) {
  const target = normalize(artistQuery);
  const attractions = event._embedded?.attractions ?? [];
  return attractions.some((a) => {
    const name = normalize(a.name ?? "");
    return name === target || name.includes(target) || target.includes(name);
  });
}

export async function fetchTicketmasterEvents(artistQuery, apiKey) {
  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("keyword", artistQuery);
  url.searchParams.set("classificationName", "Music");
  url.searchParams.set("latlong", TM_CENTER_LATLONG);
  url.searchParams.set("radius", String(TM_RADIUS_MILES));
  url.searchParams.set("unit", "miles");
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("size", "20");

  const res = await fetch(url);
  if (res.status === 404) return []; // no results for this keyword
  if (!res.ok) {
    throw new Error(`Ticketmaster API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const events = data._embedded?.events ?? [];

  return events
    .filter((event) => attractionMatches(event, artistQuery))
    .map((event) => {
      const venue = event._embedded?.venues?.[0];
      return {
        source: "ticketmaster",
        id: event.id,
        artistQuery,
        eventName: event.name,
        date: event.dates?.start?.localDate,
        time: event.dates?.start?.localTime,
        venueName: venue?.name ?? "Venue TBA",
        city: venue?.city?.name ?? "",
        state: venue?.state?.stateCode ?? "",
        url: event.url,
      };
    })
    .filter((e) => e.state === "FL" && isSouthFloridaCity(e.city));
}
