import type { SupabaseClient } from "@supabase/supabase-js";
import { SHAPE_SIZE, dayKey, type ContentKind, type Shape } from "@/lib/party";

/**
 * A party finder event: CASH PARTY FINDER, the owner's, 2026-11-05.
 *
 * Members put a party up on the finder, go, and prove it with a picture. A
 * run Aqua passes is a point for everybody confirmed in the party, a helper's
 * points when one of the FC's listed new players was in it, and never more
 * than the day's cap for one person on one Bangkok day. The prizes are read
 * off the totals: most points, most days, and a draw among the people who put
 * the rooms up.
 *
 * Nothing here is stored but the event's settings and Aqua's verdicts (v320).
 * The points are worked out every time from the board itself, so a party
 * whose roster changes, or a verdict taken back, is simply counted again.
 *
 * Everybody is scored, in the FC or not; the owner wants every event to keep
 * the two apart (2026-11-05), so each person carries `fc` and the prizes are
 * drawn from the FC alone unless the event says otherwise.
 */

export const PF_KINDS: ContentKind[] = [
  "dungeon", "legacy", "roulette", "extreme", "savage", "ultimate", "alliance",
  "chaotic", "criterion", "treasure", "field", "pvp", "fate", "hunt",
  "community", "mentor", "other",
];

/** What v320 opens a new event on: instanced content, not hangouts or PvP. */
export const DEFAULT_KINDS: ContentKind[] = [
  "dungeon", "legacy", "roulette", "extreme", "savage", "ultimate", "alliance",
  "chaotic", "criterion", "treasure", "field",
];

/** Fights where a night of practice without a clear still counts (15 min+). */
export const PRACTICE_KINDS = new Set<ContentKind>(
  ["extreme", "savage", "ultimate", "chaotic", "criterion"]);

/**
 * What a room of each kind is worth, cleared (v331; the owner, 2026-11-10):
 * a run of Duty Roulette earning what a cleared Extreme earns made no sense.
 * Kinds not named are worth 1. The event carries its own copy, which Aqua edits.
 */
export const DEFAULT_KIND_POINTS: Partial<Record<ContentKind, number>> = {
  alliance: 2, criterion: 2, extreme: 3, chaotic: 3, savage: 4, ultimate: 6,
};

/** v331's other defaults, used too while v331 has not run. */
export const POINT_DEFAULTS = { easyCap: 3, practicePoints: 1, practiceCap: 1, helperBonus: 1 } as const;

/** A cleared room's points by its kind. */
export const pointsOf = (ev: Pick<PfEvent, "kindPoints">, kind: ContentKind | null): number =>
  (kind && ev.kindPoints[kind]) ?? 1;

/** The owner's prizes, as he wrote them. */
export const PRIZES = {
  points: "ทองคำแท้ 96.5% 0.05 g หรือเงินสด 450 บาท",
  steadyEach: 10_000_000,
  /** When more than three tie for the most days, this is shared instead. */
  steadyPot: 30_000_000,
  steadyPotFrom: 4,
  luckyEach: 1_000_000,
} as const;

export interface PfDraw { at: string; pool: number[]; winners: number[] }

export interface PfEvent {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  kinds: ContentKind[];
  dailyCap: number;
  helperPoints: number;
  unsyncMinLevel: number;
  practiceMinutes: number;
  fcOnly: boolean;
  newbies: number[];
  drawCount: number;
  draw: PfDraw | null;
  /** Null while a draft, which only admins can read (v320). */
  publishedAt: string | null;
  /** v331: a cleared room's points by kind; kinds left out are worth 1. */
  kindPoints: Partial<Record<ContentKind, number>>;
  /** v331: rooms worth 1 point counted per person per day. */
  easyCap: number;
  /** v331: a practice room's points, and how many count per person per day. */
  practicePoints: number;
  practiceCap: number;
  /** v331: what a helper of a listed new player gets on top of the room. */
  helperBonus: number;
  /** Whether the database has v331's columns; until it does, defaults and no practice verdict. */
  hasPoints: boolean;
}

/** One content key, named. Built on the server from the board's catalogue. */
export interface ContentInfo { name: string; kind: ContentKind; level?: number }

