/**
 * The insect house (the farm's Quality, piece 4a; the owner's design, 2026-10-15: "สองห้อง สามบทบาท ต้องเลือก"). The
 * woodworkers make it and it may be sold; it stands on a plot of its owner's bed, one a bed, and has two rooms. An
 * insect put in a room is spent (it is not given back) and covers half its role's bar for every plant of the bed within
 * two plots of the house (5×5): a pollinator the pollen bar, a predator the guard bar, a soil-worker the soil bar; no
 * insect covers water. A common insect stays 48 hours and a rare one 72, and a rare one raises the floor of the plants
 * it covers (the range's `rare` narrowing) for as long as it stays. With its favourite plant (a helper of another role)
 * standing within the house's reach when it goes in, it stays 24 hours more (mine: the design said "when it is there";
 * the moment it goes in is the one moment it is asked, so the room keeps when it ends).
 *
 * What each room covers reaches a plant through its bed's gift (lib/town/quality-plant's bedGift), worked out afresh
 * whenever the bed changes; a house set, filled or lifted is such a change. The house's own plot is `soil: "house"`,
 * so nothing is sown, hoed or spread onto it while it stands. Setting, filling and lifting it are the house's own
 * deeds (`houseDeedFor`, `houseDo`), done with the whole bed in view, not the farm's `tend`.
 */
import { ITEMS, type ItemId } from "./items";
import type { CompanionId, Role } from "./quality";
import { toolOf, type Plot } from "./farm";
import { INSECT_GARDEN } from "./insect-garden";
import { spend } from "./stamina";
import { held, no, put, roomFor, take, type Done, type Purse, type Refusal } from "./trade";
import { bedOf } from "./world";
import { DECOMPOSERS } from "./band-species";

export const HOUSE = {
  /** The plots each way the house reaches (5×5 about it). */
  reach: 2,
  /** How long a common insect stays, and a rare one, in hours; and what its favourite plant adds. */
  hours: 48, rareHours: 72, favHours: 24,
  /** An insect's share of a bar. */
  level: 0.5,
  rooms: 2,
  /** What a rare insect pays at least (lib/town/insects' TIERS.rare). */
  rarePays: 20,
  /** Stamina: setting the house down, putting an insect in, lifting it. */
  costs: { set: 1, room: 1, lift: 1 },
  /**
   * How often a hunter in a room keeps off a pest that would strike a plant it reaches (lib/town/farm's houseKeepAt; the
   * owner, 2026-10-19, asked whether the ladybird and the mantis should do less, and chose Codex's answer): the cheap
   * ones half the time, every other hunter seven times in ten; none of them always, which is the made cure's.
   */
  keep: 0.7,
  keeps: { ladybird: 0.5, mantis: 0.7, robberFly: 0.5, antlion: 0.5, roveBeetle: 0.5 } as Partial<Record<ItemId, number>>,
} as const;

/** An insect in a room: which, since when, and until when it stays; a hunter, how often it keeps a pest off, as it was when it went in (`keepOf`: so that a change of the numbers later changes no hour gone by). */
export interface HouseRoom { bug: ItemId; from: number; until: number; k?: number }
/** A house on a plot: whose, since when, and its two rooms (null when empty). */
export interface InsectHouse { by: string; at: number; rooms: Array<HouseRoom | null> }
/** What one room gives a plant of the bed: its role's half from `from` to `to`, by the share `s` of the plant's plots in reach; `x` when it is rare; `k`, a hunter's, how often it keeps a pest off (`keepOf`). */
export interface HouseCover { r: Role; from: number; to: number; s: number; x?: 1; k?: number }

/**
 * Each house insect's favourite plant, a helper of another role (mine, 2026-10-15, after what each is drawn to:
 * bees to clover and beans, hoverflies and lacewings to the umbels and buckwheat, whites to nasturtium, fig beetles to
 * the fig, the mantis to fennel as the design's mock showed).
 */
