import { describe, expect, it } from "vitest";
import { dayKey as dayKeyOf } from "@/lib/party";
import {
  DEFAULT_KINDS, DEFAULT_KIND_POINTS, drawWinners, pointsOf, fmtM, scoreEvent, steadyEach,
  type ContentInfo, type PfEvent, type PfParty, type Review,
} from "@/lib/pf-event";

const ev: PfEvent = {
  id: 1, title: "CASH PARTY FINDER",
  startsAt: "2026-11-06T00:00:00+07:00", endsAt: "2026-12-01T00:00:00+07:00",
  kinds: DEFAULT_KINDS, dailyCap: 10, helperPoints: 2, unsyncMinLevel: 80,
  practiceMinutes: 15, fcOnly: true, newbies: [9], drawCount: 10, draw: null,
  publishedAt: null,
  // v331, loose here so the older tests keep testing what they were written for.
  kindPoints: {}, easyCap: 50, practicePoints: 1, practiceCap: 50, helperBonus: 1, hasPoints: true,
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
    expect(s.counts).toEqual({ open: 0, ok: 0, no: 1, pending: 2, bare: 1 });
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
    // Ending 23:50 and 00:50 Bangkok are one UTC day and two Bangkok days.
    const late = party({ who: [1], startsAt: "2026-11-07T23:30:00+07:00", lengthMinutes: 20 });
    const early = party({ who: [1], startsAt: "2026-11-08T00:30:00+07:00", lengthMinutes: 20 });
    const s = scoreEvent(ev, [late, early], ok(late, early), content, fc);
    expect(s.people[0].days).toBe(2);
  });
});

describe("end time (the owner, 2026-11-10)", () => {
  const now = Date.parse("2026-11-10T22:42:00+07:00");
  it("a room before its end is open: not shown to judge, not counted, its verdict kept", () => {
    const done = party({ who: [1], startsAt: "2026-11-10T19:00:00+07:00", lengthMinutes: 60 });
    const later = party({ who: [1], startsAt: "2026-11-10T22:00:00+07:00", lengthMinutes: 60 });
    const s = scoreEvent(ev, [done, later], ok(done, later), content, fc, new Map(), now);
    expect(s.runs.map((r) => r.state)).toEqual(["ok", "open"]);
    expect(s.runs[1].verdict).toBe("ok");
    expect(s.counts.open).toBe(1);
    expect(s.people[0].points).toBe(1);
  });

  it("is counted on the day it ends: listed for after midnight it is the next day", () => {
    // #174: listed 00:00 on the 11th for an hour, played the evening before.
    const evening = party({ who: [1], startsAt: "2026-11-10T19:00:00+07:00" });
    const listed = party({ who: [1], startsAt: "2026-11-11T00:00:00+07:00" });
    const after = Date.parse("2026-11-11T02:00:00+07:00");
    expect(scoreEvent(ev, [evening, listed], ok(evening, listed), content, fc, new Map(), after).people[0].days).toBe(2);
    // ...unless its lead closes it when they are done, which is its real end.
    const closed = { ...listed, endedAt: "2026-11-10T19:45:00+07:00" };
    const s = scoreEvent(ev, [evening, closed], ok(evening, closed), content, fc, new Map(), now);
    expect(s.runs.map((r) => r.state)).toEqual(["ok", "ok"]);
    expect(s.people[0].days).toBe(1);
  });

  it("a room that runs past midnight is the next day's", () => {
    const late = party({ who: [1], startsAt: "2026-11-07T23:30:00+07:00", lengthMinutes: 60 });
    const s = scoreEvent(ev, [late], ok(late), content, fc);
    expect(dayKeyOf(s.runs[0].endsAt)).toBe("2026-11-08");
  });
});

describe("points by how hard (v331, the owner 2026-11-10)", () => {
  const hard: PfEvent = { ...ev, kindPoints: { extreme: 3, savage: 4, ultimate: 6, alliance: 2 }, easyCap: 3, practicePoints: 1, practiceCap: 1 };
  const at = (h: number, o: Partial<PfParty> & { who?: (number | null)[] } = {}) =>
    party({ who: [1], startsAt: `2026-11-07T${String(h).padStart(2, "0")}:00:00+07:00`, lengthMinutes: 30, ...o });

  it("a cleared room is worth its kind's points, a practice room its own", () => {
    const ex = at(10, { contentKey: "ex:Zelenia" });
    const ul = at(12, { contentKey: "ult:x" });
    const s = scoreEvent(hard, [ex, ul], new Map<string, Review>([
      [ex.id, { verdict: "ok", note: null }], [ul.id, { verdict: "practice", note: null }]]), content, fc);
    expect(s.runs.map((r) => [r.worth, r.practice])).toEqual([[3, false], [1, true]]);
    expect(s.people[0].points).toBe(4);
  });

  it("counts three rooms worth one point a day, and the fourth gives nothing", () => {
    const rooms = [10, 11, 12, 13].map((h) => at(h));
    const s = scoreEvent(hard, rooms, ok(...rooms), content, fc);
    expect(s.runs.map((r) => r.gave.get(1))).toEqual([1, 1, 1, 0]);
    expect(s.runs[3].short.get(1)).toBe("easy");
    expect(s.people[0]).toMatchObject({ points: 3, days: 1 });
  });

  it("a hard clear is not held by the easy quota", () => {
    const rooms = [10, 11, 12].map((h) => at(h));
    const ex = at(13, { contentKey: "ex:Zelenia" });
    const s = scoreEvent(hard, [...rooms, ex], ok(...rooms, ex), content, fc);
    expect(s.people[0].points).toBe(6);
  });

  it("one practice room a day counts", () => {
    const a = at(10, { contentKey: "ex:Zelenia" }), b = at(11, { contentKey: "ex:Zelenia" });
    const s = scoreEvent(hard, [a, b], new Map<string, Review>([
      [a.id, { verdict: "practice", note: null }], [b.id, { verdict: "practice", note: null }]]), content, fc);
    expect(s.runs.map((r) => r.gave.get(1))).toEqual([1, 0]);
    expect(s.runs[1].short.get(1)).toBe("practice");
  });

  it("a helper gets the room's points and the bonus, within the day's cap", () => {
    const ul = at(10, { contentKey: "ult:x", who: [1, 9] });
    const s = scoreEvent({ ...hard, dailyCap: 10 }, [ul], ok(ul), content, fc);
    expect(s.runs[0].gave.get(1)).toBe(7);
    expect(s.runs[0].gave.get(9)).toBe(6);
    const two = [at(10, { contentKey: "ult:x" }), at(11, { contentKey: "ult:x" })];
    const capped = scoreEvent(hard, two, ok(...two), content, fc);
    expect(capped.runs.map((r) => r.gave.get(1))).toEqual([6, 4]);
    expect(capped.runs[1].short.get(1)).toBe("day");
  });

  it("an event read before v331 scores as the defaults", () => {
    expect(pointsOf({ kindPoints: DEFAULT_KIND_POINTS }, "ultimate")).toBe(6);
    expect(pointsOf({ kindPoints: DEFAULT_KIND_POINTS }, "roulette")).toBe(1);
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