export interface PfMember { characterId: number | null; name: string; avatar: string | null }

export interface PfParty {
  id: string;
  contentKey: string;
  shape: Shape;
  startsAt: string;
  lengthMinutes: number;
  endedAt: string | null;
  outcome: "success" | "fail" | "test" | null;
  isStatic: boolean;
  ownerCharacterId: number | null;
  /** Confirmed only: a request or an invitation is not being there. */
  members: PfMember[];
  /** Group photos (v75), the lead's. */
  photos: string[];
  /** Pictures in the party's conversation, anybody's. */
  shots: string[];
}

/** ok is a pass, and on a hard room a clear; practice is a hard room's 15 minutes and more (v331). */
export type Verdict = "ok" | "practice" | "no";
export interface Review { verdict: Verdict; note: string | null }

/**
 * Where a party stands in the event.
 *
 * open has not reached its end time yet, and counts for nothing whatever Aqua
 * has said (the owner, 2026-11-10: "End time ค่อยขึ้นให้ Aqua ตรวจ"). After
 * it: ok and no are Aqua's; pending has a picture waiting for her; bare has
 * none, which is most often a lead who has not put one up yet.
 */
export type RunState = "open" | "ok" | "no" | "pending" | "bare";

/**
 * When a party is over: when the lead closed it, or else its start plus the
 * length it was put up with. A run is counted on this Bangkok day, and is
 * shown to Aqua only once it has passed. A room listed for after midnight but
 * played in the evening is the lead's to close, which gives it its real end.
 */
export const endOf = (p: Pick<PfParty, "startsAt" | "lengthMinutes" | "endedAt">): string =>
  p.endedAt ?? new Date(Date.parse(p.startsAt) + p.lengthMinutes * 60_000).toISOString();

export interface PfRun {
  party: PfParty;
  name: string;
  kind: ContentKind | null;
  level: number | null;
  state: RunState;
  /** When it is over (endOf), the day it counts on. */
  endsAt: string;
  /** Aqua's word, kept while the room is still open. */
  verdict: Verdict | null;
  note: string | null;
  /** What Aqua should look for in the picture. */
  flags: {
    /** Below the unsync line: counts only if it was run synced. */
    lowLevel: boolean;
    /** A fight not cleared: counts as practice, past the minutes. */
    practice: boolean;
    /** Fewer people than the party's size: a hint it was unsynced. */
    few: boolean;
    /** A listed new player was in it: everybody else scores as a helper. */
    newbie: boolean;
    /** People on the list without an account, who cannot score. */
    nameOnly: number;
  };
  /** Passed as practice rather than cleared. */
  practice: boolean;
  /** What it is worth to somebody who is not a helper: cleared, or as practice. */
  worth: number;
  /** characterId -> points this run gave, after the day's quotas and cap. Passed runs only. */
  gave: Map<number, number>;
  /** characterId -> why it gave less than it was worth. */
  short: Map<number, "easy" | "practice" | "day">;
}

export interface PfPerson {
  id: number;
  name: string;
  avatar: string | null;
  fc: boolean;
  newbie: boolean;
  points: number;
  /** Before the day's cap: what the cap took is raw - points. */
  raw: number;
  days: number;
  runs: number;
  helped: number;
  /** Rooms this person put up that passed. Their tickets in the draw. */
  rooms: number;
}

export interface PfSummary {
  runs: PfRun[];
  people: PfPerson[];
  counts: { open: number; ok: number; no: number; pending: number; bare: number };
  fcPeople: number;
  outsidePeople: number;
  totalPoints: number;
  /** Who may win: the FC alone unless the event says otherwise. */
  eligible: (p: PfPerson) => boolean;
  topPoints: PfPerson[];
  steady: { people: PfPerson[]; each: number };
  drawPool: PfPerson[];
}

const PREFIX_KIND: Record<string, ContentKind> = {
  ex: "extreme", sav: "savage", ult: "ultimate", all: "alliance",
  cha: "chaotic", cri: "criterion", pvp: "pvp", treasure: "treasure",
  comm: "community", field: "field", fate: "fate", hunt: "hunt",
  roulette: "roulette", mentor: "mentor", other: "other", leg: "legacy",
  dun: "dungeon",
};

