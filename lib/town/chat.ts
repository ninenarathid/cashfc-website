/**
 * Cash Town's typed chat: the rules, kept pure so they can be tested.
 *
 * A line goes to the whole town as it is typed (or only to the current map,
 * when the town's switch says so: ChatReach) and is never stored: somebody
 * who arrives later does not see what was said before, the same as the voice.
 * It shows as a bubble over the speaker's head for a few seconds (the Zheza
 * way), on the speaker's own map only, and in a short log that says which map
 * a line came from.
 *
 * Lines come from other browsers, so they are cleaned on the way in as well as
 * the way out: one line, no control or direction-flipping characters, at most
 * CHAT_MAX letters, and not too many at once from anybody.
 */

import type { Place } from "./world";

export const CHAT_MAX = 200;

/**
 * Who hears a line (the owner, 2026-10-22, after members missed the town
 * talking together): the whole town, or the speaker's map only. Steps and
 * everything else stay on each map either way. An admin sets it with
 * `/townchat town` or `/townchat map` (v294's town_chat_switch); every
 * browser reads it on joining and every REACH_EVERY_MS.
 */
export type ChatReach = "town" | "map";
export const REACH_DEFAULT: ChatReach = "town";
export const REACH_EVERY_MS = 5 * 60_000;
export function readReach(raw: unknown): ChatReach | null {
  return raw === "town" || raw === "map" ? raw : null;
}

/** What a `/townchat` answer (lib/town/session ReachResult) says under the chat box; null for anything else. */
export function reachNote(result: string, th: boolean): string | null {
  switch (result) {
    case "reach-town": return th ? "ตอนนี้แชทถึงทุกคนทั้งเมือง" : "Chat now reaches the whole town.";
    case "reach-map": return th ? "ตอนนี้แชทถึงเฉพาะคนในแผนที่เดียวกัน" : "Chat now reaches your own map only.";
    case "reach-usage": return th ? "ใช้ /townchat town หรือ /townchat map" : "Use /townchat town or /townchat map.";
    case "reach-forbidden": return th ? "คำสั่งนี้ใช้ได้เฉพาะแอดมิน" : "Only admins can change this.";
    case "reach-unavailable": return th ? "สวิตช์แชทยังไม่พร้อมใช้งาน" : "The chat switch is not ready yet.";
    // `/townmap` (v295's town_map_switch: which main town it is; lib/town/town-map)
    case "map-classic": return th ? "ตอนนี้ทุกคนอยู่เมืองเดิม" : "Everybody has the old town now.";
    case "map-admins": return th ? "ตอนนี้เฉพาะแอดมินเห็นเมืองใหม่ (ทุกคนอื่นยังเมืองเดิม)" : "Only admins see the new town now; everybody else the old one.";
    case "map-town2": return th ? "ตอนนี้ทุกคนอยู่เมืองใหม่" : "Everybody has the new town now.";
    case "map-usage": return th ? "ใช้ /townmap town2, /townmap admins หรือ /townmap classic" : "Use /townmap town2, /townmap admins or /townmap classic.";
    case "map-forbidden": return th ? "คำสั่งนี้ใช้ได้เฉพาะแอดมิน" : "Only admins can change this.";
    case "map-unavailable": return th ? "สวิตช์เมืองยังไม่พร้อมใช้งาน (ยังไม่ได้รัน v295)" : "The town switch is not ready yet (v295 has not run).";
    // `/coins` (v300's town_admin_coins: Ninenine's own purse)
    case "coins-added": return th ? "เพิ่ม coin เข้ากระเป๋าแล้ว" : "Coins added to your purse.";
    case "coins-usage": return th ? "ใช้ /coins ตามด้วยจำนวน 1–1,000,000" : "Use /coins followed by an amount from 1 to 1,000,000.";
    case "coins-forbidden": return th ? "คำสั่งนี้ใช้ได้เฉพาะ Ninenine" : "Only Ninenine can use this.";
    case "coins-unavailable": return th ? "คำสั่งเพิ่ม coin ยังไม่พร้อมใช้งาน (ยังไม่ได้รัน v300)" : "Adding coins is not ready yet (v300 has not run).";
    default: return null;
  }
}

/** Which map a line came from, as its chip in the log says it. */
export const CHAT_PLACE: Record<Place, [th: string, en: string]> = {
  town: ["เมือง", "Town"], farm: ["ฟาร์ม", "Farm"], forest: ["ป่า", "Forest"], mountain: ["ภูเขา", "Mountain"], cave: ["ถ้ำ", "Cave"],
  shop: ["ร้านเสื้อผ้า", "Clothes shop"], casino: ["Casino", "Casino"],
};
export function isPlace(raw: unknown): raw is Place {
  return typeof raw === "string" && Object.prototype.hasOwnProperty.call(CHAT_PLACE, raw);
}

/** How long a bubble stays over somebody's head, ms. */
export const BUBBLE_MS = 6_000;

/** How many lines the log keeps, to scroll back through (since this tab came into town). */
export const LOG_MAX = 200;

/**
 * Deliveries a second the whole room's chat may cost, at most, if everybody
 * typed as fast as the box lets them: like steps (world.ts MOVE_BUDGET), so
 * that steps and chat together stay inside the project's 500.
 */
export const CHAT_BUDGET = 150;

/** The fastest anybody may send lines, ms apart: chatEvery's floor. */
export const CHAT_MIN_EVERY = 700;

/** How often somebody may send a line, ms, with `n` people in the room. */
export function chatEvery(n: number): number {
  return Math.max(CHAT_MIN_EVERY, Math.ceil((n * (n - 1) * 1000) / CHAT_BUDGET));
}

const grapheme = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const word = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter("th", { granularity: "word" }) : null;

/** Letters as a person sees them: a Thai vowel or tone mark stays with its consonant. */
export function letters(text: string): string[] {
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
 *
 * The default lets through everything an honest browser can send, one line
 * every CHAT_MIN_EVERY bunched a little by the network, and stops only a
 * tampered one. It used to stop at five in five seconds, below what the box
 * allows, so a quick typist's lines went missing on everybody else's screen
 * while their own showed them sent (found 2026-10-01).
 */
export class Flood {
  private seen = new Map<string, number[]>();
  constructor(private readonly max = Math.ceil(5_000 / CHAT_MIN_EVERY) + 2, private readonly windowMs = 5_000) {}

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
