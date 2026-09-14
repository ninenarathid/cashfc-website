/**
 * The Free Company's own emotes.
 *
 * Unicode has a cat and it does not have this cat. The five reactions under a
 * message are the ones everybody's keyboard already agrees on — yes, nice,
 * that is funny — and these are the ones the FC brought with it, which is a
 * different thing and the reason they are worth carrying: an in-joke is not a
 * sentiment, and drawing it as 😮 loses the joke.
 *
 * One table, read by both places an emote can appear. A reaction is a token in
 * the database and a message is a token in its own text, and a token that
 * meant an image in one and a literal colon in the other would be the same
 * string with two meanings.
 *
 * Adding one is a file in public/emotes and a line here.
 */

export interface Emote {
  /** What is typed and what is stored: ":kekw:". */
  id: string;
  /** Under public/, which is the only place the browser can fetch it from. */
  src: string;
  /** For the tooltip and for a reader who cannot see the picture. */
  say: string;
}

export const EMOTES: Emote[] = [
  { id: ":shocked:", src: "/emotes/cat_shocked.webp", say: "shocked" },
  { id: ":cry:", src: "/emotes/cat_cry.webp", say: "crying" },
  { id: ":dontyell:", src: "/emotes/cat_dontyell.webp", say: "don't yell at me" },
  { id: ":kekw:", src: "/emotes/L_kekwlaught.webp", say: "kekw" },
];

const BY_ID = new Map(EMOTES.map((e) => [e.id, e]));

/** Written once, because a line break inside a string literal is a trap. */
const NL = String.fromCharCode(10);

/** The emote this token names, or nothing where it names none. */
export const emoteOf = (token: string): Emote | undefined => BY_ID.get(token);

/**
 * Every token in a piece of text, in the order they appear.
 *
 * Matched against the table rather than against the shape, so ":00 start" and
 * "9:30:" stay the text somebody typed. A pattern would have caught both and
 * drawn a broken image over a time.
 */
export function findEmotes(text: string): { at: number; len: number; emote: Emote }[] {
  const out: { at: number; len: number; emote: Emote }[] = [];
  for (const e of EMOTES) {
    let at = text.indexOf(e.id);
    while (at !== -1) {
      out.push({ at, len: e.id.length, emote: e });
      at = text.indexOf(e.id, at + e.id.length);
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Whether the line this one sits on is emotes and nothing else.
 *
 * The difference between an emote and a sticker, and the only difference
 * there is. Somebody answering a wipe with one crying cat is not writing a
 * sentence with a picture in it — the picture is what they said, and at the
 * height of a full stop it cannot be read as one. The same cat in the middle
 * of "we should :cry: pull earlier" is punctuation, and blown up to seventy
 * pixels it would throw the line it is in around it.
 *
 * By the line rather than by the whole message, because a sticker with a
 * sentence under it is the ordinary way to send one: the sticker is still the
 * sticker, and the sentence is still a sentence.
 *
 * Three at most. Past that it is a wall and not a reply.
 */
export function lineIsEmotes(text: string, at: number): boolean {
  const from = text.lastIndexOf(NL, Math.max(0, at - 1)) + 1;
  const to = text.indexOf(NL, at);
  const line = text.slice(from, to === -1 ? text.length : to);
  const found = findEmotes(line);
  if (!found.length || found.length > 3) return false;
  return found.reduce((s, f) => s.replace(f.emote.id, " "), line).trim() === "";
}
