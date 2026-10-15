import { describe, expect, it } from "vitest";
import type { Plant, Plot } from "./farm";
import { barsOfQ, narrowingOfQ } from "./quality";
import { bedGift, settled, syncQuality } from "./quality-plant";
import { HOUSE, freeRoom, houseCovers, houseDeedFor, houseDo, houseRoleOf, inReach, isRareInHouse, plantsInReach } from "./insect-house";
import { newPurse, put, held, type Purse } from "./trade";
import { bedOf } from "./world";

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20), LAUNCH = T0 - 100 * H;
const grow = (crop: Plant["crop"], more: Partial<Plant> = {}): Plot => ({ soil: "tilled", plant: { by: "me", crop, sown: T0, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more } });
const holding = (item: string, n = 1): Purse => { const p = newPurse(); return { ...p, bag: put(p.bag, item as never, n), hand: item as never }; };
const housed = (rooms: Plot["house"] extends infer T ? T extends { rooms: infer R } ? R : never : never): Plot => ({ soil: "house", plant: null, house: { by: "me", at: T0, rooms } });

describe("the insect house", () => {
  it("gives each insect its role: pollinators the pollen bar, predators the guard bar, nothing for the rest", () => {
    expect(houseRoleOf("honeyBee")).toBe("pollen");
    expect(houseRoleOf("hawkMoth")).toBe("pollen");
    expect(houseRoleOf("mantis")).toBe("guard");
    expect(houseRoleOf("tomato")).toBeNull();
    expect(houseRoleOf(null)).toBeNull();
  });

  it("reaches two plots each way, in its own bed only", () => {
    expect(bedOf(133, 5)).toBe(bedOf(135, 7));
    expect(inReach("133,5", "135,7")).toBe(true);
    expect(inReach("133,5", "136,5")).toBe(false);
    expect(inReach("133,5", "120,5")).toBe(false);
  });

  it("is set on an empty plot of my own bed that has none, and nowhere else", () => {
    const plots = { "133,5": { soil: "tilled", plant: null } as Plot, "134,5": grow("tomato"), "120,5": { soil: "cleared", plant: null } as Plot };
    expect(houseDeedFor("133,5", plots, "insectHouse", "me", "me", T0)).toBe("house");
    expect(houseDeedFor("133,5", plots, "insectHouse", "me", "them", T0)).toBeNull();
    expect(houseDeedFor("134,5", plots, "insectHouse", "me", "me", T0)).toBeNull();
    expect(houseDeedFor("133,5", { ...plots, "133,5": { soil: "wild", plant: null } }, "insectHouse", "me", "me", T0)).toBeNull();
    // one a bed
    expect(houseDeedFor("133,5", { ...plots, "135,6": housed([null, null]) }, "insectHouse", "me", "me", T0)).toBeNull();
    const did = houseDo("133,5", plots, holding("insectHouse"), "me", "me", T0);
    expect(did.ok && did.plot).toEqual({ soil: "house", plant: null, house: { by: "me", at: T0, rooms: [null, null] } });
    expect(did.ok && held(did.purse.bag, "insectHouse")).toBe(0);
  });

  it("left by whoever no longer holds the bed, is the bed's owner's to lift with a hoe, and to nobody else", () => {
    const left: Plot = { soil: "house", plant: null, house: { by: "them", at: T0, rooms: [null, null] } }, plots = { "133,5": left };
    expect(houseDeedFor("133,5", plots, "hoe", "me", "me", T0)).toBe("lift");
    expect(houseDeedFor("133,5", plots, "honeyBee", "me", "me", T0)).toBeNull();
    expect(houseDeedFor("133,5", plots, "hoe", "me", "them", T0)).toBeNull();
    expect(houseDeedFor("133,5", plots, "hoe", "me", null, T0)).toBeNull();
    const did = houseDo("133,5", plots, holding("hoe"), "me", "me", T0);
    expect(did.ok && did.plot).toEqual({ soil: "tilled", plant: null });
    expect(did.ok && held(did.purse.bag, "insectHouse")).toBe(1);
  });

  it("takes an insect into a free room for 48 hours, a rare one for 72, and 24 more with its favourite near", () => {
    const plots: Record<string, Plot> = { "133,5": housed([null, null]), "134,5": grow("tomato") };
    expect(houseDeedFor("133,5", plots, "honeyBee", "me", "me", T0)).toBe("room");
    expect(houseDeedFor("133,5", plots, "honeyBee", "you", "me", T0)).toBeNull();
    const bee = houseDo("133,5", plots, holding("honeyBee"), "me", "me", T0);
    expect(bee.ok && bee.plot.house!.rooms[0]).toEqual({ bug: "honeyBee", from: T0, until: T0 + 48 * H });
    expect(bee.ok && held(bee.purse.bag, "honeyBee")).toBe(0);
    // clover (soil) stands in reach: the bee stays a day more
    const near = houseDo("133,5", { ...plots, "134,6": grow("clover") }, holding("honeyBee"), "me", "me", T0);
    expect(near.ok && near.plot.house!.rooms[0]!.until).toBe(T0 + (48 + HOUSE.favHours) * H);
    const rare = (["morpho", "lunaMoth", "orchidMantis", "goldenAnt"] as const).find((b) => isRareInHouse(b));
    if (rare) {
      const did = houseDo("133,5", plots, holding(rare), "me", "me", T0);
      expect(did.ok && did.plot.house!.rooms[0]!.until - T0).toBeGreaterThanOrEqual(72 * H);
    }
  });

  it("has no room while both are lived in, and frees one when its insect leaves", () => {
    const full = housed([{ bug: "honeyBee", from: T0, until: T0 + 48 * H }, { bug: "mantis", from: T0, until: T0 + 72 * H }]);
    expect(freeRoom(full.house!, T0 + H)).toBe(-1);
    expect(houseDeedFor("133,5", { "133,5": full }, "honeyBee", "me", "me", T0 + H)).toBeNull();
    expect(houseDo("133,5", { "133,5": full }, holding("honeyBee"), "me", "me", T0 + H)).toEqual({ ok: false, why: "rooms" });
    expect(freeRoom(full.house!, T0 + 50 * H)).toBe(0);
  });

  it("is lifted with the hoe, back into the bag, its insects spent and its plot tilled", () => {
    const plots = { "133,5": housed([{ bug: "honeyBee", from: T0, until: T0 + 48 * H }, null]) };
    expect(houseDeedFor("133,5", plots, "hoe", "me", "me", T0)).toBe("lift");
    const did = houseDo("133,5", plots, holding("hoe"), "me", "me", T0);
    expect(did.ok && did.plot).toEqual({ soil: "tilled", plant: null });
    expect(did.ok && held(did.purse.bag, "insectHouse")).toBe(1);
    expect(houseDeedFor("133,5", { "133,5": { ...plots["133,5"], house: { ...plots["133,5"].house!, by: "them" } } }, "hoe", "me", "them", T0)).toBeNull();
  });

  it("covers half the bar of each room's role for the plants it reaches, while its insect stays", () => {
    const plots = { "133,5": housed([{ bug: "honeyBee", from: T0, until: T0 + 36 * H }, { bug: "mantis", from: T0, until: T0 + 72 * H }]), "134,5": grow("tomato"), "136,5": grow("tomato"), "120,5": grow("tomato") };
    expect(plantsInReach("133,5", plots)).toEqual(["134,5"]);
    expect(houseCovers(["134,5"], plots)).toEqual([{ r: "pollen", from: T0, to: T0 + 36 * H, s: 1 }, { r: "guard", from: T0, to: T0 + 72 * H, s: 1 }]);
    expect(bedGift("136,5", plots)).toBeUndefined();
    const gift = bedGift("134,5", plots)!;
    const q = settled({ ...plots["134,5"].plant!, q: { at: T0, span: 0, area: [0, 0, 0, 0], nar: [0, 0, 0], bed: gift } }, T0 + 100 * H, [], LAUNCH);
    // the tomato ripens at 72 hours: the bee half of 36 of them, the mantis half of all 72
    expect(barsOfQ(q).pollen).toBe(Math.floor(25 * HOUSE.level * 0.5));
    expect(barsOfQ(q).guard).toBe(Math.floor(25 * HOUSE.level));
  });

  it("raises the floor of what it reaches while a rare insect stays", () => {
    const rare = (["morpho", "lunaMoth", "orchidMantis", "goldenAnt"] as const).find((b) => isRareInHouse(b))!;
    const plots = { "133,5": housed([{ bug: rare, from: T0, until: T0 + 72 * H }, null]), "134,5": grow("tomato") };
    const gift = bedGift("134,5", plots)!;
    expect(gift.h?.[0].x).toBe(1);
    const q = settled({ ...plots["134,5"].plant!, q: { at: T0, span: 0, area: [0, 0, 0, 0], nar: [0, 0, 0], bed: gift } }, T0 + 100 * H, [], LAUNCH);
    expect(narrowingOfQ(q)).toBe(10);
  });

  it("changes the bed when it is filled: what it reaches is settled first, then given the new room", () => {
    const empty = housed([null, null]);
    let plots: Record<string, Plot> = syncQuality({}, { "133,5": empty, "134,5": grow("tomato") }, T0, [], LAUNCH);
    expect(plots["134,5"].plant!.q?.bed).toBeUndefined();
    const t1 = T0 + 24 * H, filled: Plot = { ...empty, house: { ...empty.house!, rooms: [{ bug: "honeyBee", from: t1, until: t1 + 48 * H }, null] } };
    plots = syncQuality(plots, { ...plots, "133,5": filled }, t1, [], LAUNCH);
    expect(plots["134,5"].plant!.q).toMatchObject({ at: t1, bed: { h: [{ r: "pollen", from: t1, to: t1 + 48 * H, s: 1 }] } });
    // lifted: the bed gives nothing again
    plots = syncQuality(plots, { ...plots, "133,5": { soil: "tilled", plant: null } }, t1 + H, [], LAUNCH);
    expect(plots["134,5"].plant!.q!.bed).toBeUndefined();
  });
});
