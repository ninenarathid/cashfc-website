import type { SlotDef } from "@/lib/party";
import { ROLE_GROUP, jobInfo } from "@/components/JobIcon";
import { HOURS, parse as parseSlots, slotIndex } from "@/lib/availability";

/**
 * Who to ask for a seat.
 *
 * Filling a party meant remembering who plays what and who has seen the fight,
 * which is a thing the lead of a static knows and nobody else does — so the
 * seats went to whoever the lead could think of, and a member who had quietly
 * been learning M12S for a month never got asked because nobody knew.
 *
 * Everything here is already on this site. Which jobs somebody actually plays
 * comes from FF Logs, what they have cleared and what they are in the middle of
 * comes from the same place, and when they are usually around is the grid they
 * filled in themselves. None of it is new information; it has simply never been
 * pointed at a seat before.
 *
 * A suggestion is never a decision. This orders a list and says why each name
 * is on it; the lead still picks, and can search for anybody at all.
 */

/* ── which jobs a seat is actually asking for ─────────────────────────────── */

type Fine = "tank" | "pure" | "barrier" | "melee" | "pranged" | "mranged";

/**
 * The party list, read the way a raid group reads it.
 *
 * H1 and H2 are not two healers, they are the two kinds — a party with two
 * pures has no shields and a party with two barriers has no raise. D1 to D4 are
 * likewise a shape rather than an order: two melee, a physical ranged and a
 * caster, which is what the buffs assume. Every static already knows this and
 * says it out loud; the seat grid has been drawing it as "Healer, Healer, DPS,
 * DPS, DPS, DPS" and asking the lead to hold the rest in their head.
 *
 * Advisory, never enforced. Somebody who wants two Machinists is welcome to
 * them; this only decides who gets suggested first.
 */
const SEAT_WANTS: Record<string, Fine[]> = {
  MT: ["tank"], ST: ["tank"],
  H1: ["pure"], H2: ["barrier"],
  D1: ["melee"], D2: ["melee"],
  D3: ["pranged"], D4: ["mranged"],
  // A light party names its seats differently and has no such convention: one
  // of each, and any healer or any DPS will do.
  Tank: ["tank"],
  Heal: ["pure", "barrier"],
};

const BROAD: Record<string, Fine[]> = {
  tank: ["tank"],
  healer: ["pure", "barrier"],
  dps: ["melee", "pranged", "mranged"],
};

/**
 * What this seat is asking for, and what it will settle for.
 *
 * Two lists because the convention is a preference. A Sage on H1 is a perfectly
 * good healer and a slightly odd party, so they belong further down the list
 * rather than off it — and on a night where the only healer free is a Sage, off
 * the list would be worse than useless.
 */
export function seatWants(slot: SlotDef): { first: Fine[]; then: Fine[] } {
  // "B-H2" in an alliance is an H2. Which of the three eights it is in has
  // nothing to do with what job sits there.
  const label = slot.id.includes("-") ? slot.id.split("-")[1] : slot.id;
  const first = SEAT_WANTS[label] ?? SEAT_WANTS[slot.label] ?? BROAD[slot.role];
  const all = BROAD[slot.role] ?? [];
  return { first, then: all.filter((f) => !first.includes(f)) };
}

const fineOf = (job: string): Fine | null =>
  (jobInfo(job)?.role as Fine | undefined) ?? null;

/**
 * The same convention, said in job names.
 *
 * seatWants speaks in fine roles because that is how a member's history is
 * indexed. A seat's advert is a list of jobs, because that is what somebody
 * reading the board recognises — so H1 comes back as White Mage and
 * Astrologian rather than as "pure".
 *
 * Only the first choices. What a seat would settle for is a matter for the
 * suggestions; what it is asking for is what it says on itself.
 */
export function jobsWantedBy(slot: SlotDef, jobs: string[]): string[] {
  const { first } = seatWants(slot);
  return jobs.filter((j) => {
    const f = fineOf(j);
    return !!f && first.includes(f);
  });
}

/* ── what the site already knows about each member ────────────────────────── */

/**
 * One member, cut down to what a suggestion needs.
 *
 * Assembled on the server from members.json, which is a megabyte and has no
 * business in a browser. This is the same facts at about a twentieth of the
 * size: what they play, what they have killed, what they are working on.
 */
export interface SuggestRow {
  id: number;
  /** Job name -> FF Logs score, for the jobs they actually play. */
  jobs: Record<string, number>;
  /** Extreme trials cleared, by boss name. */
  ex: string[];
  /** Ultimates cleared, by name. */
  ult: string[];
  /** The current savage tier, parallel to current_tier.labels. */
  sav: boolean[];
  /** Fights they are in the middle of. */
  prog: {
    name: string;
    state: "learning" | "cleared";
    pct: number | null;
    phase: number;
    pulls: number;
  }[];
  /**
   * Which jobs they actually killed each fight on, most kills first.
   *
   * Keyed by the fight's name flattened to letters and digits, because the
   * three sources spell the same fight three ways and this is the only handle
   * they share. The savage tier is keyed twice, by label and by boss, since a
   * listing knows it as "M12S-2" and the logs know it as the boss.
   *
   * The point of it: "plays White Mage" and "cleared this fight on White Mage"
   * are different claims, and a panel that draws the first while a lead reads
   * it as the second is a panel that lies quietly. Somebody who healed the tier
   * two patches ago and has tanked ever since is a fine suggestion and not a
   * healer who has cleared it.
   */
  onFight: Record<string, string[]>;
}

