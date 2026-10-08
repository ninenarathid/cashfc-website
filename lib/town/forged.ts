import { ALL, FORGE, LEVELS, gemBy, has, levelOf, optN, toolKindOf, type ToolKind } from "./tools";
import type { Stack } from "./trade";

/**
 * Forging, for the seven tools there were before the pick and the axe: the rod, the hoe, the watering can, the
 * insect net, and the pot, the pan and the grill (the first of each kind: a better tool of a later tier is not
 * forged, and reads as a plain thing here). lib/town/tools has the registry (what a plus is at each level, the
 * options there are, what a tool carries); this file is what those come to in the games those tools are played
 * with: one reader a family, each giving its game everything it asks in one object of plain numbers and flags.
 * **For a plain tool every number is the one that changes nothing** (1 where a game multiplies, 0 where it adds,
 * false where it asks whether), so a game that reads it plays as it always did.
 *
 * Pure, and it imports nothing at runtime but lib/town/tools: lib/town/gear reads it, and lib/town/trade stands on
 * that. What is counted (so many a day, so many to a meal's hours) and the stamina that is owed forward are whoever
 * keeps the game's to do: lib/town/forged-keep. Nothing here is told to the players. Every number is a knob.
 */
type Held = Stack | null | undefined;

/* ── the cap ────────────────────────────────────────────────────────────── */

/**
 * Ease with a forged tool's part in it. `rest` is what everything else that eases the same thing comes to, as so many
 * times as easy (a meal's buff, a gift, better gear); `mine` is the tool's own. Together they are never past the
 * cap (lib/town/tools' `FORGE.cap`): but what the rest came to by itself is never made less, so a game with a plain
 * tool is as it was whatever its buffs; and a part that makes a thing harder (under 1) is taken whole.
 */
export const easedBy = (rest: number, mine: number): number =>
  (mine === 1 ? rest : mine < 1 ? rest * mine : Math.max(rest, Math.min(FORGE.cap, rest * mine)));
/** The same for what is easier the smaller it is (a pace, a wait, a cost): never under one part in the cap of what it plainly is. */
export const slowedBy = (rest: number, mine: number): number =>
  (mine === 1 ? rest : mine > 1 ? rest * mine : Math.min(rest, Math.max(1 / FORGE.cap, rest * mine)));

/**
 * What a forged tool's own part multiplies a thing by, once the rest of what eases that thing is known: its part,
 * less whatever of it the cap takes. **Exactly 1 for a plain tool**, so a game multiplies what it always had by it and
 * is, with a plain tool, the same to the last digit.
 */
export const partOf = (rest: number, mine: number): number => (mine === 1 ? 1 : easedBy(rest, mine) / rest);
export const slowPartOf = (rest: number, mine: number): number => (mine === 1 ? 1 : slowedBy(rest, mine) / rest);

/**
 * A number of chance in [0, 1) from a word and a few numbers: the same for whoever asks with the same. What a deed
 * done by chance is drawn with where the rules are worked out in the browser (the moment of the deed is one of the
 * numbers); the database draws with a number of its own.
 */
