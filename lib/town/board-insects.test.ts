import { describe, expect, it } from "vitest";
import { BANDS } from "./bands";
import { ITEMS } from "./items";
import { INSECT_GARDEN } from "./insect-garden";
import { POLLINATOR_SKY } from "./helper-items";
import { SOIL_WORKERS } from "./insect-house";
import { walkable } from "./world";
import { BOARD, BOARD_IDS, BOARD_SPOTS, boardRow, callShake, claimShake, endShake, heldAt, joinShake, openRoll, outAt, takeRoll, turnOf, type Shake } from "./board-insects";

const t0 = Date.UTC(2026, 9, 28, 11, 0); // 18:00 in Bangkok: the shake's hours begin at 16
const ok = <T,>(d: { ok: boolean; why?: string } & T) => { if (!d.ok) throw new Error(d.why); return d as T & { ok: true }; };

describe("the two boards' spots", () => {
  it("are twelve rolled leaves and six trees, each by somewhere one can stand", () => {
    expect(BOARD_SPOTS.filter((s) => s.board === "roll")).toHaveLength(12);
    expect(BOARD_SPOTS.filter((s) => s.board === "shake")).toHaveLength(6);
    expect(BOARD_SPOTS.filter((s) => s.board === "roll" && s.place === "forest")).toHaveLength(3);
    expect(BOARD_SPOTS.filter((s) => s.tree).map((s) => s.tree).sort()).toEqual(["cedar", "cedar", "cherry", "cherry", "oak", "oak"]);
    for (const s of BOARD_SPOTS) {
      let near = false;
      for (let dy = -BOARD.reach; dy <= BOARD.reach; dy++) for (let dx = -BOARD.reach; dx <= BOARD.reach; dx++) if (walkable(s.x + dx, s.y + dy)) near = true;
      expect(near, `spot ${s.id}`).toBe(true);
    }
  });
  it("hold an insect about a quarter of the turns, the same for everybody, and every species some time", () => {
    const seen = new Set<string>();
    let held = 0, turns = 0;
    for (let k = 0; k < 48 * 30; k++) for (const s of BOARD_SPOTS) {
      const got = heldAt(s, turnOf(t0) + k);
      if (outAt(s, ((k / 2 + 18) % 24)).length) { turns++; if (got.length) held++; }
      got.forEach((id) => seen.add(id));
      expect(heldAt(s, turnOf(t0) + k)).toEqual(got);
    }
    expect(held / turns).toBeGreaterThan(0.2);
    expect(held / turns).toBeLessThan(0.3);
    expect([...seen].sort()).toEqual([...BOARD_IDS].sort());
  });
  it("keep a tree's own to its tree, and the shake's to 16:00–03:00", () => {
    for (const s of BOARD_SPOTS.filter((x) => x.board === "shake")) for (let h = 0; h < 24; h += 0.5) {
      const out = outAt(s, h).map((o) => o.id);
      if (h >= 3 && h < 16) expect(out, `${s.id} ${h}`).toEqual([]);
      if (s.tree !== "cherry") expect(out).not.toContain("blossomChafer");
      if (s.tree !== "cedar") expect(out).not.toContain("cedarLonghorn");
    }
  });
});

describe("the twenty-one", () => {
  it("are bag items paying as agreed, each with a use by its family", () => {
    for (const id of BOARD_IDS) {
      const r = boardRow(id)!, item = ITEMS[id];
      expect(item.kind).toBe("bug");
      expect(item.pays).toBe(r.pays);
      if (r.board === "roll") expect(r.rare ? r.pays === 8 : r.pays >= 3 && r.pays <= 5, id).toBe(true);
      else expect(r.pays >= 4 && r.pays <= 6, id).toBe(true);
      const used = INSECT_GARDEN.pollinators.includes(id) ? id in POLLINATOR_SKY : INSECT_GARDEN.predators.includes(id) || SOIL_WORKERS.includes(id);
      expect(used, id).toBe(true);
      for (const [a, z] of r.hours) expect(z > a && a >= 0 && z <= 24).toBe(true);
    }
    expect(BANDS).toBeDefined();
  });
});