/* ── the answer ───────────────────────────────────────────────────────────── */

export type History = "cleared" | "learning" | null;

export interface Suggestion {
  id: number;
  /**
   * The jobs to draw: ones that fit this seat, with any they actually cleared
   * this fight on first.
   */
  jobs: string[];
  /** Of those, the ones the logs say they played this fight on. */
  onThis: string[];
  /**
   * They have a record here, but on a job this seat is not asking for.
   *
   * Worth saying rather than hiding: somebody who tanked M12S knows the fight,
   * and knowing it is most of why you would ask them — but the panel must not
   * imply they have healed it.
   */
  elsewhere: boolean;
  /** Whether the seat's own convention is one of them, or only the broad role. */
  exact: boolean;
  /** Best FF Logs score among those jobs. */
  score: number;
  /** Their record on this particular fight, where the fight has one. */
  history: History;
  /** How far in, when they are learning it. */
  pulls: number | null;
  phase: number | null;
  /**
   * Whether the party's starting hour is one they said they play.
   *
   * Null when they have never filled the grid in, which is not the same as
   * "busy" and must not be sorted as though it were.
   */
  free: boolean | null;
}

/**
 * Whether this kind of content has a record worth looking up.
 *
 * The FC's logs cover the fights people log: extremes, the savage tier and the
 * ultimates. A hunt train has no clear to have, and suggesting somebody for a
 * photo shoot because they have killed M12S would be dressing up a coincidence
 * as a reason.
 */
export const hasHistory = (kind: string | undefined): boolean =>
  kind === "extreme" || kind === "savage" || kind === "ultimate";

/**
 * What a member's record says about one fight.
 *
 * Named rather than matched by id, because the three sources name the same
 * fight three ways and the only handle they share is the boss. `ex_cleared`
 * holds boss names, the savage clears are positional against the tier's labels,
 * and progress rows carry the encounter name FF Logs uses.
 */
function recordOf(
  row: SuggestRow, kind: string | undefined, boss: string | undefined,
  short: string | undefined, labels: string[],
): { history: History; pulls: number | null; phase: number | null } {
  const none = { history: null as History, pulls: null, phase: null };
  if (!hasHistory(kind) || !boss) return none;

  const learning = row.prog.find(
    (p) => p.state === "learning" && sameFight(p.name, boss));
  if (kind === "extreme") {
    if (row.ex.some((n) => sameFight(n, boss))) {
      return { history: "cleared", pulls: null, phase: null };
    }
  } else if (kind === "ultimate") {
    if (row.ult.some((n) => sameFight(n, boss))) {
      return { history: "cleared", pulls: null, phase: null };
    }
  } else if (kind === "savage") {
    // Positional: current_clears[i] is the clear of labels[i].
    const i = short ? labels.indexOf(short) : -1;
    if (i >= 0 && row.sav[i]) return { history: "cleared", pulls: null, phase: null };
  }

  if (learning) {
    return { history: "learning", pulls: learning.pulls, phase: learning.phase };
  }
  // A progress row that says cleared is a clear the lists above may not carry —
  // an older tier, or a fight logged since the last pipeline run.
  const done = row.prog.find((p) => p.state === "cleared" && sameFight(p.name, boss));
  return done ? { history: "cleared", pulls: null, phase: null } : none;
}

/** A fight's name flattened to the one handle every source agrees on. */
export const fightKey = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Two names for the same fight, allowing for punctuation and case. */
const sameFight = (a: string, b: string): boolean => fightKey(a) === fightKey(b);

/* ── when somebody is around ──────────────────────────────────────────────── */

/**
 * Whether they said they play at this hour.
 *
 * The grid is Bangkok time with Monday first, and so is every party on this
 * board, so the two line up without a conversion. An empty grid returns null:
 * "has not said" is not "is busy", and a board that sorted the two together
 * would push every member who has not filled it in behind everybody who has.
 */
export function freeAt(raw: string | null | undefined, startsAt: string): boolean | null {
  if (!raw) return null;
  const slots = parseSlots(raw);
  if (!slots.some(Boolean)) return null;
  const at = new Date(startsAt);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", weekday: "short", hour: "2-digit", hour12: false,
  }).formatToParts(at);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  // Monday first, which is how the grid is stored.
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
  if (day < 0) return null;
  return slots[slotIndex(day, hour % HOURS)] ?? false;
}

