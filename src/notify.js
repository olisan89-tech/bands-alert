// Sends a message via CallMeBot's WhatsApp API (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
// One-time setup per phone number: add the CallMeBot contact on WhatsApp,
// send it the activation phrase, and it replies with an API key.
export async function sendWhatsApp({ phone, apiKey, message }) {
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", message);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok || /error/i.test(body)) {
    throw new Error(`CallMeBot error ${res.status}: ${body}`);
  }
  return body;
}