export const FAVOURITES: Partial<Record<ItemId, CompanionId>> = {
  honeyBee: "clover", carpenterBee: "runnerBean", hoverfly: "dill", pollenMidge: "watercress", silkMoth: "buckwheat",
  orchardBeetle: "fig", butterflyWhite: "nasturtium", monarch: "marigold", morpho: "gardenStrawberry", moth: "mint",
  lunaMoth: "rhubarb", hawkMoth: "sesame",
  lacewing: "buckwheat", goldenAnt: "peanut", mantis: "fennel", ladybird: "chamomile", orchidMantis: "passionfruit",
  // (the time bands' newcomers, lib/town/band-species: the bees to fruit blossom, clover and cress, the night moths to
  // pale tubular flowers, the hunters where their prey gathers, the soil-workers to rot and damp)
  megaloptaBee: "chamomile", indianNightBee: "mint", masonBee: "gardenStrawberry", woolCarderBee: "sesame", blueBandedBee: "watercress",
  clearwingMoth: "nasturtium", yuccaMoth: "peanut", tobaccoHawkmoth: "garlicChives",
  ghostMantis: "lavender", snakefly: "borage", tigerBeetle: "clover", assassinBug: "milkweed", robberFly: "buckwheat", antlion: "peanut", roveBeetle: "rhubarb",
  earwig: "marigold", roseChafer: "borage", oilBeetle: "dill", superworm: "rhubarb", bessBeetle: "fig",
};

/** The insects that work the soil: the decomposers of the time bands' newcomers (lib/town/band-species). */
export { DECOMPOSERS as SOIL_WORKERS } from "./band-species";

/** What an insect does in a house: its role, or null for one that has no room there. */
export function houseRoleOf(id: ItemId | null | undefined): Role | null {
  if (!id) return null;
  if (INSECT_GARDEN.pollinators.includes(id)) return "pollen";
  if (INSECT_GARDEN.predators.includes(id)) return "guard";
  return (DECOMPOSERS as readonly string[]).includes(id) ? "soil" : null;
}
/** How often a hunter in a room keeps off a pest that would strike (`HOUSE.keeps`, else `HOUSE.keep`). */
export const keepOf = (id: ItemId): number => HOUSE.keeps[id] ?? HOUSE.keep;
/** Whether a house insect is rare (by what it is worth, as lib/town/insects' tiers have it). */
export const isRareInHouse = (id: ItemId): boolean => (ITEMS[id]?.pays ?? 0) >= HOUSE.rarePays;

const at = (key: string): [number, number] => key.split(",").map(Number) as [number, number];
/** Whether a plot is within a house's reach: of its bed, and two plots or fewer each way. */
export function inReach(houseKey: string, cell: string): boolean {
  const [x, y] = at(houseKey), [u, v] = at(cell);
  return Math.abs(x - u) <= HOUSE.reach && Math.abs(y - v) <= HOUSE.reach && bedOf(x, y) === bedOf(u, v);
}
/** The plant whose root is a plot, if one is. */
const rootAt = (plots: Readonly<Record<string, Plot>>, key: string) => { const p = plots[key]?.plant; return p && (!p.root || p.root === key) ? p : null; };
/** The plants (by their root plots) of the house's bed that it reaches. */
export function plantsInReach(houseKey: string, plots: Readonly<Record<string, Plot>>): string[] {
  return Object.keys(plots).sort().filter((k) => { const p = rootAt(plots, k); return !!p && (p.footprint ?? [k]).some((c) => inReach(houseKey, c)); });
}
/** Whether an insect's favourite plant stands in the house's reach. */
export const favouriteNear = (houseKey: string, bug: ItemId, plots: Readonly<Record<string, Plot>>): boolean =>
  !!FAVOURITES[bug] && plantsInReach(houseKey, plots).some((k) => rootAt(plots, k)!.crop === FAVOURITES[bug]);

/** The house of a bed, if it has one: its plot. */
export function houseOfBed(bed: number, plots: Readonly<Record<string, Plot>>): string | null {
  return Object.keys(plots).sort().find((k) => !!plots[k]?.house && bedOf(...at(k)) === bed) ?? null;
}

