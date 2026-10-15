import { describe, expect, it } from "vitest";
import atlas from "./icon-atlas.json";
import { BANDS } from "./bands";
import { FAMILIES, FINDS, FISH_SHARE, FOREST_FINDS, FRESH, GUANO, INSECT_WEIGHT, NEW_FISH_ROWS, NEW_HAUNT_KINDS, NEW_INSECTS, NEW_POLLINATOR_SKY, QUIET, SMALL_FISH_BAITS, WINDOWS, hoursOf, inHours, outNow } from "./band-species";
import { FRESH_JUNK, freshOdds, oddsOf } from "./fishing";
import { KINDS, SPOTS, holds, turnOf, turnStart } from "./forest";
import { POLLINATOR_SKY } from "./helper-items";
import { INSECT_GARDEN, insectCareMode } from "./insect-garden";
import { BUGS, BUG_IDS, HAUNTS, HAUNT_KINDS, comeback, farmBugs, swarmAt, type BugId, type Haunt } from "./insects";
import { BAITS, BAIT_AS, FISH, FRESH_FISH_IDS, ITEMS, WEIGHED_FISH_IDS, type BaitId, type CatchId, type ItemId } from "./items";
import { guanoOf, type Go, type Mined } from "./mining";
import { roll } from "./farm";
import { sampleOut, streamWork, STREAM_WORK } from "./stream-work";
import { HOUR, newPurse } from "./trade";
import { DRY } from "./weather";

const T0 = Date.UTC(2026, 9, 20) - 7 * HOUR; // 00:00 Thai time
const at = (h: number) => T0 + h * HOUR;
const OLD_HAUNTS = 94;

