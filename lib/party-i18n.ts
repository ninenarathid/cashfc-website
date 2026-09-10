import type {
  ContentKind, LengthUnit, LootRule, PayOn, ProgressAt, Shape,
} from "@/lib/party";
import { LOOT_LABEL, fmtLength, minutesToFood } from "@/lib/party";
import type { Key } from "@/lib/i18n";

/**
 * The party model, said in the reader's language.
 *
 * Kept out of lib/party.ts, which is the model and has no business knowing
 * about a dictionary — the seat arithmetic is the same in both languages, and
 * a model that imports a React context cannot be tested or used on a server.
 *
 * What is translated and what is not follows one rule: the game's vocabulary
 * stays as it is, and the site's own words are translated. "Savage", "A2C",
 * "L to R", "FFA", "Tank" are what the FC says out loud in either language and
 * a Thai rendering of them would be a word nobody uses. The sentences
 * *explaining* those — what L to R means, what a Prog night is asking for — are
 * this site talking, and are worth reading in Thai.
 */

type T = (k: Key, vars?: Record<string, string | number>) => string;

/* ── how many, and in what arrangement ───────────────────────────────────── */

const SHAPE_KEY: Record<Exclude<Shape, "open">, Key> = {
  light: "pf.shapeLight",
  full: "pf.shapeFull",
  alliance: "pf.shapeAlliance",
};

/**
 * What "no seats" means, which depends on why there are none.
 *
 * The same three situations lib/party.ts distinguishes, for the same reason:
 * PvP genuinely cannot be entered as a party, a hunt train is a party with no
 * roles, and a photo shoot is not a party at all.
 */
export const shapeSay = (
  shape: Shape, kind: ContentKind | undefined, t: T,
): string => (
  shape !== "open" ? t(SHAPE_KEY[shape])
    : kind === "pvp" ? t("pf.openPvp")
      : kind === "community" ? t("pf.openCommunity")
        : t("pf.openNone")
);

/* ── how far in ──────────────────────────────────────────────────────────── */

const PROGRESS_KEY: Record<ProgressAt, Key> = {
  fresh: "pf.progFreshWhy",
  prog: "pf.progProgWhy",
  a2c: "pf.progA2cWhy",
  farm: "pf.progFarmWhy",
};

/** The rung's own name stays English; what it asks of you does not. */
export const progressHelp = (at: ProgressAt, t: T): string => t(PROGRESS_KEY[at]);

/* ── how long ────────────────────────────────────────────────────────────── */

/**
 * The length, said the way the party said it.
 *
 * Three units and three different sentences. Hours and food are lengths and
 * read as one; runs is a count, and rendering it as the minutes the board
 * privately assumed would be putting a number in the party's mouth that it
 * deliberately declined to give.
 */
export function lengthSay(
  p: { lengthMinutes: number; lengthUnit: LengthUnit; runs?: number }, t: T,
): string {
  // Not a length: a map night ends when the maps do, and the listing already
  // says how many each. There is no number here to render.
  if (p.lengthUnit === "maps") return t("pf.untilMapsDone");
  if (p.lengthUnit === "runs") {
    const n = p.runs ?? 1;
    return t("pf.nRuns", { n });
  }
  if (p.lengthUnit === "food") {
    const f = minutesToFood(p.lengthMinutes);
    return t("pf.nFood", { n: Number.isInteger(f) ? f : f.toFixed(1) });
  }
  return fmtLength(p.lengthMinutes);
}

/* ── who gets what ───────────────────────────────────────────────────────── */

const LOOT_KEY: Record<LootRule, Key> = {
  ltr: "pf.lootLtrWhy",
  ffa: "pf.lootFfaWhy",
  merc: "pf.lootMercWhy",
  book: "pf.lootBookWhy",
  owner: "pf.lootOwnerWhy",
};

export const lootHelp = (rule: LootRule, t: T): string => t(LOOT_KEY[rule]);

/**
 * The rule's name.
 *
 * Four of the five are what people type in Discord and stay as they are. The
 * fifth is a sentence rather than a handle — nobody says "owner" out loud, they
 * say "the map owner keeps it" — so it is the one that gets translated.
 */
export const lootSay = (rule: LootRule, t: T): string =>
  rule === "owner" ? t("party.lootOwner") : LOOT_LABEL[rule];

const PAY_KEY: Record<PayOn, Key> = {
  clear: "party.payClear",
  mount: "party.payMount",
  both: "party.payBoth",
};

export const payOnSay = (on: PayOn, t: T): string => t(PAY_KEY[on]);

/** "Mercenary · 2,000,000 gil เมื่อได้ rare mount" — the whole line. */
export function lootLine(
  l: { rule: LootRule; pay?: number; payOn?: PayOn } | undefined, t: T,
): string | null {
  if (!l) return null;
  if (l.rule !== "merc") return lootSay(l.rule, t);
  const when = l.payOn ? ` ${payOnSay(l.payOn, t)}` : "";
  if (!l.pay) return `${LOOT_LABEL.merc}${when}`;
  return `${LOOT_LABEL.merc} · ${l.pay.toLocaleString("en-US")} gil${when}`;
}