/* ── putting it in order ──────────────────────────────────────────────────── */

export interface SuggestOpts {
  rows: SuggestRow[];
  slot: SlotDef;
  /** The content kind, for whether a record is worth looking up. */
  kind: string | undefined;
  /** The boss, which is how the records name a fight. */
  boss: string | undefined;
  /** The tier label — "M12S-2" — which is how the savage clears are indexed. */
  short: string | undefined;
  labels: string[];
  startsAt: string;
  /** Character id -> availability grid. */
  when: Record<number, string | null>;
  /** Already in the party, or otherwise not to be offered. */
  exclude: Set<number>;
}

/**
 * The order.
 *
 *   1. Somebody who has seen the fight, ahead of somebody who has not, and
 *      cleared ahead of learning. This is the whole reason the feature exists:
 *      a party is filled from the people who can actually do the thing.
 *   2. The seat's own convention before the broad role, so H1 offers the pures
 *      first and still offers the barriers.
 *   3. Free at that hour, ahead of not — but never behind "has not said", which
 *      is silence and not a no.
 *   4. Their score on the best job that fits.
 *
 * Time comes third rather than first because it is the softest of the four: the
 * grid is what somebody usually does, not a diary, and half the FC has not
 * filled it in. Ordering by it would bury the people who can do the fight
 * behind the people who happened to tick a box.
 */
export function suggestFor(o: SuggestOpts): Suggestion[] {
  const { first, then } = seatWants(o.slot);
  const wanted = new Set<Fine>([...first, ...then]);
  const preferred = new Set<Fine>(first);

  const out: Suggestion[] = [];
  for (const row of o.rows) {
    if (o.exclude.has(row.id)) continue;

    const fits = Object.entries(row.jobs)
      .filter(([job]) => {
        const f = fineOf(job);
        return !!f && wanted.has(f);
      })
      .sort((a, b) => b[1] - a[1]);
    if (!fits.length) continue;

    const exact = fits.some(([job]) => {
      const f = fineOf(job);
      return !!f && preferred.has(f);
    });
    const rec = recordOf(row, o.kind, o.boss, o.short, o.labels);

    /*
     * What the logs say they played this fight on.
     *
     * Looked up by both handles because a savage listing knows the fight as
     * "M12S-2" and the logs file it under the boss.
     */
    const played = hasHistory(o.kind)
      ? (o.boss ? row.onFight[fightKey(o.boss)] : undefined)
        ?? (o.short ? row.onFight[fightKey(o.short)] : undefined)
        ?? []
      : [];
    const onThis = fits.map(([j]) => j).filter((j) => played.includes(j));

    out.push({
      id: row.id,
      /*
       * Cleared-it-on-this first, then the seat's convention, then experience.
       *
       * The first rung is the one that matters: a lead reading a row of job
       * icons under "cleared it" takes them to mean the jobs they cleared it
       * on, and until this existed they were whatever the member happened to
       * play most.
       */
      jobs: fits
        .sort((a, b) => {
          const oa = onThis.includes(a[0]) ? 1 : 0;
          const ob = onThis.includes(b[0]) ? 1 : 0;
          const fa = preferred.has(fineOf(a[0])!) ? 1 : 0;
          const fb = preferred.has(fineOf(b[0])!) ? 1 : 0;
          return ob - oa || fb - fa || b[1] - a[1];
        })
        .map(([job]) => job),
      onThis,
      // A record on the fight, and nothing this seat asks for among the jobs
      // that made it.
      elsewhere: !!rec.history && !onThis.length && played.length > 0,
      exact,
      score: fits[0]?.[1] ?? 0,
      history: rec.history,
      pulls: rec.pulls,
      phase: rec.phase,
      free: freeAt(o.when[row.id], o.startsAt),
    });
  }

  const historyRank = (h: History) => (h === "cleared" ? 2 : h === "learning" ? 1 : 0);
  // Free beats unknown beats busy. Unknown sits in the middle because it is
  // silence: sorting it with "busy" punishes everybody who never filled the
  // grid in, and sorting it with "free" claims something nobody said.
  const freeRank = (f: boolean | null) => (f === true ? 2 : f === null ? 1 : 0);

  return out.sort((a, b) =>
    historyRank(b.history) - historyRank(a.history)
    || Number(b.exact) - Number(a.exact)
    || freeRank(b.free) - freeRank(a.free)
    || b.score - a.score);
}

/** The broad role names, for the "why is this person here" line. */
export const FINE_LABEL: Record<Fine, string> = {
  tank: "Tank", pure: "Pure healer", barrier: "Barrier healer",
  melee: "Melee", pranged: "Physical ranged", mranged: "Magical ranged",
};

/** What the seat is asking for, in words, for the panel's heading. */
export const seatWantLabel = (slot: SlotDef): string =>
  seatWants(slot).first.map((f) => FINE_LABEL[f]).join(" / ");

export { ROLE_GROUP };