/** The kind of a content key, from the catalogue or failing that its prefix. */
export function kindOf(key: string, content: Record<string, ContentInfo>): ContentKind | null {
  return content[key]?.kind ?? PREFIX_KIND[key.split(":")[0]] ?? null;
}

/** A name for a key the catalogue no longer has: what follows its prefix. */
const nameOf = (key: string, content: Record<string, ContentInfo>): string =>
  content[key]?.name ?? (key.includes(":") ? key.slice(key.indexOf(":") + 1) : key);

/**
 * Score the event.
 *
 * Runs are taken in the order they ended, so the day's cap falls on the
 * last runs of a day, never the first, and each is counted on the Bangkok day
 * it ended. A person is counted once a party however many rows they have in it.
 */
export function scoreEvent(
  ev: PfEvent,
  parties: PfParty[],
  reviews: Map<string, Review>,
  content: Record<string, ContentInfo>,
  isFc: (characterId: number) => boolean,
  known: Map<number, { name: string; avatar: string | null }> = new Map(),
  now: number = Date.now(),
): PfSummary {
  const from = Date.parse(ev.startsAt), to = Date.parse(ev.endsAt);
  const kinds = new Set(ev.kinds);
  const newbies = new Set(ev.newbies);

  const runs: PfRun[] = [];
  for (const party of parties) {
    const at = Date.parse(party.startsAt);
    if (!(at >= from && at < to)) continue;
    if (party.outcome === "test") continue;
    const kind = kindOf(party.contentKey, content);
    if (!kind || !kinds.has(kind)) continue;
    const level = content[party.contentKey]?.level ?? null;
    const review = reviews.get(party.id);
    const proof = party.photos.length + party.shots.length > 0;
    const size = party.shape === "open" ? 0 : SHAPE_SIZE[party.shape];
    const endsAt = endOf(party);
    runs.push({
      party, kind, level, endsAt,
      name: nameOf(party.contentKey, content),
      state: Date.parse(endsAt) > now ? "open"
        : review ? (review.verdict === "no" ? "no" : "ok") : proof ? "pending" : "bare",
      verdict: review?.verdict ?? null,
      practice: review?.verdict === "practice",
      worth: review?.verdict === "practice" ? ev.practicePoints : pointsOf(ev, kind),
      note: review?.note ?? null,
      flags: {
        lowLevel: level != null && level < ev.unsyncMinLevel,
        practice: PRACTICE_KINDS.has(kind) && party.outcome !== "success",
        few: size > 0 && party.members.length < size,
        newbie: party.members.some((m) => m.characterId != null && newbies.has(m.characterId)),
        nameOnly: party.members.filter((m) => m.characterId == null).length,
      },
      gave: new Map(),
      short: new Map(),
    });
  }
  runs.sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt)
    || Number(a.party.id) - Number(b.party.id));

  const people = new Map<number, PfPerson & { dayKeys: Set<string> }>();
  const person = (id: number, name?: string, avatar?: string | null) => {
    let p = people.get(id);
    if (!p) {
      const k = known.get(id);
      p = {
        id, name: name || k?.name || `#${id}`, avatar: avatar ?? k?.avatar ?? null,
        fc: isFc(id), newbie: newbies.has(id),
        points: 0, raw: 0, days: 0, runs: 0, helped: 0, rooms: 0, dayKeys: new Set(),
      };
      people.set(id, p);
    } else if (p.name.startsWith("#") && name) {
      p.name = name; p.avatar = avatar ?? p.avatar;
    }
    return p;
  };

  /*
   * Per person and Bangkok day: the points so far, how many rooms worth one
   * point have counted, and how many practice rooms. A room past its quota
   * gives nothing; past the day's cap, what is left of it.
   */
  const used = new Map<string, number>();
  const easy = new Map<string, number>();
  const tried = new Map<string, number>();
  for (const run of runs) {
    if (run.state !== "ok") continue;
    const day = dayKey(run.endsAt);
    const isEasy = !run.practice && run.worth <= 1;
    const seen = new Set<number>();
    for (const m of run.party.members) {
      if (m.characterId == null || seen.has(m.characterId)) continue;
      seen.add(m.characterId);
      const p = person(m.characterId, m.name, m.avatar);
      const helper = run.flags.newbie && !newbies.has(m.characterId);
      const worth = run.worth + (helper ? ev.helperBonus : 0);
      const key = `${m.characterId}|${day}`;
      let got: number;
      if (run.practice && (tried.get(key) ?? 0) >= ev.practiceCap) {
        got = 0; run.short.set(m.characterId, "practice");
      } else if (isEasy && (easy.get(key) ?? 0) >= ev.easyCap) {
        got = 0; run.short.set(m.characterId, "easy");
      } else {
        if (run.practice) tried.set(key, (tried.get(key) ?? 0) + 1);
        if (isEasy) easy.set(key, (easy.get(key) ?? 0) + 1);
        got = Math.min(worth, Math.max(0, ev.dailyCap - (used.get(key) ?? 0)));
        if (got < worth) run.short.set(m.characterId, "day");
      }
      used.set(key, (used.get(key) ?? 0) + got);
      run.gave.set(m.characterId, got);
      p.points += got; p.raw += worth; p.runs += 1;
      if (helper) p.helped += 1;
      if (got > 0) p.dayKeys.add(day);
    }
    if (run.party.ownerCharacterId != null && run.party.ownerCharacterId > 0) {
      person(run.party.ownerCharacterId).rooms += 1;
    }
  }

  const list: PfPerson[] = [...people.values()].map(({ dayKeys, ...p }) => ({ ...p, days: dayKeys.size }))
    .sort((a, b) => b.points - a.points || b.days - a.days || a.name.localeCompare(b.name));

  const eligible = (p: PfPerson) => !ev.fcOnly || p.fc;
  const can = list.filter(eligible);
  const best = Math.max(0, ...can.map((p) => p.points));
  const topPoints = best > 0 ? can.filter((p) => p.points === best) : [];
  const most = Math.max(0, ...can.map((p) => p.days));
  const steadyPeople = most > 0 ? can.filter((p) => p.days === most) : [];

  const counts = { open: 0, ok: 0, no: 0, pending: 0, bare: 0 };
  for (const r of runs) counts[r.state] += 1;
  const scored = list.filter((p) => p.runs > 0);

  return {
    runs, people: list, counts,
    fcPeople: scored.filter((p) => p.fc).length,
    outsidePeople: scored.filter((p) => !p.fc).length,
    totalPoints: list.reduce((n, p) => n + p.points, 0),
    eligible,
    topPoints,
    steady: { people: steadyPeople, each: steadyEach(steadyPeople.length) },
    drawPool: can.filter((p) => p.rooms > 0).sort((a, b) => a.id - b.id),
  };
}

