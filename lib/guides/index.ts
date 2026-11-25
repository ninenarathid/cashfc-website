import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * A guide, read by your own spot (v344).
 *
 * The owner's word, 2026-11-25: not the guide planned before — a fight written
 * as coordinates, with timings, variants and a quiz — but wtfdig's: pick your
 * role, and every step of the fight is one picture with everything dimmed
 * except where you stand, and a line saying what it is. One picture serves all
 * eight seats; what a seat adds is a point or two on it and a sentence.
 *
 * Admins make them in the page itself, so all of this lives in the database
 * and the page reads it from there.
 */

/** The eight seats, as the strategies name them. */
export const SEATS = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"] as const;
export type Seat = (typeof SEATS)[number];

export const isSeat = (s: unknown): s is Seat =>
  typeof s === "string" && (SEATS as readonly string[]).includes(s);

/** Which role a seat is, for its colour. D3 the physical ranged, D4 the caster. */
export const SEAT_ROLE: Record<Seat, "tank" | "healer" | "dps"> = {
  MT: "tank", ST: "tank", H1: "healer", H2: "healer",
  D1: "dps", D2: "dps", D3: "dps", D4: "dps",
};

/**
 * The game's role colours: the blue, green and red every party list wears,
 * deep enough that white text on them passes AA (5.7, 5.1 and 5.0 to 1).
 */
export const ROLE_COLOR = { tank: "#3a62c2", healer: "#2f7d3b", dps: "#c2453c" } as const;

export const seatColor = (s: Seat) => ROLE_COLOR[SEAT_ROLE[s]];

/** The game's role badge for a seat (public/guides/icons, from RaidPlan). */
export const seatIcon = (s: Seat) => `/guides/icons/${s}.png`;

export const CATEGORIES = ["savage", "extreme", "ultimate", "chaotic", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  savage: "Savage", extreme: "Extreme", ultimate: "Ultimate", chaotic: "Chaotic", other: "Other",
};

export const isCategory = (s: unknown): s is Category =>
  typeof s === "string" && (CATEGORIES as readonly string[]).includes(s);

/** Where a new guide's plan comes from unless it says otherwise: "Strategy from game8". */
export const DEFAULT_SOURCE = "game8";

/** Newest first: the tier people are on is the one they are reading about. */
export const EXPANSIONS = ["Dawntrail", "Endwalker", "Shadowbringers", "Stormblood", "Heavensward", "A Realm Reborn"];

/** A point on a picture, in percent of its width and height. */
export type Point = [number, number];

/** What one seat does in one step. */
export interface SeatSpot {
  at?: Point[];
  say?: string;
  /** The same line in English (v346). */
  say_en?: string;
}

export type Spots = Partial<Record<Seat, SeatSpot>>;

/** A small picture of what to watch for: the boss's pose, an object at the edge. */
export interface Ref {
  path: string;
  w: number;
  h: number;
  say?: string;
  say_en?: string;
}

export interface GuideRow {
  id: number;
  slug: string;
  name: string;
  short: string | null;
  expansion: string;
  category: Category;
  patch: string | null;
  source_name: string | null;
  source_url: string | null;
  note: string | null;
  note_en: string | null;
  /** What the fight asks before you go in (v347). */
  req_level: number | null;
  req_ilvl: number | null;
  req_party: number | null;
  req_minutes: number | null;
  unlock: string | null;
  unlock_en: string | null;
  /** The party finder's key for the duty: `ex:Enuo`, `sav:M9S`. */
  content_key: string | null;
  published: boolean;
  sort: number;
}

/** A duty a guide can be for, as the party finder names it. */
export interface DutyOption {
  key: string;
  label: string;
  /** The duty's banner, the one the party finder wears (public/duty/…). */
  art?: string;
  /** Where in it the subject is, for a crop. */
  focus?: string;
}

/** The party finder, opened on its form with this duty already chosen. */
export const partyFor = (contentKey: string) =>
  `/party?new=1&duty=${encodeURIComponent(contentKey)}`;

export interface StepRow {
  id: number;
  guide_id: number;
  sort: number;
  phase: string | null;
  /** The big mechanic this step is one part of; consecutive ones share a box. */
  mech: string | null;
  name: string;
  note: string | null;
  /** The English beside the Thai (v346); empty falls back to the Thai. */
  phase_en: string | null;
  mech_en: string | null;
  name_en: string | null;
  note_en: string | null;
  picture: string | null;
  pic_w: number | null;
  pic_h: number | null;
  ring: number;
  spots: Spots;
  refs: Ref[];
}

export const GUIDE_COLUMNS =
  "id, slug, name, short, expansion, category, patch, source_name, source_url, note, note_en, content_key, published, sort, req_level, req_ilvl, req_party, req_minutes, unlock, unlock_en";