describe("the time bands' newcomers (piece 4b)", () => {
  it("has the design's forty-eight, each an item with a picture, a family and a window", () => {
    expect(NEW_INSECTS.length).toBe(24);
    expect(NEW_FISH_ROWS.length).toBe(24);
    const ids = [...NEW_INSECTS.map((r) => r.id), ...NEW_FISH_ROWS.map((r) => r.id), ...Object.keys(FINDS)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(ITEMS[id as ItemId], id).toBeTruthy();
      expect((atlas.icons as Record<string, unknown>)[id], `${id}'s picture`).toBeTruthy();
    }
    // (glow powder's picture is drawn; the item comes with its recipe in piece 3) and the mist's time icon
    expect((atlas.icons as Record<string, unknown>).glowPowder).toBeTruthy();
    expect((ITEMS as Record<string, unknown>).glowPowder).toBeUndefined();
    expect((atlas.icons as Record<string, unknown>).timeMist).toBeTruthy();
    expect(WINDOWS.length).toBe(24 + 24 + 4);
    for (const w of WINDOWS) {
      expect(w.bands.length).toBeGreaterThan(0);
      if (w.family) expect(FAMILIES[w.family]).toBeTruthy();
    }
    // about a third span two or three adjacent bands; the 🌫 icon only on 03–07 insects
    expect(WINDOWS.filter((w) => w.kind !== "find" && w.bands.length > 1).length).toBe(16);
    for (const r of NEW_INSECTS) if (r.time === "mist") expect(r.bands.every((b) => b === "beforeDawn" || b === "earlyMorning")).toBe(true);
  });

  it("turns bands into hours, past midnight too", () => {
    expect(hoursOf(["lateNight"])).toEqual([[0, 3], [23, 24]]);
    expect(hoursOf(["lateNight", "beforeDawn"])).toEqual([[0, 5], [23, 24]]);
    expect(hoursOf(["evening", "night"])).toEqual([[16, 23]]);
    expect(hoursOf(BANDS.map((b) => b.id))).toEqual([[0, 24]]);
    expect(inHours([[23, 24], [0, 3]], 2.5)).toBe(true);
  });

  it("lays its own haunts after every old one, leaving those as they were", () => {
    expect(HAUNTS.length).toBe(OLD_HAUNTS + 31);
    expect(HAUNTS.slice(0, OLD_HAUNTS).every((h) => !NEW_HAUNT_KINDS.includes(h.kind as never))).toBe(true);
    expect(HAUNTS.slice(OLD_HAUNTS).every((h) => HAUNT_KINDS[h.kind].alone)).toBe(true);
    for (const r of NEW_INSECTS) expect(HAUNTS.some((h) => h.kind === r.at && h.place === r.place && (!r.zones || r.zones.includes(h.zone as never))), `${r.id} has a haunt`).toBe(true);
  });

  it("never puts a newcomer at an old haunt nor an old insect at a newcomers' one, at any hour", () => {
    const fresh = new Set<string>(NEW_INSECTS.map((r) => r.id));
    for (let h = 0; h < 24; h++) {
      for (const haunt of HAUNTS) {
        const s = swarmAt("w", haunt, at(h + 0.3));
        if (!s) continue;
        expect(fresh.has(s.bug), `${s.bug} at ${haunt.kind}`).toBe(!!HAUNT_KINDS[haunt.kind].alone);
      }
    }
  });

  it("brings each newcomer out about as often as its rarity says", () => {
    const rate = (id: BugId) => {
      const b = BUGS[id];
      let sum = 0, n = 0;
      for (let h = 0; h < 24; h++) {
        if (!inHours(b.hours!, h + 0.5)) continue;
        for (const haunt of HAUNTS) {
          if (!b.at.includes(haunt.kind) || (b.places && !b.places.includes(haunt.place))) continue;
          const kind = HAUNT_KINDS[haunt.kind], w = (x: BugId) => (BUGS[x].peak && !inHours(BUGS[x].peak!, h + 0.5) ? BUGS[x].weight * QUIET.offPeak : BUGS[x].weight);
          const fit = BUG_IDS.filter((x) => BUGS[x].at.includes(haunt.kind) && (!BUGS[x].places || BUGS[x].places!.includes(haunt.place)) && inHours(BUGS[x].hours!, h + 0.5));
          sum += (60 / kind.every) * kind.chance * (w(id) / (fit.reduce((t, x) => t + w(x), 0) + (kind.none ?? 0)));
        }
        n++;
      }
      return sum / n;
    };
    const band = { C: [2.5, 7], U: [1, 3], R: [0.3, 1] } as const;
    for (const r of NEW_INSECTS) {
      const got = rate(r.id as BugId);
      expect(got, `${r.id} (${r.rarity}) ${got.toFixed(2)} an hour on its map`).toBeGreaterThanOrEqual(band[r.rarity][0]);
      expect(got, `${r.id} (${r.rarity}) ${got.toFixed(2)} an hour on its map`).toBeLessThanOrEqual(band[r.rarity][1]);
    }
    expect(INSECT_WEIGHT.C).toBeGreaterThan(INSECT_WEIGHT.U);
  });

  it("sends nothing back from a newcomers' haunt, and nothing back to one", () => {
    const from = HAUNTS.find((h) => h.kind === "petals")!;
    expect(comeback("w", from, at(10), DRY, [], [0.5, 0.5, 0.5])).toBeNull();
    for (let i = 0; i < 40; i++) {
      const old = HAUNTS[i % OLD_HAUNTS], back = comeback("w", old, at(i % 24) + i * 61_000, DRY, [], [i / 40, 0.5, 0.5]);
      if (back) expect(HAUNT_KINDS[HAUNTS[back.haunt].kind].alone).toBeUndefined();
    }
  });

  it("does not count a newcomer on the farm among the insects that bring pests", () => {
    const farm = HAUNTS.filter((h) => h.place === "farm");
    const has = (h: Haunt) => (HAUNT_KINDS[h.kind].alone ? { turn: 1, bug: "roseChafer" as BugId, n: 1, seed: 1 } : null);
    expect(farm.some((h) => HAUNT_KINDS[h.kind].alone)).toBe(true);
    expect(farmBugs("w", at(9), DRY, () => 0, [], [], has)).toBe(0);
    expect(INSECT_GARDEN.visitors).toContain("roseChafer");
  });

  it("gives the pollinators and the hunters their family's use, and the pollinators their sky", () => {
    for (const r of NEW_INSECTS) {
      if (r.family === "pollinator") { expect(insectCareMode(r.id as ItemId)).toBe("pollinate"); expect(POLLINATOR_SKY[r.id]).toBe(r.time === "moon" ? "moon" : r.time === "mist" ? "mist" : "sun"); }
      else if (r.family === "predator") expect(insectCareMode(r.id as ItemId)).toBe("guard");
      else expect(insectCareMode(r.id as ItemId)).toBeNull();
    }
    expect(Object.keys(NEW_POLLINATOR_SKY).length).toBe(8);
  });
});

