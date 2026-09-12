/**
 * The few Discord REST calls this site makes.
 *
 * Four of them, written out rather than pulled from a library: posting a
 * message, editing it, and answering an interaction. A Discord SDK is a large
 * dependency carrying a gateway client, a cache and a voice stack, none of
 * which a site that posts one message could ever use.
 *
 * Every call returns rather than throws. Discord being unreachable is a normal
 * Tuesday and must never be the reason somebody cannot take a seat — the board
 * going stale for five minutes is the correct failure, and the tick that
 * follows fixes it.
 */

const API = "https://discord.com/api/v10";

export const BOT_TOKEN = () => process.env.DISCORD_BOT_TOKEN ?? "";
export const APP_ID = () => process.env.DISCORD_APP_ID ?? "";
export const PUBLIC_KEY = () => process.env.DISCORD_PUBLIC_KEY ?? "";
/** The test channel wins where it is set, so a rehearsal cannot reach the FC. */
export const CHANNEL_ID = () =>
  process.env.DISCORD_TEST_CHANNEL_ID || process.env.DISCORD_PARTY_CHANNEL_ID || "";

type Result<T> = { ok: T } | { error: string };

async function call<T>(
  path: string, init: RequestInit & { body?: string },
): Promise<Result<T>> {
  const token = BOT_TOKEN();
  if (!token) return { error: "no bot token" };
  try {
    const r = await fetch(API + path, {
      ...init,
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    const text = await r.text();
    if (!r.ok) return { error: `${r.status} ${text.slice(0, 300)}` };
    return { ok: (text ? JSON.parse(text) : null) as T };
  } catch (e) {
    return { error: String(e) };
  }
}

export const postMessage = (channelId: string, payload: unknown) =>
  call<{ id: string }>(`/channels/${channelId}/messages`, {
    method: "POST", body: JSON.stringify(payload),
  });

export const editMessage = (
  channelId: string, messageId: string, payload: unknown,
) =>
  call<{ id: string }>(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH", body: JSON.stringify(payload),
  });

export const getMessage = (channelId: string, messageId: string) =>
  call<{ id: string }>(`/channels/${channelId}/messages/${messageId}`, {
    method: "GET",
  });

/**
 * What to say back to somebody who pressed something.
 *
 * Always to them alone. The board is a shared message in a channel everybody
 * reads, and "you are already in a party at that time" is between the site and
 * one person — a channel that fills with other people's error messages is a
 * channel that gets muted, and the board goes with it.
 */
export const EPHEMERAL = 64;

export const reply = (text: string, flags = EPHEMERAL) => ({
  type: 4,
  data: { content: text, flags },
});

/** Acknowledge now, answer in a moment. Discord gives three seconds. */
export const thinking = (flags = EPHEMERAL) => ({ type: 5, data: { flags } });

/** The answer, once the work behind a `thinking` is done. */
export const followUp = (interactionToken: string, payload: unknown) =>
  fetch(`${API}/webhooks/${APP_ID()}/${interactionToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);
