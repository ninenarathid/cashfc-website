import type { Purse } from "./trade";
import { held, take } from "./trade";
import type { ItemId } from "./items";
import { LOY_KRATHONG_2026, isOpen, windowOf, type Festival } from "./festivals";
import {
  EDITS_MAX, MAX_TRIMS, PART, PARTS, VOTES_EACH, awardsOf, check, cleanName, cleanWish, costOf, extraCost, partsOf,
  type AwardView, type Design, type DrawList, type KrathongDid, type KrathongState, type KrathongView, type RiverKrathong,
} from "./krathong";

/**
 * The trial room's festival: v336's rules kept in the browser, with eight pretend makers so the gallery, the river
 * and the hall of fame have something in them. `?lk=before|make|float|results` puts the edition's windows around
 * now, to try each stage (dev only); without it the trial follows the real dates.
 */

interface Row extends KrathongView { member: string; makerName: string; character: number | null; fc: boolean; wish: string | null; fx?: number | null; fy?: number | null }
const costMap = (d: Design) => Object.fromEntries(costOf(d)) as Record<string, number>;
export interface TrialFestivalState { rows: Row[]; votes: Array<[number, string]>; judge: number | null; settled: boolean; awards: AwardView[]; next: number }
export interface TrialFestivalStore { get(): TrialFestivalState | null; set(s: TrialFestivalState): void; now(): number; me: string; purse(): Purse; save(p: Purse): void }

const H = 3_600_000;
const PRETEND = ["Mira Lune", "Kael Ashford", "Noa Brightwater", "Suri Mistvale", "Tavi Emberleaf", "Rin Starfall", "Elio Quill", "Yuna Petalwind"];

/** (the dev room's `&lkAdmin=1`: the stall as an admin sees it, the popoto counts with it) */
export function trialAdmin(): boolean {
  try { return new URLSearchParams(window.location.search).has("lkAdmin"); } catch { return false; }
}
export function trialPhase(): string | null {
  try { return new URLSearchParams(window.location.search).get("lk"); } catch { return null; }
}

/** The edition as the trial sees it: the real one, or its windows moved around now for a stage. */
export function trialFestival(now: number, phase = trialPhase()): Festival {
  const f = LOY_KRATHONG_2026;
  const at = (ms: number) => new Date(now + ms).toISOString();
  const win = (kind: string, from: number, until: number | null) => ({ ...windowOf(f, kind as never)!, from: at(from), until: until === null ? null : at(until) });
  switch (phase) {
    // (as the 2026 edition stands since 2026-11-24: entries and the vote together until midnight, the float from 18:00
    // overlapping them, the results the next evening; `make` the day, `float` the overlapping evening, `late` after midnight)
    case "before": return { ...f, starts: at(-H), ends: at(80 * H), windows: [win("announce", -H, 6 * H), win("make", 6 * H, 36 * H), win("vote", 6 * H, 36 * H), win("float", 30 * H, 65 * H), win("results", 57 * H, null)] };
    case "make": return { ...f, starts: at(-10 * H), ends: at(60 * H), windows: [win("make", -2 * H, 28 * H), win("vote", -2 * H, 28 * H), win("float", 22 * H, 57 * H), win("results", 49 * H, null)] };
    case "float": return { ...f, starts: at(-30 * H), ends: at(30 * H), windows: [win("make", -26 * H, 4 * H), win("vote", -26 * H, 4 * H), win("float", -2 * H, 33 * H), win("results", 25 * H, null)] };
    case "vote": case "late": return { ...f, starts: at(-36 * H), ends: at(26 * H), windows: [win("make", -32 * H, -2 * H), win("vote", -32 * H, -2 * H), win("float", -8 * H, 26 * H), win("results", 19 * H, null)] };
    case "results": return { ...f, starts: at(-60 * H), ends: at(9 * H), windows: [win("make", -54 * H, -24 * H), win("vote", -54 * H, -24 * H), win("float", -30 * H, 9 * H), win("results", -H, null)] };
    default: return f;
  }
}

/** A pretend maker's design: every part chosen by a little hash, so the eight are different and the same each time. */
function pretendDesign(i: number): Design {
  const at = (slot: Parameters<typeof partsOf>[0], n: number) => { const list = partsOf(slot); return [list[((n % list.length) + list.length) % list.length].id, 0] as [string, number]; };
  return { base: at("base", i), ring: at("ring", i * 2 + 1), light: at("light", i), centre: at("centre", i * 3 + 1), trims: Array.from({ length: i % 4 }, (_, k) => at("trim", i * 5 + k * 3)) };
}