describe("the newcomer fish take only what is no fish's place", () => {
  const casts: Array<[BaitId, number, "town" | "creek" | "pool" | "headwater", boolean]> = [];
  for (const h of [1, 4, 6, 9, 12, 14, 17, 20, 23]) for (const hab of ["town", "creek", "pool", "headwater"] as const) for (const bait of ["worm", "dough", "corn", "cricket", "shrimpLive", "minnow", "zebrafish"] as BaitId[]) casts.push([bait, h, hab, hab === "town" && h % 2 === 0]);

  it("keeps every fish's chance on every cast to the last digit, and the whole at one", () => {
    let some = 0;
    for (const [bait, h, hab, shallow] of casts) {
      const odds = oddsOf(bait, h, false, false, shallow, [], hab, "eddy"), fresh = freshOdds(odds, bait, h, hab, shallow);
      for (const o of odds) if (!FRESH_JUNK.includes(o.what as never)) expect(fresh.find((f) => f.what === o.what)!.p).toBe(o.p);
      expect(fresh.reduce((t, o) => t + o.p, 0)).toBeCloseTo(1, 12);
      const junk = odds.filter((o) => FRESH_JUNK.includes(o.what as never)).reduce((t, o) => t + o.p, 0);
      const taken = fresh.filter((o) => FRESH_FISH_IDS.includes(o.what as never)).reduce((t, o) => t + o.p, 0);
      expect(taken).toBeLessThanOrEqual(junk * FRESH.take + 1e-12);
      if (taken > 0) some++;
    }
    expect(some).toBeGreaterThan(20);
  });

  it("is never weighed with the old fish, keeps out of a stardust bait and of the tiers a gift keeps off", () => {
    for (const id of FRESH_FISH_IDS) expect(WEIGHED_FISH_IDS).not.toContain(id);
    const odds = oddsOf("worm", 4, false, false, false, [], "town", "eddy");
    expect(odds.some((o) => FRESH_FISH_IDS.includes(o.what as never))).toBe(false);
    const kept = freshOdds(odds, "worm", 4, "town", false, ["legend"]);
    expect(kept.some((o) => o.what === "pearlDanio")).toBe(false);
    expect(freshOdds(odds, "worm", 4, "town", false).some((o) => o.what === "pearlDanio")).toBe(true);
    // off the bank only the common ones, as the old fish
    expect(freshOdds(oddsOf("worm", 4, false, false, true, [], "town", "eddy"), "worm", 4, "town", true).some((o) => o.what === "pearlDanio")).toBe(false);
  });

  it("has every newcomer fish come on its bait in its water at some hour", () => {
    for (const id of FRESH_FISH_IDS) {
      const f = FISH[id], bait = Object.keys(f.baits)[0] as BaitId, hab = f.habitat![0];
      expect(Array.from({ length: 24 }, (_, h) => h).some((h) => freshOdds([{ what: "hyacinth", p: 1 }], bait, h, hab, false).some((o) => o.what === id)), id).toBe(true);
    }
  });

  it("puts a newcomer small fish on a hook as a minnow", () => {
    for (const id of SMALL_FISH_BAITS) { expect(BAITS).toContain(id); expect(BAIT_AS[id]).toBe("minnow"); }
    const a = oddsOf("minnow", 21, false, false, false, [], "town", "eddy"), b = oddsOf("zebrafish", 21, false, false, false, [], "town", "eddy");
    expect(b).toEqual(a);
  });

  it("shares a cast by rarity where there is room, rarer where the old fish leave little", () => {
    const odds: Array<{ what: CatchId; p: number }> = [{ what: "hyacinth", p: 0.9 }, { what: "boot", p: 0.1 }];
    const got = freshOdds(odds, "cricket", 1, "headwater", false);
    expect(got.find((o) => o.what === "dollyVarden")!.p).toBeCloseTo(FISH_SHARE.U, 12);
    expect(FISH.lenok.peak).toEqual([[5, 7]]);
    const off = freshOdds(odds, "cricket", 8, "headwater", false);
    expect(off.find((o) => o.what === "lenok")!.p).toBeCloseTo(FISH_SHARE.R * FRESH.offPeak, 12);
  });
});

