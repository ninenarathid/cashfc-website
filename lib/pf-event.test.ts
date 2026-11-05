import { describe, expect, it } from "vitest";
import {
  DEFAULT_KINDS, drawWinners, fmtM, scoreEvent, steadyEach,
  type ContentInfo, type PfEvent, type PfParty, type Review,
} from "@/lib/pf-event";

const ev: PfEvent = {
  id: 1, title: "CASH PARTY FINDER",
  startsAt: "2026-11-06T00:00:00+07:00", endsAt: "2026-12-01T00:00:00+07:00",
  kinds: DEFAULT_KINDS, dailyCap: 10, helperPoints: 2, unsyncMinLevel: 80,
  practiceMinutes: 15, fcOnly: true, newbies: [9], drawCount: 10, draw: null,
};

const content: Record<string, ContentInfo> = {
  "dun:1": { name: "Sastasha", kind: "dungeon", level: 15 },
  "dun:2": { name: "Alexandria", kind: "dungeon", level: 100 },
  "ex:Zelenia": { name: "Zelenia", kind: "extreme" },
  "pvp:cc": { name: "Crystalline Conflict", kind: "pvp" },
};

let n = 0;
const party = (o: Partial<PfParty> & { who?: (number | null)[] }): PfParty => ({
  id: String(++n), contentKey: "dun:2", shape: "light",
  startsAt: "2026-11-07T21:00:00+07:00", lengthMinutes: 60, endedAt: null,
  outcome: "success", isStatic: false, ownerCharacterId: 1,
  members: (o.who ?? [1, 2, 3, 4]).map((id) => ({ characterId: id, name: id == null ? "friend" : `p${id}`, avatar: null })),
  photos: ["a.webp"], shots: [],
  ...o,
});

const fc = (id: number) => id < 100;
const ok = (...ps: PfParty[]) => new Map<string, Review>(ps.map((p) => [p.id, { verdict: "ok", note: null }]));

describe("which parties are in the event", () => {
  it("keeps the window, drops tests and kinds the event does not count", () => {
    const inside = party({});
    const before = party({ startsAt: "2026-11-05T23:59:00+07:00" });
    const after = party({ startsAt: "2026-12-01T00:00:00+07:00" });
    const test = party({ outcome: "test" });
    const pvp = party({ contentKey: "pvp:cc" });
    const s = scoreEvent(ev, [inside, before, after, test, pvp], new Map(), content, fc);
    expect(s.runs.map((r) => r.party.id)).toEqual([inside.id]);
  });

  it("waits on a picture, is bare without one, and follows Aqua's verdict", () => {
    const pic = party({});
    const chat = party({ photos: [], shots: ["c.webp"] });
    const none = party({ photos: [] });
    const no = party({});
    const s = scoreEvent(ev, [pic, chat, none, no],
      new Map([[no.id, { verdict: "no", note: "ไม่เห็นหีบ" }]]), content, fc);
    expect(s.runs.map((r) => r.state)).toEqual(["pending", "pending", "bare", "no"]);
    expect(s.counts).toEqual({ ok: 0, no: 1, pending: 2, bare: 1 });
    expect(s.totalPoints).toBe(0);
  });

  it("flags what Aqua must look for", () => {
    const low = party({ contentKey: "dun:1", who: [1, 2] });
    const prac = party({ contentKey: "ex:Zelenia", shape: "full", outcome: "fail", who: [1, 2, 3, 4, 5, 6, 7, 8] });
    const fresh = party({ who: [1, 9, null, 3] });
    const s = scoreEvent(ev, [low, prac, fresh], new Map(), content, fc);
    expect(s.runs[0].flags).toMatchObject({ lowLevel: true, few: true, practice: false });
    expect(s.runs[1].flags).toMatchObject({ lowLevel: false, few: false, practice: true });
    expect(s.runs[2].flags).toMatchObject({ newbie: true, nameOnly: 1 });
  });
});