function fresh(now: number, f: Festival): TrialFestivalState {
  const made = Date.parse(windowOf(f, "make")!.from) + 30 * 60_000;
  // (the dev room's `&lkCrowd=40`: so many more pretend makers, to see the canal on a busy float night)
  const crowd = (() => { try { return Math.max(0, Math.min(80, Number(new URLSearchParams(window.location.search).get("lkCrowd")) || 0)); } catch { return 0; } })();
  const names = [...PRETEND, ...Array.from({ length: crowd }, (_, i) => `ผู้เล่น ${i + 1}`)];
  const rows: Row[] = names.map((name, i) => ({
    id: i + 1, member: `pretend-${i}`, makerName: name, character: null, fc: i % 3 !== 2, wish: null,
    name: ["ดวงจันทร์ลอยน้ำ", "แสงเทียนกลางบึง", "บัวทองยามค่ำ", "ผีเสื้อกลางสายน้ำ", "หิ่งห้อยพาฝัน", "ผลึกจันทรา", "นกไม้ปลายฝัน", "ขนมปังลอยฟ้า"][i] ?? `กระทงที่ ${i + 1}`,
    design: pretendDesign(i), entered: true, made: made + i * 9 * 60_000, floated: null,
  }));
  // pretend popoto: a few each, never their own
  const votes: Array<[number, string]> = [];
  rows.forEach((r, i) => { for (let k = 0; k < (i * 5) % 7; k++) votes.push([r.id, `pretend-voter-${k}`]); });
  // (no judges' pick: the owner, 2026-11-24, "ไม่ต้องเลือกกรรมการ ให้คนในเมืองโหวตกันเอง")
  return { rows, votes, judge: null, settled: false, awards: [], next: rows.length + 1 };
  void now;
}