/** Gil each for the most days: 10m each, or 30m shared once four or more tie. */
export function steadyEach(tied: number): number {
  if (tied <= 0) return 0;
  return tied >= PRIZES.steadyPotFrom ? Math.floor(PRIZES.steadyPot / tied) : PRIZES.steadyEach;
}

/**
 * Pick n of the pool, each once, uniformly.
 *
 * A partial Fisher–Yates; `rand` gives an integer in [0, n) and is the
 * browser's crypto unless a test hands in its own.
 */
export function drawWinners(
  pool: number[], n: number,
  rand: (below: number) => number = cryptoBelow,
): number[] {
  const a = [...pool];
  const take = Math.min(n, a.length);
  for (let i = 0; i < take; i++) {
    const j = i + rand(a.length - i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, take);
}

function cryptoBelow(below: number): number {
  // Rejection sampling, so no number is likelier than another.
  const limit = Math.floor(0x1_0000_0000 / below) * below;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % below;
  }
}

/* ── reading and writing ─────────────────────────────────────────────────── */

const BASE_COLS = "id, title, starts_at, ends_at, kinds, daily_cap, helper_points,"
  + " unsync_min_level, practice_minutes, fc_only, newbies, draw_count, draw, published_at";
const POINT_COLS = "kind_points, easy_cap, practice_points, practice_cap, helper_bonus";
const EVENT_COLS = `${BASE_COLS}, ${POINT_COLS}`;

