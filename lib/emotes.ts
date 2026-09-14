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
 * Whether a message is emotes and nothing else.
 *
 * Somebody answering a wipe with one crying cat is not writing a sentence with
 * a picture in it — the picture is the whole message, and at the size of a
 * full stop it does not read as one. Chat everywhere draws these bigger for
 * the same reason, and the rule everywhere is the same: nothing else in the
 * line, and not too many of them.
 */
export function allEmotes(text: string): boolean {
  const found = findEmotes(text);
  if (!found.length || found.length > 3) return false;
  const rest = found.reduce(
    (s, f) => s.replace(f.emote.id, " "), text).trim();
  return rest === "";
}
