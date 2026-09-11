/**
 * A YouTube link, as the two facts a player needs.
 *
 * Raid plans are half video — somebody's phase-two explanation at 4:12 — and a
 * link to one is a thing you have to leave the page for. Recognised here so the
 * write-up can put the player where the link was.
 *
 * Every shape the site hands out: a watch URL, a youtu.be short link, an embed
 * URL, a Shorts link, and a live one. Anything else comes back null and stays
 * an ordinary link, which is the right answer for a link this does not
 * understand.
 */

export interface Video {
  id: string;
  /** Seconds in, where the link named a moment. Nought means the start. */
  start: number;
}

/** "1h2m3s", "90s", or just "90" — all of which YouTube writes at times. */
function seconds(raw: string | null): number {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Eleven characters of YouTube's own alphabet, and nothing else. */
const ID = /^[A-Za-z0-9_-]{11}$/;

export function youtube(url: string): Video | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const start = seconds(u.searchParams.get("t") ?? u.searchParams.get("start"));

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return ID.test(id) ? { id, start } : null;
  }
  if (host !== "youtube.com" && host !== "m.youtube.com"
      && host !== "music.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }
  if (u.pathname === "/watch") {
    const id = u.searchParams.get("v") ?? "";
    return ID.test(id) ? { id, start } : null;
  }
  // /embed/ID, /shorts/ID, /live/ID — all the same thing at a different address.
  const m = /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
  return m ? { id: m[1], start } : null;
}

/**
 * The videos linked in a piece of text.
 *
 * Two at most: a paragraph with six in it is a playlist, and six players
 * loading at once is what a write-up would cost everybody who opens the party.
 * Deduplicated, because the same link pasted twice is one video.
 *
 * Here rather than in either of the two components that draw them, because a
 * link in a message and a link in a raid plan are the same link and should not
 * be recognised by two slightly different regular expressions.
 */
export const clips = (text: string | undefined): Video[] =>
  !text ? [] : [...new Set(
    [...text.matchAll(/https?:\/\/[^\s<>"'`)\]}]+/g)].map((m) => m[0]))]
    .map(youtube).filter((v): v is Video => !!v).slice(0, 2);

/**
 * The player's address.
 *
 * nocookie because this is a Free Company noticeboard and there is no reason
 * for a raid plan to hand YouTube a tracking cookie for everybody who reads it.
 */
export const youtubeSrc = (v: Video): string =>
  `https://www.youtube-nocookie.com/embed/${v.id}`
  + `?rel=0${v.start ? `&start=${v.start}` : ""}`;