/** v331's columns asked for and not there: the event is read without them. */
const noPoints = (e: { code?: string; message?: string } | null) =>
  !!e && /kind_points|easy_cap|practice_points|practice_cap|helper_bonus/.test(e.message ?? "");

/**
 * The newest event's row, with v331's columns where the database has them.
 * Asked for with them first and without them if that fails, so the desk
 * keeps working on the day this code lands before v331 is run.
 */
async function newestEvent(supabase: SupabaseClient) {
  const ask = (cols: string) => supabase.from("pf_events").select(cols)
    .order("starts_at", { ascending: false }).limit(1);
  const full = await ask(EVENT_COLS);
  return noPoints(full.error) ? ask(BASE_COLS) : full;
}

interface EventRow {
  id: number; title: string; starts_at: string; ends_at: string; kinds: string[];
  daily_cap: number; helper_points: number; unsync_min_level: number;
  practice_minutes: number; fc_only: boolean; newbies: (number | string)[];
  draw_count: number; draw: PfDraw | null; published_at: string | null;
  kind_points?: Record<string, number> | null; easy_cap?: number; practice_points?: number;
  practice_cap?: number; helper_bonus?: number;
}

const eventOf = (r: EventRow): PfEvent => ({
  id: Number(r.id), title: r.title, startsAt: r.starts_at, endsAt: r.ends_at,
  kinds: r.kinds.filter((k): k is ContentKind => (PF_KINDS as string[]).includes(k)),
  dailyCap: r.daily_cap, helperPoints: r.helper_points,
  unsyncMinLevel: r.unsync_min_level, practiceMinutes: r.practice_minutes,
  fcOnly: r.fc_only, newbies: (r.newbies ?? []).map(Number),
  drawCount: r.draw_count, draw: r.draw ?? null, publishedAt: r.published_at ?? null,
  hasPoints: r.easy_cap !== undefined,
  kindPoints: Object.fromEntries(Object.entries(r.kind_points ?? DEFAULT_KIND_POINTS)
    .filter(([k, v]) => (PF_KINDS as string[]).includes(k) && Number.isFinite(Number(v)))
    .map(([k, v]) => [k, Number(v)])) as Partial<Record<ContentKind, number>>,
  easyCap: r.easy_cap ?? POINT_DEFAULTS.easyCap,
  practicePoints: r.practice_points ?? POINT_DEFAULTS.practicePoints,
  practiceCap: r.practice_cap ?? POINT_DEFAULTS.practiceCap,
  helperBonus: r.helper_bonus ?? POINT_DEFAULTS.helperBonus,
});

/**
 * A table PostgREST has never heard of, or the first copy of v320 without
 * published_at (42703): either way, v320 as it stands has not run.
 */
const missing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || e.code === "42703" || e.code === "PGRST204"
    || /published_at|pf_event/.test(e.message ?? "") && /exist|find/.test(e.message ?? ""));

export type LoadedEvent =
  | { state: "missing" }
  | { state: "none" }
  | { state: "error"; error: string }
  | { state: "ok"; event: PfEvent; reviews: Map<string, Review> };

/**
 * The newest event and Aqua's verdicts on it.
 *
 * The same question from an admin and a member: the database answers an
 * admin with drafts too, and everybody else with published events only.
 */
export async function loadPfEvent(supabase: SupabaseClient): Promise<LoadedEvent> {
  const { data, error } = await newestEvent(supabase);
  if (missing(error)) return { state: "missing" };
  if (error) return { state: "error", error: error.message };
  const row = (data as unknown as EventRow[] | null)?.[0];
  if (!row) return { state: "none" };
  const event = eventOf(row);
  // Not the note, which nobody reads through the API (v320).
  const { data: rv, error: rvError } = await supabase.from("pf_event_reviews")
    .select("party_id, verdict").eq("event_id", event.id);
  if (rvError) return { state: "error", error: rvError.message };
  const reviews = new Map<string, Review>();
  for (const r of (rv ?? []) as { party_id: number; verdict: Verdict }[]) {
    reviews.set(String(r.party_id), { verdict: r.verdict, note: null });
  }
  return { state: "ok", event, reviews };
}