export class KrathongTrial {
  constructor(private readonly store: TrialFestivalStore) {}
  private festival() { return trialFestival(this.store.now()); }
  private state(): TrialFestivalState {
    const f = this.festival(), s = this.store.get() ?? fresh(this.store.now(), f);
    // the pretend makers float on the float nights
    if (isOpen(windowOf(f, "float"), this.store.now())) {
      const from = Date.parse(windowOf(f, "float")!.from);
      s.rows = s.rows.map((r, i) => (r.member.startsWith("pretend-") && r.floated === null ? { ...r, floated: Math.min(this.store.now() - 60_000, from + i * 4 * 60_000) } : r));
    }
    if (!s.settled && isOpen(windowOf(f, "results"), this.store.now())) {
      const counts = new Map<number, number>();
      for (const [e] of s.votes) counts.set(e, (counts.get(e) ?? 0) + 1);
      const entered = s.rows.filter((r) => r.entered);
      s.awards = awardsOf(entered.map((r) => ({ id: r.id, votes: counts.get(r.id) ?? 0, made: r.made })), s.judge).map((a) => {
        const r = s.rows.find((x) => x.id === a.entry)!;
        const title = a.kind === "judge" ? { th: "กระทงในดวงใจกรรมการ 2026", en: "Judges' Choice 2026" } : a.place === 1 ? { th: "ช่างกระทงแห่งปี 2026", en: "Krathong Maker of 2026" } : { th: "ช่างกระทงดีเด่น 2026", en: "Outstanding Krathong 2026" };
        return { ...a, votes: trialAdmin() ? counts.get(r.id) ?? 0 : null, title, krathong: view(r), maker: { name: r.makerName, character: r.character }, fc: r.fc };
      });
      s.settled = true;
    }
    this.store.set(s);
    return s;
  }
  read(): KrathongState {
    const s = this.state(), f = this.festival(), me = this.store.me, counts = new Map<number, number>();
    for (const [e] of s.votes) counts.set(e, (counts.get(e) ?? 0) + 1);
    const mine = s.rows.find((r) => r.member === me) ?? null;
    return {
      now: this.store.now(), festival: f,
      mine: mine ? { ...view(mine), wish: mine.wish } : null,
      entries: s.rows.filter((r) => r.entered).map((r) => ({ ...view(r), mine: r.member === me, fc: r.fc,
        // (every maker's name, at any time: the owner, 2026-11-24: "คำอวยพร เห็นได้ทุกคน คนอื่นก็เห็น ชื่อคนทำ ชื่อกระทง เห็นหมด")
        maker: { name: r.member === me ? "คุณ" : r.makerName, character: r.character },
        ...(trialAdmin() ? { votes: counts.get(r.id) ?? 0 } : {}) })),
      voted: s.votes.filter(([, v]) => v === me).map(([e]) => e).sort((a, b) => a - b),
      votesEach: VOTES_EACH, floated: s.rows.filter((r) => r.floated !== null).length, judged: s.judge !== null,
      awards: s.settled ? s.awards : null, capsule: [],
    };
  }
  make(design: Design, name: string): KrathongDid<{ krathong: KrathongView }> {
    const s = this.state(), f = this.festival(), now = this.store.now(), me = this.store.me;
    if (s.rows.some((r) => r.member === me)) return { ok: false, why: "made" };
    const entering = isOpen(windowOf(f, "make"), now);
    if (!entering && !isOpen(windowOf(f, "float"), now)) return { ok: false, why: "closed" };
    const nm = cleanName(name);
    if (!nm) return { ok: false, why: "name" };
    if (check(design)) return { ok: false, why: "design" };
    let purse = this.store.purse(), bag = purse.bag;
    for (const [id, n] of costOf(design)) if (held(bag, id) < n) return { ok: false, why: "short", item: id, need: n };
    for (const [id, n] of costOf(design)) bag = take(bag, id as ItemId, n);
    purse = { ...purse, bag };
    this.store.save(purse);
    const row: Row = { id: s.next, member: me, makerName: "คุณ", character: null, fc: true, wish: null, name: nm, design, entered: entering, made: now, floated: null, edits: 0, paid: costMap(design) };
    this.store.set({ ...s, rows: [...s.rows, row], next: s.next + 1 });
    return { ok: true, krathong: view(row) };
  }
  /** (v341) My entry changed whole while entries are open, EDITS_MAX times, paid with only what goes beyond what it has had. */
  edit(design: Design, name: string): KrathongDid<{ krathong: KrathongView }> {
    const s = this.state(), f = this.festival(), row = s.rows.find((r) => r.member === this.store.me);
    if (!row) return { ok: false, why: "none" };
    if (!isOpen(windowOf(f, "make"), this.store.now()) || !row.entered) return { ok: false, why: "closed" };
    if ((row.edits ?? 0) >= EDITS_MAX) return { ok: false, why: "edits" };
    const nm = cleanName(name);
    if (!nm) return { ok: false, why: "name" };
    if (check(design)) return { ok: false, why: "design" };
    const paid = row.paid ?? costMap(row.design), extra = extraCost(design, paid);
    let purse = this.store.purse(), bag = purse.bag;
    for (const [id, n] of extra) if (held(bag, id) < n) return { ok: false, why: "short", item: id, need: n };
    for (const [id, n] of extra) bag = take(bag, id, n);
    purse = { ...purse, bag };
    this.store.save(purse);
    Object.assign(row, { design, name: nm, edits: (row.edits ?? 0) + 1, paid: { ...paid, ...Object.fromEntries(extra.map(([id, n]) => [id, (paid[id] ?? 0) + n])) } });
    this.store.set(s);
    return { ok: true, krathong: view(row) };
  }
  rename(name: string): KrathongDid<{ krathong: KrathongView }> {
    const s = this.state(), nm = cleanName(name), row = s.rows.find((r) => r.member === this.store.me);
    if (s.settled) return { ok: false, why: "closed" };
    if (!nm) return { ok: false, why: "name" };
    if (!row) return { ok: false, why: "none" };
    row.name = nm;
    this.store.set(s);
    return { ok: true, krathong: view(row) };
  }
  vote(entry: number): KrathongDid<{ voted: number[] }> {
    const s = this.state(), f = this.festival(), me = this.store.me, row = s.rows.find((r) => r.id === entry);
    if (!row || !row.entered) return { ok: false, why: "none" };
    if (!isOpen(windowOf(f, "vote"), this.store.now())) return { ok: false, why: "closed" };
    if (row.member === me) return { ok: false, why: "own" };
    const had = s.votes.some(([e, v]) => e === entry && v === me);
    if (had) s.votes = s.votes.filter(([e, v]) => !(e === entry && v === me));
    else {
      if (s.votes.filter(([, v]) => v === me).length >= VOTES_EACH) return { ok: false, why: "spent" };
      s.votes = [...s.votes, [entry, me]];
    }
    this.store.set(s);
    return { ok: true, voted: s.votes.filter(([, v]) => v === me).map(([e]) => e).sort((a, b) => a - b) };
  }
  float(wish: string, at?: { x: number; y: number } | null): KrathongDid<{ krathong: KrathongView }> {
    const s = this.state(), f = this.festival(), row = s.rows.find((r) => r.member === this.store.me);
    if (!row) return { ok: false, why: "none" };
    if (row.floated !== null) return { ok: true, repeated: true, krathong: view(row) };
    if (!isOpen(windowOf(f, "float"), this.store.now())) return { ok: false, why: "closed" };
    row.floated = this.store.now();
    row.wish = cleanWish(wish) || null;
    row.fx = at?.x ?? null; row.fy = at?.y ?? null;
    this.store.set(s);
    return { ok: true, krathong: view(row) };
  }
  river(): RiverKrathong[] {
    const s = this.state(), f = this.festival();
    if (!isOpen(windowOf(f, "float"), this.store.now())) return [];
    // (the dev room's `&lkAt=x,y`: the pretend makers set theirs down there, to watch the current take them)
    const at = (() => { try { const v = new URLSearchParams(window.location.search).get("lkAt")?.split(",").map(Number); return v && v.length === 2 && v.every(Number.isFinite) ? v : null; } catch { return null; } })();
    return s.rows.filter((r) => r.floated !== null).sort((a, b) => a.floated! - b.floated!).map((r, i) => ({ id: r.id, design: r.design, floated: r.floated!, mine: r.member === this.store.me, name: r.name, maker: r.makerName, wish: r.wish,
      x: r.fx ?? (at && r.member.startsWith("pretend-") ? at[0] + (i % 3) * 0.3 : null), y: r.fy ?? (at && r.member.startsWith("pretend-") ? at[1] + (i % 2) * 0.3 : null) }));
  }
  /** The lucky draw's list: whoever floated, the cutoff the entries' end (midnight, as v339 sets `draw_until`). */
  draw(): DrawList {
    const s = this.state(), until = windowOf(this.festival(), "make")?.until ?? null, cut = until ? Date.parse(until) : null;
    return { until: cut, list: s.rows.filter((r) => r.floated !== null).sort((a, b) => a.floated! - b.floated! || a.id - b.id).map((r) => ({
      id: r.id, name: r.name, design: r.design, entered: r.entered, maker: { name: r.makerName, character: r.character },
      verified: true, fc: r.fc, made: r.made, floated: r.floated!, inTime: cut === null || r.floated! < cut })) };
  }
  judge(entry: number | null): KrathongDid {
    const s = this.state();
    if (s.settled) return { ok: false, why: "closed" };
    s.judge = entry;
    this.store.set(s);
    return { ok: true };
  }
}