describe("unrolling a leaf", () => {
  const spot = BOARD_SPOTS.find((s) => s.board === "roll" && s.place === "town")!;
  const turn = (() => { for (let k = 0; ; k++) if (heldAt(spot, turnOf(t0) + k).length) return turnOf(t0) + k; })();
  const now = turn * BOARD.turn + 1000, at: [number, number] = [spot.x, spot.y + 1];
  it("is had by whoever cups it first in its turn, not sooner than a moment after opening it, near the bush", () => {
    expect(openRoll(spot, null, "me", [spot.x + 9, spot.y], now)).toEqual({ ok: false, why: "far" });
    const o = ok(openRoll(spot, null, "me", at, now));
    expect(takeRoll(spot, o.turn, "me", at, now + BOARD.unrollMin - 1)).toEqual({ ok: false, why: "soon" });
    expect(takeRoll(spot, o.turn, "you", at, now + BOARD.unrollMin)).toEqual({ ok: false, why: "soon" });
    expect(takeRoll(spot, o.turn, "me", at, now + BOARD.unrollMin, true)).toEqual({ ok: false, why: "full" });
    const got = ok(takeRoll(spot, o.turn, "me", at, now + BOARD.unrollMin));
    expect(got.got).toBe(heldAt(spot, turn)[0]);
    expect(openRoll(spot, got.turn, "you", at, now + 5000)).toEqual({ ok: false, why: "taken" });
    // the next turn with an insect in it is anybody's again
    const next = (() => { for (let k = 1; ; k++) if (heldAt(spot, turn + k).length) return turn + k; })();
    expect(openRoll(spot, got.turn, "you", at, next * BOARD.turn + 10).ok).toBe(true);
  });
});

describe("shaking a branch over a sheet", () => {
  const spot = BOARD_SPOTS.find((s) => s.board === "shake" && s.tree === "cherry")!;
  const turn = (() => { for (let k = 0; ; k++) { const tt = turnOf(t0) + k; const h = ((tt * BOARD.turn + 7 * 3_600_000) % 86_400_000) / 3_600_000; if (h >= 16 && h < 23 && heldAt(spot, tt).length) return tt; } })();
  const now = turn * BOARD.turn + 1000, at: [number, number] = [spot.x + 1, spot.y];
  it("needs another to hold the sheet; each of the two has one of what it caught, once", () => {
    let s: Shake = ok(callShake(spot, null, "me", "Me", at, now, "s1")).shake;
    expect(callShake(spot, s, "you", "You", at, now + 10, "s2")).toEqual({ ok: false, why: "busy" });
    expect(joinShake(spot, s, "me", "Me", at, now + 10)).toEqual({ ok: false, why: "self" });
    expect(joinShake(spot, s, "you", "You", [spot.x + 9, spot.y], now + 10)).toEqual({ ok: false, why: "far" });
    s = ok(joinShake(spot, s, "you", "You", at, now + 1000)).shake;
    expect(endShake(s, "me", 2, now + 1000 + BOARD.shakeMin)).toEqual({ ok: false, why: "theirs" });
    expect(endShake(s, "you", 2, now + 1000 + BOARD.shakeMin - 1)).toEqual({ ok: false, why: "soon" });
    s = ok(endShake(s, "you", 9, now + 1000 + BOARD.shakeMin)).shake;
    expect(s.caught).toBe(BOARD.drops);
    const held = heldAt(spot, turn);
    const mine = ok(claimShake(spot, s, "me"));
    expect(mine.got).toBe(held[0]);
    expect(claimShake(spot, mine.shake, "me")).toEqual({ ok: false, why: "taken" });
    expect(ok(claimShake(spot, mine.shake, "you")).got).toBe(held[1]);
    expect(claimShake(spot, mine.shake, "them")).toEqual({ ok: false, why: "theirs" });
    expect(callShake(spot, mine.shake, "them", "Them", at, now + 60_000, "s3")).toEqual({ ok: false, why: "taken" });
  });
  it("gives nothing when the sheet caught nothing, and the tree may be shaken again in its turn", () => {
    let s: Shake = ok(callShake(spot, null, "me", "Me", at, now, "s1")).shake;
    s = ok(joinShake(spot, s, "you", "You", at, now + 1000)).shake;
    s = ok(endShake(s, "you", 0, now + 1000 + BOARD.shakeMin)).shake;
    expect(claimShake(spot, s, "me")).toEqual({ ok: false, why: "none" });
    expect(callShake(spot, s, "me", "Me", at, now + 20_000, "s2").ok).toBe(true);
  });
});