/** Only the newest event's row, for a strip that links to it. Null when none or v320 is not in. */
export async function peekPfEvent(supabase: SupabaseClient): Promise<PfEvent | null> {
  const { data, error } = await newestEvent(supabase);
  if (error) return null;
  const row = (data as unknown as EventRow[] | null)?.[0];
  return row ? eventOf(row) : null;
}

/** Every party the event's window holds, with its people and its pictures. */
export async function loadPfParties(supabase: SupabaseClient, ev: PfEvent): Promise<PfParty[]> {
  const { data: posts, error } = await supabase.from("party_posts")
    .select("id, owner_character_id, content_key, shape, starts_at, length_minutes, ended_at, outcome, is_static")
    .gte("starts_at", ev.startsAt).lt("starts_at", ev.endsAt)
    .is("deleted_at", null)
    .order("starts_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = (posts ?? []) as {
    id: number; owner_character_id: number | null; content_key: string; shape: Shape;
    starts_at: string; length_minutes: number; ended_at: string | null;
    outcome: PfParty["outcome"]; is_static: boolean | null;
  }[];
  const ids = rows.map((p) => p.id);
  const members = new Map<number, PfMember[]>();
  const photos = new Map<number, string[]>();
  const shots = new Map<number, string[]>();
  const push = <T,>(m: Map<number, T[]>, k: number, v: T) => { const a = m.get(k) ?? []; a.push(v); m.set(k, a); };
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    const [m, ph, cm] = await Promise.all([
      supabase.from("party_members").select("party_id, character_id, name, avatar")
        .in("party_id", chunk).not("confirmed_at", "is", null).order("id"),
      supabase.from("party_photos").select("party_id, url").in("party_id", chunk).order("created_at"),
      supabase.from("party_comments").select("party_id, images")
        .in("party_id", chunk).is("deleted_at", null).not("images", "is", null).order("created_at"),
    ]);
    for (const e of [m.error, ph.error, cm.error]) if (e) throw new Error(e.message);
    for (const r of (m.data ?? []) as { party_id: number; character_id: number | null; name: string; avatar: string | null }[]) {
      push(members, r.party_id, {
        characterId: r.character_id == null ? null : Number(r.character_id),
        name: r.name, avatar: r.avatar,
      });
    }
    for (const r of (ph.data ?? []) as { party_id: number; url: string }[]) push(photos, r.party_id, r.url);
    for (const r of (cm.data ?? []) as { party_id: number; images: string[] | null }[]) {
      for (const u of r.images ?? []) push(shots, r.party_id, u);
    }
  }
  return rows.map((p) => ({
    id: String(p.id), contentKey: p.content_key, shape: p.shape,
    startsAt: p.starts_at, lengthMinutes: p.length_minutes, endedAt: p.ended_at,
    outcome: p.outcome, isStatic: !!p.is_static,
    ownerCharacterId: p.owner_character_id == null ? null : Number(p.owner_character_id),
    members: members.get(p.id) ?? [],
    photos: photos.get(p.id) ?? [],
    shots: shots.get(p.id) ?? [],
  }));
}

export type EventDraft = Omit<PfEvent, "id" | "draw" | "publishedAt" | "hasPoints">;

/** Make the event, or change it. Returns the event as the database has it. */
export async function savePfEvent(
  supabase: SupabaseClient, draft: EventDraft, id?: number, withPoints = true,
): Promise<{ event?: PfEvent; error?: string }> {
  const first = await writeEvent(supabase, draft, id, withPoints);
  // A database without v331 refuses its columns: the rest is saved without them.
  return withPoints && first.error && noPoints({ message: first.error })
    ? writeEvent(supabase, draft, id, false) : first;
}