export function luckOf(word: string, ...n: number[]): number {
  let h = 2166136261;
  for (const ch of `${word}|${n.join("|")}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/* ── what a gem does in the old tools ───────────────────────────────────── */

const SHARE = [0.15, 0.25, 0.35, 0.45], COUNT = [1, 2, 3, 4], CHANCE = [0.1, 0.2, 0.3, 0.4], RARER = [1.2, 1.4, 1.6, 1.8];
/**
 * What each element does in the old tools, at its levels 1 to 4 (`cook`: the pot, the pan and the grill alike).
 * - fire, the work is over sooner: the fish has so much less line to be won; a plot takes so many hits fewer; a
 *   filling is so many waterings more; the net's swing lands so much sooner; a pot wants so much fewer stirs.
 * - water, forgiving: so many of a go's first misses are not counted (the rod's miss is a strike too soon).
 * - ice, what moves is so much slower: the fish's stretch, the hoe's marker and the weeding's gusts, the pour's
 *   water, how fast an insect makes off, and how soon a pot's slip costs.
 * - earth: so much less stamina.
 * - lightning, how likely the deed does its neighbour too: the bait is not used up, the next plot is done, another
 *   insect comes with the one caught, a pot has a helping more.
 * - light, what is worth having shows: the float shimmers so many seconds before the bite; the weeding's stones glow;
 *   plants that want water glint within so many tiles; insects that hide are seen within so many.
 * - dark, the rarer thing for a harder game: rare fish so many times as often and every fish so much fiercer; how
 *   likely a tilled plot turns up a worm, and the marker so much faster; a watering adds so much more and uses so
 *   many; the net's ring so much smaller; how likely a pot has a helping more, and its good pace so much narrower.
 */
export const OLD_FX = {
  fire: { rod: { tires: SHARE }, hoe: { fewer: [1, 1, 2, 2] }, can: { more: COUNT }, bugNet: { sooner: SHARE }, cook: { shorter: SHARE } },
  water: { spared: COUNT },
  ice: { slow: SHARE },
  earth: { stamina: SHARE },
  lightning: { chance: CHANCE },
  light: { rod: { early: [0.2, 0.3, 0.4, 0.5] }, can: { glint: [4, 7, 10, ALL] }, bugNet: { seen: [3, 5, 7, 9] } },
  dark: {
    rod: { rare: RARER, fiercer: 0.1 }, hoe: { worm: [0.05, 0.1, 0.15, 0.2], faster: 0.1 }, can: { more: [0.1, 0.15, 0.2, 0.25], uses: 2 },
    bugNet: { rare: RARER, smaller: 0.1 }, cook: { helping: CHANCE, harder: 0.1 },
  },
} as const;

/**
 * The tool, if it is of one of these kinds and carries something of its own (a plus, an option, a gem). A thing that
 * is not forged, a better tool among it, and a tool as it was bought are nothing here: each reader then gives its
 * plain object, the same one every time.
 */
const of = (stack: Held, ...kinds: ToolKind[]): Stack | null =>
  (stack && kinds.includes(toolKindOf(stack.item) as ToolKind) && ((stack.plus ?? 0) > 0 || !!stack.opts?.length || !!stack.gems?.length) ? stack : null);
/** A table's number at a tool's plus, as so many times its number for the tool as it is bought. */
const times = (table: readonly number[], stack: Held): number => { const l = levelOf(stack); return l ? table[l] / table[0] : 1; };

/* ── the rod ────────────────────────────────────────────────────────────── */

/** What a rod's forging is to a line and a fight (lib/town/fishing). */
export interface RodFx {
  /** The fight's safe stretch, so many times as wide. */
  band: number;
  /** The pace the safe stretch moves at, so many times (under 1: slower). */
  pace: number;
  /** The strike's moment, so many times as long. */
  strike: number;
  /** The line to be won, so many times (under 1: the fish tires sooner). */
  line: number;
  /** How many times as hard the fish pulls and surges. */
  fierce: number;
  /** Strikes too soon that a cast forgives: the line stays out with its bait on. */
  spared: number;
  /** Seconds more before the safe stretch first moves. */
  still: number;
  /** How many seconds before the bite the float shimmers. */
  shimmer: number;
  /** The share of a fight's stamina taken off; and whether the first fights of a meal's hours cost none (the counted option). */
  stamina: number;
  fresh: boolean;
  /** The share of the wait for a bite taken off. */
  quick: number;
  /** How likely a bait is not used up; and rare fish so many times as often. */
  keeps: number;
  rare: number;
  /** Whether a line dropped is bitten at once (the counted option: so many a day). */
  call: boolean;
  /** For how many seconds after the bite a strike still takes, once the moment itself has passed (the counted option: so many a day); none: 0. */
  gold: number;
  /** How lively a fish is while the water sleeps, as so many times its own (1: no such rod), and for how many minutes it sleeps (the counted option: so often a day). */
  lull: number;
  lullMins: number;
}
export const PLAIN_ROD: RodFx = { band: 1, pace: 1, strike: 1, line: 1, fierce: 1, spared: 0, still: 0, shimmer: 0, stamina: 0, fresh: false, quick: 0, keeps: 0, rare: 1, call: false, gold: 0, lull: 1, lullMins: 0 };
export function rodFx(stack: Held): RodFx {
  const s = of(stack, "rod");
  if (!s) return PLAIN_ROD;
  const l = levelOf(s), dark = gemBy(s, "dark", OLD_FX.dark.rod.rare, 0) > 0;
  return {
    band: LEVELS.rod.band[l],
    pace: (1 - LEVELS.rod.slow[l]) * (1 - gemBy(s, "ice", OLD_FX.ice.slow)),
    strike: times(LEVELS.rod.strike, s),
    line: 1 - gemBy(s, "fire", OLD_FX.fire.rod.tires),
    fierce: dark ? 1 + OLD_FX.dark.rod.fiercer : 1,
    spared: gemBy(s, "water", OLD_FX.water.spared) + (has(s, "rdBait") ? 1 : 0),
    still: has(s, "rdCalm") ? optN("rdCalm", "secs") : 0,
    shimmer: gemBy(s, "light", OLD_FX.light.rod.early),
    stamina: gemBy(s, "earth", OLD_FX.earth.stamina),
    fresh: has(s, "rdFresh"),
    quick: has(s, "rdQuick") ? optN("rdQuick", "shorter") : 0,
    keeps: gemBy(s, "lightning", OLD_FX.lightning.chance),
    rare: gemBy(s, "dark", OLD_FX.dark.rod.rare, 1),
    call: has(s, "rdCall"),
    gold: has(s, "rdGold") ? optN("rdGold", "secs") : 0,
    lull: has(s, "rdStill") ? optN("rdStill", "by") : 1,
    lullMins: has(s, "rdStill") ? optN("rdStill", "mins") : 0,
  };
}

/* ── the hoe ────────────────────────────────────────────────────────────── */

/** What a hoe's forging is to the tilling and the weeding (lib/town/timing, lib/town/weeding). */
export interface HoeFx {
  /** The tilling's stretch, so many times as wide. */
  band: number;
  /** The pace of the marker, and of the weeding's gusts, so many times (under 1: slower). */
  pace: number;
  /** Hits fewer a plot (never under one). */
  fewer: number;
  /** Misses of a plot's game that are not counted. */
  spared: number;
  /** Stones fewer among the weeds. */
  stones: number;
  /** Whether the marker keeps its pace after a hit; and whether the weeding's stones glow. */
  even: boolean;
  glow: boolean;
  /** The share of a plot's stamina taken off; and whether the first plots of a meal's hours cost none (the counted option). */
  stamina: number;
  fresh: boolean;
  /** How likely the next plot of the row is done too; and how likely a tilled plot turns up a worm. */
  next: number;
  worm: number;
  /** Whether tired hands keep hold of it however often they miss (the counted option: so many plots a day). */
  grip: boolean;
  /** Whether a wild plot it clears is tilled by the same game; and whether a plot it tills is left damp, so that what is sown there has had its first watering (the counted options: so many plots a day, each). */
  both: boolean;
  wet: boolean;
}
export const PLAIN_HOE: HoeFx = { band: 1, pace: 1, fewer: 0, spared: 0, stones: 0, even: false, glow: false, stamina: 0, fresh: false, next: 0, worm: 0, grip: false, both: false, wet: false };
export function hoeFx(stack: Held): HoeFx {
  const s = of(stack, "hoe");
  if (!s) return PLAIN_HOE;
  const l = levelOf(s), worm = gemBy(s, "dark", OLD_FX.dark.hoe.worm);
  return {
    band: LEVELS.hoe.band[l],
    pace: (1 - LEVELS.hoe.slow[l]) * (1 - gemBy(s, "ice", OLD_FX.ice.slow)) * (worm > 0 ? 1 + OLD_FX.dark.hoe.faster : 1),
    fewer: gemBy(s, "fire", OLD_FX.fire.hoe.fewer),
    spared: gemBy(s, "water", OLD_FX.water.spared) + (has(s, "hoFirst") ? optN("hoFirst", "misses") : 0),
    stones: has(s, "hoClear") ? optN("hoClear", "stones") : 0,
    even: has(s, "hoLight"),
    glow: gemBy(s, "light", COUNT) > 0,
    stamina: gemBy(s, "earth", OLD_FX.earth.stamina),
    fresh: has(s, "hoFresh"),
    next: gemBy(s, "lightning", OLD_FX.lightning.chance),
    worm,
    grip: has(s, "hoGrip"),
    both: has(s, "hoBoth"),
    wet: has(s, "hoWet"),
  };
}

/* ── the watering can ───────────────────────────────────────────────────── */

/** What a can's forging is to its waterings and to the pouring (lib/town/farm, lib/town/pouring, lib/town/longpour). */
export interface CanFx {
  /** Waterings more a filling. */
  more: number;
  /** The pour's marks, so many times as wide. */
  marks: number;
  /** The pace the pour's water runs at, so many times (under 1: slower). */
  pace: number;
  /** Misses of a pour that are not counted. */
  spared: number;
  /** The well's bucketfuls a filling takes (none said: as many as any can's). */
  takes: number | null;
  /** The share of a watering's stamina taken off; and whether the first waterings of a meal's hours cost none (the counted option). */
  stamina: number;
  fresh: boolean;
  /** Points more on the helpers' line for watering somebody else's plant. */
  kind: number;
  /** How likely the next plot is watered too. */
  next: number;
  /** The share more a watering adds, and how many of the can's waterings it uses. */
  rich: number;
  uses: number;
  /** Within how many tiles plants that want water glint (none: 0). */
  glint: number;
  /** For how many minutes it waters with no water in it once it has run dry (the counted option: so often a day); none: 0. */
  full: number;
  /** Whether a watering in a bed of one's own waters the whole row; and whether a plant watered already this hour takes one watering more (the counted options: so many a day, each). */
  rain: boolean;
  twice: boolean;
}
export const PLAIN_CAN: CanFx = { more: 0, marks: 1, pace: 1, spared: 0, takes: null, stamina: 0, fresh: false, kind: 0, next: 0, rich: 0, uses: 1, glint: 0, full: 0, rain: false, twice: false };
export function canFx(stack: Held): CanFx {
  const s = of(stack, "can");
  if (!s) return PLAIN_CAN;
  const l = levelOf(s), rich = gemBy(s, "dark", OLD_FX.dark.can.more);
  return {
    more: LEVELS.can.waterings[l] - LEVELS.can.waterings[0] + gemBy(s, "fire", OLD_FX.fire.can.more) + (has(s, "cnDrop") ? optN("cnDrop", "more") : 0),
    marks: LEVELS.can.marks[l],
    pace: 1 - gemBy(s, "ice", OLD_FX.ice.slow),
    spared: gemBy(s, "water", OLD_FX.water.spared),
    takes: has(s, "cnThrift") ? optN("cnThrift", "takes") : null,
    stamina: gemBy(s, "earth", OLD_FX.earth.stamina),
    fresh: has(s, "cnFresh"),
    kind: has(s, "cnKind") ? optN("cnKind", "points") : 0,
    next: gemBy(s, "lightning", OLD_FX.lightning.chance),
    rich,
    uses: rich > 0 ? OLD_FX.dark.can.uses : 1,
    glint: gemBy(s, "light", OLD_FX.light.can.glint),
    full: has(s, "cnFull") ? optN("cnFull", "mins") : 0,
    rain: has(s, "cnRain"),
    twice: has(s, "cnTwice"),
  };
}

/* ── the insect net ─────────────────────────────────────────────────────── */

/** What a net's forging is to a swing and a catch (lib/town/insects). */
export interface NetFx {
  /** The ring, so many times as wide. */
  ring: number;
  /** How long a swing takes to land, so many times (under 1: sooner). */
  lands: number;
  /** The rest before another swing can begin, so many times. */
  again: number;
  /** Tiles more of reach. */
  reach: number;
  /** Misses of a go that are not counted; and misses more an insect bears before it is off. */
  spared: number;
  bears: number;
  /** The pace the insects' own clock runs at for whoever holds the net, so many times (under 1: everything about them is slower: how fast they fly, hop and turn, and how soon they are off again). */
  flight: number;
  /** The share of a catch's stamina taken off; and whether the first catches of a meal's hours cost none (the counted option). */
  stamina: number;
  fresh: boolean;
  /** How likely a catch brings one more; and within how many tiles insects that hide are seen (none: 0). */
  twin: number;
  seen: number;
  /** The insect that comes back after a catch is one of the rare kinds so many times as often (1: as ever). */
  rare: number;
  /** Within how many tiles of where it lands a swing takes every insect, where there are two or more (the counted option: so many a day); none: 0. */
  wide: number;
  /** For how many seconds the insect a swing is aimed at holds still (the counted option: so many a day); none: 0. */
  freeze: number;
  /** Whether a haunt it has emptied says when another may come there. */
  nest: boolean;
}
export const PLAIN_NET: NetFx = { ring: 1, lands: 1, again: 1, reach: 0, spared: 0, bears: 0, flight: 1, stamina: 0, fresh: false, twin: 0, seen: 0, rare: 1, wide: 0, freeze: 0, nest: false };
export function netFx(stack: Held): NetFx {
  const s = of(stack, "bugNet");
  if (!s) return PLAIN_NET;
  return {
    ring: times(LEVELS.bugNet.ring, s) * (gemBy(s, "dark", OLD_FX.dark.bugNet.rare) > 0 ? 1 - OLD_FX.dark.bugNet.smaller : 1),
    lands: times(LEVELS.bugNet.lands, s) * (1 - gemBy(s, "fire", OLD_FX.fire.bugNet.sooner)),
    again: has(s, "ntAgain") ? optN("ntAgain", "by") : 1,
    reach: has(s, "ntLong") ? optN("ntLong", "reach") : 0,
    spared: gemBy(s, "water", OLD_FX.water.spared),
    bears: has(s, "ntMesh") ? optN("ntMesh", "misses") : 0,
    flight: 1 - gemBy(s, "ice", OLD_FX.ice.slow),
    stamina: gemBy(s, "earth", OLD_FX.earth.stamina),
    fresh: has(s, "ntFresh"),
    twin: gemBy(s, "lightning", OLD_FX.lightning.chance),
    seen: gemBy(s, "light", OLD_FX.light.bugNet.seen),
    rare: gemBy(s, "dark", OLD_FX.dark.bugNet.rare, 1),
    wide: has(s, "ntWide") ? optN("ntWide", "reach") : 0,
    freeze: has(s, "ntFreeze") ? optN("ntFreeze", "secs") : 0,
    nest: has(s, "ntNest"),
  };
}

/* ── the pot, the pan and the grill ─────────────────────────────────────── */

/** What a piece of cookware's forging is to the stirring and to the pot it cooks (lib/town/stirring, lib/town/cooking). */
export interface CookFx {
  /** The stirring's good pace, so many times as wide either side. */
  band: number;
  /** The share of the stirs taken off (never under one stir). */
  shorter: number;
  /** Misses of a pot that lose no helping. */
  spared: number;
  /** How long a slip may last before it costs, so many times. */
  grace: number;
  /** The share of a pot's stamina taken off; and whether the first pot of a meal's hours costs none (the counted option). */
  stamina: number;
  fresh: boolean;
  /** How likely a pot has a helping more. */
  helping: number;
  /** Helpings more in a pot of a dish (the counted option: so many pots a day); none: 0. */
  big: number;
}
export const PLAIN_COOK: CookFx = { band: 1, shorter: 0, spared: 0, grace: 1, stamina: 0, fresh: false, helping: 0, big: 0 };
export const COOK_KINDS: readonly ToolKind[] = ["pot", "pan", "grill"];
export function cookFx(stack: Held): CookFx {
  const s = of(stack, ...COOK_KINDS);
  if (!s) return PLAIN_COOK;
  const kind = toolKindOf(s.item) as "pot" | "pan" | "grill", dark = gemBy(s, "dark", OLD_FX.dark.cook.helping);
  return {
    band: LEVELS[kind].band[levelOf(s)] * (dark > 0 ? 1 / (1 + OLD_FX.dark.cook.harder) : 1),
    shorter: 1 - (1 - gemBy(s, "fire", OLD_FX.fire.cook.shorter)) * (1 - (has(s, "ckBrisk") ? optN("ckBrisk", "shorter") : 0)),
    spared: gemBy(s, "water", OLD_FX.water.spared) + (has(s, "ckBase") ? optN("ckBase", "misses") : 0),
    grace: 1 / (1 - gemBy(s, "ice", OLD_FX.ice.slow)),
    stamina: gemBy(s, "earth", OLD_FX.earth.stamina),
    fresh: has(s, "ckFresh"),
    helping: Math.max(gemBy(s, "lightning", OLD_FX.lightning.chance), dark),
    big: has(s, "ckBig") ? optN("ckBig", "more") : 0,
  };
}
/** How many stirs a pot wants with a piece of cookware, of the stirs it plainly wants: so much fewer, rounded up, never under one. */
export const stirsWith = (need: number, fx: Pick<CookFx, "shorter">): number => (fx.shorter > 0 ? Math.max(1, Math.ceil(need * (1 - fx.shorter) - 1e-9)) : need);
/** How many hits a plot wants with a hoe, of the hits it plainly wants: so many fewer, never under one. */
export const hitsWith = (need: number, fx: Pick<HoeFx, "fewer">): number => (fx.fewer > 0 && need > 0 ? Math.max(1, need - fx.fewer) : need);
/** The misses a game is told of, with so many of the first not counted. */
export const missesWith = (misses: number, spared: number): number => Math.max(0, Math.floor(misses) - Math.max(0, Math.floor(spared)));
