// Sends a push notification via ntfy.sh (https://ntfy.sh) - a free, no
// signup, no API key push service. Anyone who knows the topic name can
// publish/subscribe to it, so treat the topic as a secret (a random,
// unguessable string), not a public label.
export async function sendNtfy({ topic, message, title }) {
  const headers = { "Content-Type": "text/plain; charset=utf-8" };
  if (title) headers.Title = title;

  const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers,
    body: message,
  });
  if (!res.ok) {
    throw new Error(`ntfy.sh error ${res.status}: ${await res.text()}`);
  }
}
