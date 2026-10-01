/**
 * Cash Town's typed chat: the rules, kept pure so they can be tested.
 *
 * A line goes to everybody in the room as it is typed and is never stored:
 * somebody who arrives later does not see what was said before, the same as
 * the voice. It shows as a bubble over the speaker's head for a few seconds
 * (the Zheza way) and in a short log.
 *
 * Lines come from other browsers, so they are cleaned on the way in as well as
 * the way out: one line, no control or direction-flipping characters, at most
 * CHAT_MAX letters, and not too many at once from anybody.
 */

export const CHAT_MAX = 200;

/** How long a bubble stays over somebody's head, ms. */
export const BUBBLE_MS = 6_000;

/** How many lines the log keeps. */
export const LOG_MAX = 100;

/**
 * Deliveries a second the whole room's chat may cost, at most, if everybody
 * typed as fast as the box lets them: like steps (world.ts MOVE_BUDGET), so
 * that steps and chat together stay inside the project's 500.
 */
export const CHAT_BUDGET = 150;

/** How often somebody may send a line, ms, with `n` people in the room. */
export function chatEvery(n: number): number {
  return Math.max(700, Math.ceil((n * (n - 1) * 1000) / CHAT_BUDGET));
}

const grapheme = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const word = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter("th", { granularity: "word" }) : null;

/** Letters as a person sees them: a Thai vowel or tone mark stays with its consonant. */
function letters(text: string): string[] {
  return grapheme ? Array.from(grapheme.segment(text), (s) => s.segment) : Array.from(text);
}

/**
 * Control characters, zero-width and direction marks: nothing a person types
 * on purpose, and the last can make a line read backwards. Built from code
 * points so that no invisible character has to sit in this file.
 */
const range = (a: number, b: number) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`;
const UNWANTED = new RegExp(`[${[
  range(0x00, 0x1f), range(0x7f, 0x9f), range(0x200b, 0x200f),
  range(0x2028, 0x202e), range(0x2066, 0x2069), range(0xfeff, 0xfeff),
].join("")}]`, "g");

/** One clean line of at most CHAT_MAX letters, or "" when nothing is left. */
export function cleanChat(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const flat = raw
    .replace(UNWANTED, " ")
    .replace(/\s+/g, " ")
    .trim();
  const l = letters(flat);
  return l.length <= CHAT_MAX ? flat : l.slice(0, CHAT_MAX).join("").trimEnd();
}

/**
 * Not too many lines from one person: at most `max` in any `windowMs`. For
 * lines arriving from others; what this browser sends is paced by chatEvery.
 */
export class Flood {
  private seen = new Map<string, number[]>();
  constructor(private readonly max = 5, private readonly windowMs = 5_000) {}

  allow(id: string, now: number): boolean {
    const recent = (this.seen.get(id) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) { this.seen.set(id, recent); return false; }
    recent.push(now);
    this.seen.set(id, recent);
    return true;
  }
}

/**
 * A bubble's lines: broken between words (Thai has no spaces, so the words
 * come from Intl.Segmenter), a word too long for a line broken between
 * letters, and at most `maxLines`, the last ending in "…" if there was more.
 */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines = 3): string[] {
  const tokens = word ? Array.from(word.segment(text), (s) => s.segment) : text.split(/(\s+)/);
  const lines: string[] = [];
  let line = "";
  const push = () => { if (line.trim()) lines.push(line.trim()); line = ""; };
  for (const token of tokens) {
    if (measure(line + token) <= maxWidth) { line += token; continue; }
    if (line.trim()) push();
    if (measure(token) <= maxWidth) { line = token.trimStart(); continue; }
    // A single word wider than the bubble: by letters.
    for (const ch of letters(token)) {
      if (measure(line + ch) > maxWidth && line) push();
      line += ch;
    }
  }
  push();
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > maxWidth) last = letters(last).slice(0, -1).join("");
  kept[maxLines - 1] = `${last}…`;
  return kept;
}