export const STEP_COLUMNS =
  "id, guide_id, sort, phase, mech, name, note, phase_en, mech_en, name_en, note_en, picture, pic_w, pic_h, ring, spots, refs";

/** The same limits v344 holds the database to. */
export const LIMITS = {
  name: 80, short: 20, phase: 60, mech: 80, refs: 4, refSay: 160, stepNote: 1000, guideNote: 1000, say: 200,
  points: 4, ringMin: 3, ringMax: 30, sourceName: 80, sourceUrl: 300, slug: 40,
} as const;

export const RING_DEFAULT = 9;

/* ── what a fight gives (v347) ───────────────────────────────────────────── */

export const REWARD_KINDS = ["token", "weapon", "mount", "minion", "orchestrion", "accessory", "other"] as const;
export type RewardKind = (typeof REWARD_KINDS)[number];

/** One piece of a set: one weapon of a job. */
export interface Piece {
  name: string;
  job?: string;
  icon?: string;
}

export interface RewardRow {
  id: number;
  guide_id: number;
  sort: number;
  kind: RewardKind;
  /** As the English client names it. */
  name: string;
  ilvl: number | null;
  say: string | null;
  say_en: string | null;
  icon: string | null;
  pics: Ref[];
  pieces: Piece[];
}

export const REWARD_COLUMNS = "id, guide_id, sort, kind, name, ilvl, say, say_en, icon, pics, pieces";

/** A reward from the database, made safe to draw: our own pictures only. */
export function cleanReward(row: RewardRow): RewardRow {
  const kind = (REWARD_KINDS as readonly string[]).includes(row.kind) ? row.kind : "other";
  const pieces = Array.isArray(row.pieces)
    ? row.pieces.slice(0, 40).flatMap((p): Piece[] => {
      if (!p || typeof p !== "object" || typeof p.name !== "string" || !p.name.trim()) return [];
      return [{
        name: p.name.slice(0, 80),
        ...(typeof p.job === "string" && p.job.trim() ? { job: p.job.slice(0, 20) } : {}),
        ...(isPicturePath(p.icon) ? { icon: p.icon } : {}),
      }];
    })
    : [];
  return { ...row, kind, icon: isPicturePath(row.icon) ? row.icon : null, pics: cleanRefs(row.pics), pieces };
}

/* ── pictures ────────────────────────────────────────────────────────────── */

/** The only shape v344 lets into `picture`: `<uploader>/g-<time>-<random>.<ext>`. */
const PICTURE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$/;

export const isPicturePath = (s: unknown): s is string =>
  typeof s === "string" && s.length <= 120 && PICTURE_PATH.test(s);

export const newPicturePath = (userId: string, ext: "webp" | "jpg" | "png"): string =>
  `${userId}/g-${Date.now()}-${Math.random().toString(36).slice(2, 8).padEnd(4, "0")}.${ext}`;