async function writeEvent(
  supabase: SupabaseClient, draft: EventDraft, id: number | undefined, withPoints: boolean,
): Promise<{ event?: PfEvent; error?: string }> {
  const row = {
    title: draft.title.trim(), starts_at: draft.startsAt, ends_at: draft.endsAt,
    kinds: draft.kinds, daily_cap: draft.dailyCap, helper_points: draft.helperPoints,
    unsync_min_level: draft.unsyncMinLevel, practice_minutes: draft.practiceMinutes,
    fc_only: draft.fcOnly, newbies: draft.newbies, draw_count: draft.drawCount,
    // v331's, sent only where the database has them.
    ...(withPoints ? {
      kind_points: draft.kindPoints, easy_cap: draft.easyCap, practice_points: draft.practicePoints,
      practice_cap: draft.practiceCap, helper_bonus: draft.helperBonus,
    } : {}),
  };
  const cols = withPoints ? EVENT_COLS : BASE_COLS;
  const q = id
    ? supabase.from("pf_events").update(row).eq("id", id).select(cols).single()
    : supabase.from("pf_events").insert(row).select(cols).single();
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { event: eventOf(data as unknown as EventRow) };
}

/**
 * Aqua's word on a party; null takes it back, to waiting.
 *
 * Only the three columns everybody may read. An upsert's DO UPDATE reads back
 * every column it sends (EXCLUDED.col), and that needs SELECT on it: sending
 * `note`, which v320 lets nobody read, made every verdict fail with
 * "permission denied for table pf_event_reviews" (Aqua, 2026-11-10).
 */
export async function savePfReview(
  supabase: SupabaseClient, eventId: number, partyId: string,
  verdict: Verdict | null,
): Promise<{ error?: string }> {
  const { error } = verdict
    ? await supabase.from("pf_event_reviews").upsert(
      { event_id: eventId, party_id: Number(partyId), verdict },
      { onConflict: "event_id,party_id" })
    : await supabase.from("pf_event_reviews").delete()
      .eq("event_id", eventId).eq("party_id", Number(partyId));
  return error ? { error: error.message } : {};
}

/** Out of draft for everybody to read, or back into it. */
export async function savePfPublish(
  supabase: SupabaseClient, eventId: number, on: boolean,
): Promise<{ publishedAt?: string | null; error?: string }> {
  const publishedAt = on ? new Date().toISOString() : null;
  const { error } = await supabase.from("pf_events").update({ published_at: publishedAt }).eq("id", eventId);
  return error ? { error: error.message } : { publishedAt };
}

export async function savePfDraw(
  supabase: SupabaseClient, eventId: number, draw: PfDraw | null,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("pf_events").update({ draw }).eq("id", eventId);
  return error ? { error: error.message } : {};
}

/* ── words ───────────────────────────────────────────────────────────────── */

const bkk = (o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...o });

/** "6 พ.ย." */
export const fmtShortDay = (iso: string) => bkk({ day: "numeric", month: "short" }).format(new Date(iso));
/** "ศ. 7 พ.ย. 21:00" */
export const fmtWhen = (iso: string) =>
  bkk({ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso));

/** 10m, 7.5m, 450k: gil as the FC says it. */
export function fmtM(gil: number): string {
  if (gil >= 1_000_000) {
    const m = gil / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(m < 10 ? 2 : 1).replace(/0+$/, "").replace(/\.$/, "")}m`;
  }
  if (gil >= 1000) return `${Math.round(gil / 1000)}k`;
  return String(gil);
}

/** Where the event is in its window. */
export function phaseOf(ev: Pick<PfEvent, "startsAt" | "endsAt">, now = Date.now()):
  { stage: "soon" | "live" | "over"; daysLeft: number } {
  const s = Date.parse(ev.startsAt), e = Date.parse(ev.endsAt);
  if (now < s) return { stage: "soon", daysLeft: Math.ceil((s - now) / 864e5) };
  if (now < e) return { stage: "live", daysLeft: Math.ceil((e - now) / 864e5) };
  return { stage: "over", daysLeft: 0 };
}

/** Midnight in Bangkok on the day an instant falls on, as an instant. */
export function bkkMidnight(iso: string | number): string {
  return `${dayKey(new Date(iso).toISOString())}T00:00:00+07:00`;
}
