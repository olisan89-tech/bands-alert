// Geographic center used for the Ticketmaster radius search (roughly Fort
// Lauderdale, which sits between Miami and West Palm Beach).
export const TM_CENTER_LATLONG = "26.1224,-80.1373";
export const TM_RADIUS_MILES = 50;

// Cities used to double-check results (Ticketmaster's radius search can
// occasionally return venues just outside the area we actually care about,
// and Bandsintown has no radius filter at all).
export const SOUTH_FLORIDA_CITIES = [
  "miami",
  "miami beach",
  "miami gardens",
  "north miami",
  "north miami beach",
  "coral gables",
  "doral",
  "hialeah",
  "kendall",
  "coconut grove",
  "wynwood",
  "little haiti",
  "brickell",
  "aventura",
  "sunny isles beach",
  "fort lauderdale",
  "ft. lauderdale",
  "ft lauderdale",
  "hollywood",
  "hallandale beach",
  "sunrise",
  "davie",
  "plantation",
  "coral springs",
  "deerfield beach",
  "pompano beach",
  "boca raton",
  "delray beach",
  "boynton beach",
  "lake worth",
  "west palm beach",
  "royal palm beach",
  "wellington",
  "jupiter",
];

export function isSouthFloridaCity(cityName) {
  if (!cityName) return false;
  const normalized = cityName.trim().toLowerCase();
  return SOUTH_FLORIDA_CITIES.some(
    (city) => normalized === city || normalized.includes(city)
  );
}