describe("points", () => {
  it("one each a passed run, two for a helper, one for the new player", () => {
    const a = party({ who: [1, 2, 9, null] });
    const s = scoreEvent(ev, [a], ok(a), content, fc);
    const pts = Object.fromEntries(s.people.map((p) => [p.id, p.points]));
    expect(pts).toEqual({ 1: 2, 2: 2, 9: 1 });
    expect(s.people.find((p) => p.id === 1)?.helped).toBe(1);
  });

  it("caps a day at ten, the last runs of the day losing out, and starts again tomorrow", () => {
    const day = Array.from({ length: 12 }, (_, i) =>
      party({ who: [1], startsAt: `2026-11-07T${String(10 + i).padStart(2, "0")}:00:00+07:00` }));
    const next = party({ who: [1], startsAt: "2026-11-08T00:30:00+07:00" });
    const s = scoreEvent(ev, [...day, next], ok(...day, next), content, fc);
    const p = s.people.find((x) => x.id === 1)!;
    expect(p.points).toBe(11);
    expect(p.raw).toBe(13);
    expect(p.days).toBe(2);
    expect(s.runs[10].gave.get(1)).toBe(0);
    expect(s.runs[12].gave.get(1)).toBe(1);
  });

  it("a helper's two points are cut to what is left of the day", () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      party({ who: [1], startsAt: `2026-11-07T${String(10 + i).padStart(2, "0")}:00:00+07:00` }));
    const helped = party({ who: [1, 9], startsAt: "2026-11-07T22:00:00+07:00" });
    const s = scoreEvent(ev, [...nine, helped], ok(...nine, helped), content, fc);
    expect(s.people.find((x) => x.id === 1)?.points).toBe(10);
  });

  it("counts somebody once a party however many rows they have", () => {
    const a = party({ who: [1, 1, 2] });
    const s = scoreEvent(ev, [a], ok(a), content, fc);
    expect(s.people.find((x) => x.id === 1)?.points).toBe(1);
  });

  it("a Bangkok day, not a UTC one", () => {
    // 23:30 and 00:30 Bangkok are one UTC day and two Bangkok days.
    const late = party({ who: [1], startsAt: "2026-11-07T23:30:00+07:00" });
    const early = party({ who: [1], startsAt: "2026-11-08T00:30:00+07:00" });
    const s = scoreEvent(ev, [late, early], ok(late, early), content, fc);
    expect(s.people[0].days).toBe(2);
  });
});

describe("prizes", () => {
  it("keeps people outside the FC on the board but out of the prizes", () => {
    const a = party({ who: [500, 1], ownerCharacterId: 500 });
    const b = party({ who: [500, 2], ownerCharacterId: 2 });
    const s = scoreEvent(ev, [a, b], ok(a, b), content, fc);
    expect(s.people[0]).toMatchObject({ id: 500, points: 2, fc: false });
    expect(s.topPoints.map((p) => p.id).sort()).toEqual([1, 2]);
    expect(s.drawPool.map((p) => p.id)).toEqual([2]);
    expect(s.outsidePeople).toBe(1);
    expect(s.fcPeople).toBe(2);
    const open = scoreEvent({ ...ev, fcOnly: false }, [a, b], ok(a, b), content, fc);
    expect(open.topPoints.map((p) => p.id)).toEqual([500]);
    expect(open.drawPool.map((p) => p.id)).toEqual([2, 500]);
  });

  it("the lead of a passed room is in the draw once, seated or not", () => {
    const a = party({ who: [2, 3], ownerCharacterId: 1 });
    const b = party({ who: [2, 3], ownerCharacterId: 1 });
    const c = party({ who: [2, 3], ownerCharacterId: 4 });
    const s = scoreEvent(ev, [a, b, c], ok(a, b), content, fc,
      new Map([[1, { name: "Lead", avatar: null }]]));
    expect(s.drawPool.map((p) => [p.id, p.name, p.rooms])).toEqual([[1, "Lead", 2]]);
  });

  it("most days: 10m each up to three, 30m shared from four", () => {
    expect([0, 1, 2, 3, 4, 6].map(steadyEach))
      .toEqual([0, 10_000_000, 10_000_000, 10_000_000, 7_500_000, 5_000_000]);
  });
});

describe("the draw", () => {
  it("takes each once, never more than the pool", () => {
    const w = drawWinners([1, 2, 3, 4, 5], 3, () => 0);
    expect(w).toEqual([1, 2, 3]);
    expect(drawWinners([1, 2], 10).sort()).toEqual([1, 2]);
    const many = drawWinners(Array.from({ length: 40 }, (_, i) => i), 10);
    expect(new Set(many).size).toBe(10);
  });
});

it("says gil the FC's way", () => {
  expect([10_000_000, 7_500_000, 1_000_000, 3_333_333, 450_000].map(fmtM))
    .toEqual(["10m", "7.5m", "1m", "3.33m", "450k"]);
});