describe("the rare finds", () => {
  const oldHolds = (salt: string, spot: (typeof SPOTS)[number], now: number) => {
    const kind = KINDS[spot.kind], turn = turnOf(spot, now), at0 = turnStart(spot, turn);
    if (roll(`${salt}:has`, spot.id, turn) >= kind.chance) return null;
    const h = ((((at0 + 7 * HOUR) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR)) / HOUR;
    const may = kind.finds.filter((f) => !f.quiet && (!f.zones || f.zones.includes(spot.zone)) && (!f.hours || f.hours.some(([a, b]) => h >= a && h < b)) && !f.rain && !f.day && !f.moon);
    return may.length ? "some" : null;
  };
  it("come only in a turn that had nothing, never in another's place", () => {
    let quiet = 0;
    for (const spot of SPOTS.filter((s) => s.kind === "mushrooms" || s.kind === "flowers")) {
      for (let k = 0; k < 96; k++) {
        const now = at(k / 4), h = holds("w", spot, now);
        if (h && (h.item === "mistMushroom" || h.item === "queenPollen")) { expect(oldHolds("w", spot, now)).toBeNull(); quiet++; }
      }
    }
    expect(quiet).toBeGreaterThan(0);
    expect(FOREST_FINDS.mushrooms[0].hours).toEqual([[3, 5]]);
    expect(FOREST_FINDS.flowers[0].hours).toEqual([[0, 3], [23, 24]]);
  });

  it("has the dew at the stream's banks in its band only", () => {
    expect(STREAM_WORK.sites.every((s) => (s.items as readonly string[]).includes("morningDew"))).toBe(true);
    expect(sampleOut("morningDew", at(6))).toBe(true);
    expect(sampleOut("morningDew", at(8))).toBe(false);
    expect(sampleOut("riverGrit", at(8))).toBe(true);
    const p = newPurse(), site = STREAM_WORK.sites[0];
    expect(streamWork(p, "sample", "morningDew", [site.x, site.y], null, "me", at(8))).toEqual({ ok: false, why: "none" });
    const ok = streamWork(p, "sample", "morningDew", [site.x, site.y], null, "me", at(6));
    expect(ok.ok && ok.got).toEqual([["morningDew", 1]]);
  });

  it("lets bat guano fall with a cave rock in its hour only, besides what the rock left", () => {
    const mined = (): Mined => ({ ok: true, done: true, purse: newPurse(), struck: { first: "me", by: {} } as never, broke: [1, 2, 3, 4, 5, 6], chained: null, got: [["stone", 6]],
      way: null, vein: null, crystal: false, loose: [], cost: 1, spent: false, each: [1, 2, 3, 4, 5, 6].map((rock) => ({ rock, kind: "stone" as const, shards: 0 })), moss: [] });
    const go = (h: number, floor = 3) => ({ now: at(h), floor, salt: "w" }) as unknown as Go;
    const dusk = guanoOf(mined(), go(18.5), 7), before = guanoOf(mined(), go(17.5), 7), foot = guanoOf(mined(), go(18.5, 0), 7);
    expect(before.got).toEqual([["stone", 6]]);
    expect(foot.got).toEqual([["stone", 6]]);
    expect(dusk.got[0]).toEqual(["stone", 6]);
    const n = dusk.got.find(([id]) => id === GUANO.item)?.[1] ?? 0;
    expect(n).toBe([1, 2, 3, 4, 5, 6].filter((rock) => roll("w:guano", 3, rock, 7) < GUANO.chance).length);
    expect(n).toBeGreaterThan(0);
    // a full bag loses the guano, never the go
    const full = mined(); full.purse = { ...full.purse, bag: full.purse.bag.map(() => ({ item: "stone" as ItemId, n: 99 })) };
    expect(guanoOf(full, go(18.5), 7).got).toEqual([["stone", 6]]);
  });
});

describe("what is out now", () => {
  it("lists for a map and a band the newcomers whose window and place hold", () => {
    const forestBeforeDawn = outNow("forest", "beforeDawn").map((w) => w.id);
    expect(forestBeforeDawn).toEqual(expect.arrayContaining(["megaloptaBee", "ghostMantis", "railroadWorm", "peacockGudgeon", "huchen", "mistMushroom"]));
    expect(forestBeforeDawn).not.toContain("masonBee");
    expect(outNow("town", "lateMorning").map((w) => w.id)).toEqual(expect.arrayContaining(["masonBee", "zebrafish"]));
    expect(outNow("cave", "evening").map((w) => w.id)).toEqual(["batGuano"]);
    expect(outNow("mountain", "earlyMorning").map((w) => w.id)).toEqual(expect.arrayContaining(["morningDew", "lenok"]));
    for (const b of BANDS) expect(BANDS.some((x) => outNow("forest", x.id).length > 0)).toBe(true);
  });
});
