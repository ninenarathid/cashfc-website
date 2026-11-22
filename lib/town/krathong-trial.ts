import type { Purse } from "./trade";
import { held, take } from "./trade";
import type { ItemId } from "./items";
import { LOY_KRATHONG_2026, isOpen, windowOf, type Festival } from "./festivals";
import {
  PART, PARTS, VOTES_EACH, awardsOf, check, cleanName, cleanWish, costOf, partsOf,
  type AwardView, type Design, type KrathongDid, type KrathongState, type KrathongView, type RiverKrathong,
} from "./krathong";

/**
 * The trial room's festival: v336's rules kept in the browser, with eight pretend makers so the gallery, the river
 * and the hall of fame have something in them. `?lk=before|make|float|results` puts the edition's windows around
 * now, to try each stage (dev only); without it the trial follows the real dates.
 */

interface Row extends KrathongView { member: string; makerName: string; character: number | null; fc: boolean; wish: string | null }
export interface TrialFestivalState { rows: Row[]; votes: Array<[number, string]>; judge: number | null; settled: boolean; awards: AwardView[]; next: number }
export interface TrialFestivalStore { get(): TrialFestivalState | null; set(s: TrialFestivalState): void; now(): number; me: string; purse(): Purse; save(p: Purse): void }

const H = 3_600_000;
const PRETEND = ["Mira Lune", "Kael Ashford", "Noa Brightwater", "Suri Mistvale", "Tavi Emberleaf", "Rin Starfall", "Elio Quill", "Yuna Petalwind"];

export function trialPhase(): string | null {
  try { return new URLSearchParams(window.location.search).get("lk"); } catch { return null; }
}

/** The edition as the trial sees it: the real one, or its windows moved around now for a stage. */
export function trialFestival(now: number, phase = trialPhase()): Festival {
  const f = LOY_KRATHONG_2026;
  const at = (ms: number) => new Date(now + ms).toISOString();
  const win = (kind: string, from: number, until: number | null) => ({ ...windowOf(f, kind as never)!, from: at(from), until: until === null ? null : at(until) });
  switch (phase) {
    case "before": return { ...f, starts: at(-H), ends: at(80 * H), windows: [win("announce", -H, 6 * H), win("make", 6 * H, 30 * H), win("float", 30 * H, 65 * H), win("vote", 30 * H, 54 * H), win("results", 56 * H, null)] };
    case "make": return { ...f, starts: at(-10 * H), ends: at(60 * H), windows: [win("make", -2 * H, 22 * H), win("float", 22 * H, 57 * H), win("vote", 22 * H, 46 * H), win("results", 48 * H, null)] };
    case "float": return { ...f, starts: at(-30 * H), ends: at(30 * H), windows: [win("make", -26 * H, -2 * H), win("float", -2 * H, 33 * H), win("vote", -2 * H, 22 * H), win("results", 24 * H, null)] };
    case "results": return { ...f, starts: at(-60 * H), ends: at(9 * H), windows: [win("make", -54 * H, -30 * H), win("float", -30 * H, 9 * H), win("vote", -30 * H, -6 * H), win("results", -H, null)] };
    default: return f;
  }
}

/** A pretend maker's design: every part chosen by a little hash, so the eight are different and the same each time. */
function pretendDesign(i: number): Design {
  const pick = (slot: Parameters<typeof partsOf>[0], k: number) => { const list = partsOf(slot); return [list[(i * 7 + k * 3) % list.length].id, 0] as [string, number]; };
  return { base: pick("base", 1), ring: pick("ring", 2), light: pick("light", i), centre: pick("centre", i + 4), trims: Array.from({ length: i % 4 }, (_, k) => pick("trim", i + k * 5)) };
}

function fresh(now: number, f: Festival): TrialFestivalState {
  const made = Date.parse(windowOf(f, "make")!.from) + 30 * 60_000;
  const rows: Row[] = PRETEND.map((name, i) => ({
    id: i + 1, member: `pretend-${i}`, makerName: name, character: null, fc: i % 3 !== 2, wish: null,
    name: ["ดวงจันทร์ลอยน้ำ", "แสงเทียนกลางบึง", "บัวทองยามค่ำ", "ผีเสื้อกลางสายน้ำ", "หิ่งห้อยพาฝัน", "ผลึกจันทรา", "นกไม้ปลายฝัน", "ขนมปังลอยฟ้า"][i],
    design: pretendDesign(i), entered: true, made: made + i * 9 * 60_000, floated: null,
  }));
  // pretend popoto: a few each, never their own
  const votes: Array<[number, string]> = [];
  rows.forEach((r, i) => { for (let k = 0; k < (i * 5) % 7; k++) votes.push([r.id, `pretend-voter-${k}`]); });
  return { rows, votes, judge: 5, settled: false, awards: [], next: rows.length + 1 };
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
        return { ...a, votes: counts.get(r.id) ?? 0, title, krathong: view(r), maker: { name: r.makerName, character: r.character }, fc: r.fc };
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
      entries: s.rows.filter((r) => r.entered).map((r) => ({ ...view(r), mine: r.member === me, fc: r.fc, ...(s.settled ? { votes: counts.get(r.id) ?? 0, maker: { name: r.member === me ? "คุณ" : r.makerName, character: r.character } } : {}) })),
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
    const row: Row = { id: s.next, member: me, makerName: "คุณ", character: null, fc: true, wish: null, name: nm, design, entered: entering, made: now, floated: null };
    this.store.set({ ...s, rows: [...s.rows, row], next: s.next + 1 });
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
  float(wish: string): KrathongDid<{ krathong: KrathongView }> {
    const s = this.state(), f = this.festival(), row = s.rows.find((r) => r.member === this.store.me);
    if (!row) return { ok: false, why: "none" };
    if (row.floated !== null) return { ok: true, repeated: true, krathong: view(row) };
    if (!isOpen(windowOf(f, "float"), this.store.now())) return { ok: false, why: "closed" };
    row.floated = this.store.now();
    row.wish = cleanWish(wish) || null;
    this.store.set(s);
    return { ok: true, krathong: view(row) };
  }
  river(): RiverKrathong[] {
    const s = this.state(), f = this.festival();
    if (!isOpen(windowOf(f, "float"), this.store.now())) return [];
    return s.rows.filter((r) => r.floated !== null).sort((a, b) => a.floated! - b.floated!).map((r) => ({ id: r.id, design: r.design, floated: r.floated!, mine: r.member === this.store.me }));
  }
  judge(entry: number | null): KrathongDid {
    const s = this.state();
    if (s.settled) return { ok: false, why: "closed" };
    s.judge = entry;
    this.store.set(s);
    return { ok: true };
  }
}

const view = (r: Row): KrathongView => ({ id: r.id, name: r.name, design: r.design, entered: r.entered, made: r.made, floated: r.floated });

/** Every part's things, a few of each, for a tester's bag (dev only: `__townView.krathongKit()`). */
export const KIT: Array<[ItemId, number]> = [...new Map(PARTS.flatMap((p) => p.pay.slice(0, 1).map(([id, n]) => [id, n * 3] as [ItemId, number]))).entries()];
void PART;