/** What the house of its bed gives a plant on `cells`: each room's cover, by the share of its plots in reach. */
export function houseCovers(cells: readonly string[], plots: Readonly<Record<string, Plot>>): HouseCover[] {
  const out: HouseCover[] = [];
  for (const key of Object.keys(plots).sort()) {
    const house = plots[key]?.house;
    if (!house) continue;
    const s = cells.filter((c) => inReach(key, c)).length / cells.length;
    if (!(s > 0)) continue;
    for (const room of house.rooms) {
      const r = room ? houseRoleOf(room.bug) : null;
      if (room && r) out.push({ r, from: room.from, to: room.until, s, ...(isRareInHouse(room.bug) ? { x: 1 as const } : {}), ...(r === "guard" ? { k: room.k ?? keepOf(room.bug) } : {}) });
    }
  }
  return out;
}

/** The first room an insect may go into at a moment: an empty one, or one whose insect has left. -1 when both are lived in. */
export const freeRoom = (house: InsectHouse, now: number): number => house.rooms.findIndex((room) => !room || room.until <= now);

/* ── the house's deeds ── */

export type HouseDeed = "house" | "room" | "lift";
export type HouseRefusal = "hand" | "soil" | "theirs" | "beds" | "rooms";

/**
 * What the thing in the hand does at a plot with a house in mind, if anything: the house itself set on an empty plot of
 * my own bed that has none (tilled or cleared ground), a house insect put in a free room of my house, my house lifted
 * with the hoe. `owner`: whose the bed is now (lib/town/farm's ownerOf).
 */
export function houseDeedFor(key: string, plots: Readonly<Record<string, Plot>>, hand: ItemId | null, me: string, owner: string | null, now: number): HouseDeed | null {
  const plot = plots[key], house = plot?.house;
  if (house) {
    // (one left by whoever no longer holds the bed is the bed's owner's to lift with a hoe, as a plant left there is
    // theirs to dig out: it goes to their bag)
    if (house.by !== me) return owner === me && house.by !== owner && toolOf(hand) === "hoe" ? "lift" : null;
    if (toolOf(hand) === "hoe") return "lift";
    return houseRoleOf(hand) && freeRoom(house, now) >= 0 ? "room" : null;
  }
  if (hand !== "insectHouse" || owner !== me || !plot || plot.plant || (plot.soil !== "tilled" && plot.soil !== "cleared")) return null;
  return houseOfBed(bedOf(...at(key)), plots) === null ? "house" : null;
}

/** Do it: what the purse and the plot are after. (Lifting gives the house back; the insects in it are spent.) */
export function houseDo(key: string, plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, owner: string | null, now: number):
  Done<{ deed: HouseDeed; purse: Purse; plot: Plot }> | { ok: false; why: Refusal | HouseRefusal } {
  const hand = purse.hand && held(purse.bag, purse.hand) > 0 ? purse.hand : null, deed = houseDeedFor(key, plots, hand, me, owner, now);
  const plot = plots[key], house = plot?.house;
  if (!deed) return { ok: false, why: house && house.by !== me ? "theirs" : house ? (houseRoleOf(hand) ? "rooms" : "hand") : hand === "insectHouse" ? (owner !== me ? "theirs" : "soil") : "hand" };
  if (deed === "house") {
    return { ok: true, deed, purse: { ...spend(purse, HOUSE.costs.set, now), bag: take(purse.bag, "insectHouse", 1) }, plot: { soil: "house", plant: null, house: { by: me, at: now, rooms: Array(HOUSE.rooms).fill(null) } } };
  }
  if (deed === "lift") {
    if (roomFor(purse.bag, "insectHouse") < 1) return no("full");
    return { ok: true, deed, purse: { ...spend(purse, HOUSE.costs.lift, now), bag: put(purse.bag, "insectHouse", 1) }, plot: { soil: "tilled", plant: null } };
  }
  const bug = hand!, i = freeRoom(house!, now), stay = (isRareInHouse(bug) ? HOUSE.rareHours : HOUSE.hours) + (favouriteNear(key, bug, plots) ? HOUSE.favHours : 0);
  const rooms = house!.rooms.map((r, j) => (j === i ? { bug, from: now, until: now + stay * 3_600_000, ...(houseRoleOf(bug) === "guard" ? { k: keepOf(bug) } : {}) } : r));
  return { ok: true, deed, purse: { ...spend(purse, HOUSE.costs.room, now), bag: take(purse.bag, bug, 1) }, plot: { ...plot!, house: { ...house!, rooms } } };
}