export function pictureUrl(path: string | null | undefined): string | null {
  if (!isPicturePath(path) || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/guides/${path}`;
}

/** How wide a picture is kept: sharp on a phone's dense screen, small on the wire. */
export const PICTURE_MAX = 1400;

/** The size to draw a picture down to, keeping its shape. */
export function fitPicture(w: number, h: number, max = PICTURE_MAX): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/* ── reading what the database hands back ───────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A coordinate as it is stored: a number from 0 to 100, to one decimal. */
export const roundPct = (n: number) => Math.round(clamp(n, 0, 100) * 10) / 10;

/**
 * Spots as the page may draw them.
 *
 * The database already refuses anything else (guide_spots_ok), so this only
 * matters for a row written by hand with the service key; but the points go
 * into an SVG, and the page draws nothing it did not expect.
 */
export function cleanSpots(raw: unknown): Spots {
  const out: Spots = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSeat(k) || !v || typeof v !== "object" || Array.isArray(v)) continue;
    const src = v as { at?: unknown; say?: unknown };
    const spot: SeatSpot = {};
    if (Array.isArray(src.at)) {
      const pts: Point[] = [];
      for (const p of src.at.slice(0, LIMITS.points)) {
        if (Array.isArray(p) && p.length === 2
          && typeof p[0] === "number" && typeof p[1] === "number"
          && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
          pts.push([roundPct(p[0]), roundPct(p[1])]);
        }
      }
      if (pts.length) spot.at = pts;
    }
    if (typeof src.say === "string" && src.say.trim()) spot.say = src.say.trim().slice(0, LIMITS.say);
    const en = (src as { say_en?: unknown }).say_en;
    if (typeof en === "string" && en.trim()) spot.say_en = en.trim().slice(0, LIMITS.say);
    if (spot.at || spot.say || spot.say_en) out[k] = spot;
  }
  return out;
}

export const cleanRing = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.round(clamp(n, LIMITS.ringMin, LIMITS.ringMax)) : RING_DEFAULT;

/** Reference pictures as the page may draw them: only our own paths, sized. */
export function cleanRefs(raw: unknown): Ref[] {
  if (!Array.isArray(raw)) return [];
  const out: Ref[] = [];
  for (const r of raw.slice(0, LIMITS.refs)) {
    if (!r || typeof r !== "object") continue;
    const v = r as { path?: unknown; w?: unknown; h?: unknown; say?: unknown; say_en?: unknown };
    if (!isPicturePath(v.path) || typeof v.w !== "number" || typeof v.h !== "number"
      || !(v.w > 0) || !(v.h > 0)) continue;
    const say = typeof v.say === "string" && v.say.trim() ? v.say.trim().slice(0, LIMITS.refSay) : undefined;
    const sayEn = typeof v.say_en === "string" && v.say_en.trim() ? v.say_en.trim().slice(0, LIMITS.refSay) : undefined;
    out.push({ path: v.path, w: Math.round(v.w), h: Math.round(v.h), ...(say ? { say } : {}), ...(sayEn ? { say_en: sayEn } : {}) });
  }
  return out;
}

/** A step from the database, made safe to draw. */
export function cleanStep(row: StepRow): StepRow {
  return {
    ...row, mech: row.mech?.trim() || null,
    spots: cleanSpots(row.spots), ring: cleanRing(row.ring), refs: cleanRefs(row.refs),
  };
}

/* ── editing ─────────────────────────────────────────────────────────────── */

/** Puts a point down, or takes away the one under the tap. */
export function togglePoint(points: Point[], at: Point, near: number): Point[] {
  const hit = points.findIndex(([x, y]) => Math.hypot(x - at[0], y - at[1]) <= near);
  if (hit >= 0) return points.filter((_, i) => i !== hit);
  if (points.length >= LIMITS.points) return [...points.slice(1), [roundPct(at[0]), roundPct(at[1])]];
  return [...points, [roundPct(at[0]), roundPct(at[1])]];
}

/** Spots with one seat changed; a seat left with nothing is taken out. */
export function withSeat(spots: Spots, seat: Seat, next: SeatSpot): Spots {
  const out: Spots = { ...spots };
  const at = next.at?.length ? next.at : undefined;
  const say = next.say?.trim() ? next.say : undefined;
  const sayEn = next.say_en?.trim() ? next.say_en : undefined;
  if (!at && !say && !sayEn) delete out[seat];
  else out[seat] = { ...(at ? { at } : {}), ...(say ? { say } : {}), ...(sayEn ? { say_en: sayEn } : {}) };
  return out;
}

/**
 * A guide's words in the reader's language: the English where somebody has
 * written it, the Thai otherwise (v346). A guide half translated still reads
 * whole, and an English reader seeing one Thai line knows what is missing.
 */
export function inLang(lang: string, th: string | null | undefined, en: string | null | undefined): string {
  if (lang === "en" && en?.trim()) return en;
  return th ?? en ?? "";
}

/** An address for a fight from its short name: "M9S" → "m9s". */
export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, LIMITS.slug)
    .replace(/-+$/g, "");
}

export const isSlug = (s: string) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(s);

/** Steps that belong together on the page: one big mechanic, or one step on its own. */
export interface Block {
  mech: string | null;
  steps: StepRow[];
}

/**
 * Steps in reading order, cut into their phases, and inside a phase into
 * blocks.
 *
 * A phase is only a heading: the steps under one are the ones that follow it
 * until the next phase name. A step with no phase stays under the one before.
 * A block is a run of consecutive steps with the same big mechanic, which the
 * page draws as one box with its parts in order; a step with none is a block
 * of its own. A big mechanic never runs across a phase heading.
 */
export function inPhases(steps: StepRow[]): { phase: string | null; blocks: Block[] }[] {
  const out: { phase: string | null; blocks: Block[] }[] = [];
  for (const s of [...steps].sort((a, b) => a.sort - b.sort || a.id - b.id)) {
    const p = s.phase?.trim() || null;
    let group = out[out.length - 1];
    if (!group || (p !== null && p !== group.phase)) {
      group = { phase: p, blocks: [] };
      out.push(group);
    }
    const m = s.mech?.trim() || null;
    const last = group.blocks[group.blocks.length - 1];
    if (m && last && last.mech === m) last.steps.push(s);
    else group.blocks.push({ mech: m, steps: [s] });
  }
  return out;
}
