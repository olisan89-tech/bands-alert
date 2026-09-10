const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Formats a local venue date/time (already in venue-local time, no timezone
// math) into something like "Fri, Nov 14, 2026 8:00 PM". Avoids the Date
// object's UTC parsing so we never shift the calendar day by a timezone.
export function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return "Date TBA";
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  const datePart = `${weekday}, ${MONTHS[month - 1]} ${day}, ${year}`;

  if (!timeStr) return datePart;
  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = Number(hourStr);
  const minute = minuteStr ?? "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${datePart} ${hour}:${minute} ${ampm}`;
}