const view = (r: Row): KrathongView => ({ id: r.id, name: r.name, design: r.design, entered: r.entered, made: r.made, floated: r.floated, edits: r.edits ?? 0, ...(r.paid ? { paid: r.paid } : {}) });

/**
 * Every part's things by every way it may be paid, enough for any krathong (a part's most of a thing times the seven
 * parts a krathong has at most), for a tester's bag (dev only: filled whenever the room's `&lk=` page opens, or
 * `__townView.festival().kit()`; the owner, 2026-11-24: "ให้ตัวละคร test มีของพร้อมสร้างกระทงได้หมด").
 */
export const KIT: Array<[ItemId, number]> = Object.entries(PARTS.flatMap((p) => p.pay).reduce<Record<string, number>>((m, [id, n]) => ({ ...m, [id]: Math.max(m[id] ?? 0, n * (4 + MAX_TRIMS)) }), {})) as Array<[ItemId, number]>;

/** (the dev room's `&lkNew=1`: the tester's krathong forgotten whenever the page opens, to make one again) */
export function trialStartOver(): void {
  try {
    if (!new URLSearchParams(window.location.search).has("lkNew")) return;
    localStorage.removeItem("cashtown.trial.festival.1");
    localStorage.removeItem("cashtown.krathong.carry");
  } catch { /* not in a browser */ }
}
void PART;
