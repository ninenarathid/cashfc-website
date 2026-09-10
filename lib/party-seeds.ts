import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { ULTIMATE_ABBR } from "@/lib/types";
import { dutyArtMap } from "@/lib/duty-server";
import {
  ALLIANCE_RAIDS, CRITERION_DUNGEONS, byReleaseOrder, dutyOf, savageDuty,
} from "@/lib/duties";
import { catalogue, type ContentDef, type ContentSeed } from "@/lib/party";
import type { DutyArt } from "@/lib/duty";
import raids from "@/data/raids.json";
import type { JobKills, MemberRaids } from "@/lib/types";
import { fightKey, type SuggestRow } from "@/lib/suggest";

/**
 * Everything the party catalogue is built from, assembled once.
 *
 * This lived inside app/party/page.tsx until a second page needed it — the link
 * preview has to turn "sav:M12S-2" into a name and a picture without a browser,
 * and copying thirty lines of assembly into an image route is how the two
 * quietly start disagreeing about what M12S is called.
 *
 * Server only: it reads members.json and the duty folder off disk.
 *
 * The extremes and the savage tier come from the board rather than a list typed
 * here, because they change with the patch and the pipeline already keeps them
 * current — a hand-written list would be wrong the week a tier lands, in the
 * one place people would be trying to use it.
 */

/**
 * Every member, cut down to what a seat suggestion needs.
 *
 * members.json is a megabyte and has no business in a browser. This is the same
 * facts at about a twentieth of the size — what they play, what they have
 * killed, what they are working on — and nothing else: no parses, no
 * achievements, no portraits.
 *
 * Jobs are filtered to the ones somebody has actually played. FF Logs records a
 * job the moment it appears in one pull, and suggesting a Bard because they
 * picked one up for a minion farm four years ago is a suggestion that wastes
 * everybody's time.
 */
const PLAYED = 5;

/**
 * Which jobs each member actually killed each fight on.
 *
 * From raids.json, which is 1.3MB and stays here; this is 41KB of it. Keyed by
 * the fight's name flattened to letters and digits — the one handle the three
 * sources share — and the savage tier is keyed twice, by label and by boss,
 * because a listing knows it as "M12S-2" and the logs know it as the boss.
 */
function onFightIndex(): Record<number, Record<string, string[]>> {
  const all = raids as unknown as Record<string, MemberRaids>;
  const out: Record<number, Record<string, string[]>> = {};
  for (const [id, m] of Object.entries(all)) {
    const on: Record<string, string[]> = {};
    const add = (name: string | null | undefined, jk: JobKills | null | undefined) => {
      if (!name || !jk) return;
      const jobs = Object.entries(jk)
        .filter(([, v]) => (v?.kills ?? 0) > 0)
        .sort((a, b) => b[1].kills - a[1].kills)
        .map(([job]) => job);
      if (jobs.length) on[fightKey(name)] = jobs;
    };
    for (const e of m.current?.encounters ?? []) {
      add(e.label, e.job_kills);
      add(e.name, e.job_kills);
    }
    for (const e of m.ultimates ?? []) add(e.name ?? e.zone, e.job_kills);
    for (const e of m.extremes ?? []) add(e.name, e.job_kills);
    if (Object.keys(on).length) out[Number(id)] = on;
  }
  return out;
}

function suggestRows(data: BoardData): SuggestRow[] {
  const onFight = onFightIndex();
  return (data.members ?? []).map((m) => ({
    id: m.id,
    jobs: Object.fromEntries(
      Object.entries(m.job_scores ?? {})
        .filter(([, j]) => (j?.kills ?? 0) >= PLAYED)
        .map(([job, j]) => [job, j?.score ?? 0])),
    ex: m.ex_cleared ?? [],
    ult: m.ult_cleared ?? [],
    sav: m.current_clears ?? [],
    prog: (m.progress_all ?? []).map((p) => ({
      name: p.name, state: p.state, pct: p.pct, phase: p.phase, pulls: p.pulls,
    })),
    onFight: onFight[m.id] ?? {},
  }))
  // Somebody with no logged job cannot be suggested for anything, and carrying
  // them is carrying a row that every caller has to skip.
  .filter((r) => Object.keys(r.jobs).length);
}

export interface PartySeeds {
  extremes: ContentSeed[];
  savage: ContentSeed[];
  ultimates: ContentSeed[];
  alliances: ContentSeed[];
  criterions: ContentSeed[];
  art: DutyArt;
  /** Who plays what, for the seat suggestions. See lib/suggest.ts. */
  suggest: SuggestRow[];
  /** The tier's labels, which is how the savage clears are indexed. */
  labels: string[];
}

export function partySeeds(): PartySeeds {
  const data = raw as unknown as BoardData;

  // Release order, so EX1 opens the list rather than whichever boss happens to
  // sort first alphabetically.
  const extremes: ContentSeed[] = byReleaseOrder(
    (data.extremes ?? []).map((name) => ({ name })),
  ).map(({ name }) => ({
    name,
    short: dutyOf(name)?.badge ? name : undefined,
    badge: dutyOf(name)?.badge,
    duty: dutyOf(name)?.duty,
  }));

  // Label and boss run in step: labels[i] is what the FC calls encounters[i].
  const labels = data.current_tier?.labels ?? [];
  const bosses = (data.current_tier?.zone?.encounters ?? []).map((e) => e.name);
  const zone = data.current_tier?.zone?.name ?? null;
  const savage: ContentSeed[] = labels.map((short, i) => ({
    name: bosses[i] ?? short,
    short,
    badge: short,
    duty: savageDuty(short, zone) ?? undefined,
  }));

  return {
    extremes,
    savage,
    // Full name for the artwork and the duty, community shorthand for the
    // badge: nobody says "The Unending Coil of Bahamut" out loud, and nobody
    // searches the Duty Finder for "UCOB".
    ultimates: Object.entries(ULTIMATE_ABBR)
      .map(([name, short]) => ({ name, short, badge: short, duty: name })),
    // The patch is the badge: it is the only short handle these have, and it
    // puts them in order for free.
    alliances: ALLIANCE_RAIDS.map((a) => ({
      name: a.duty, badge: a.patch, duty: a.duty,
    })),
    // Which of the three a dungeon is goes in the shorthand rather than the
    // title: the game's own names nearly say it — "Another" means Criterion —
    // but nearly is not enough to pick from a grid.
    criterions: CRITERION_DUNGEONS.map((c) => ({
      name: c.duty, badge: c.patch, duty: c.duty, short: c.kind,
    })),
    art: dutyArtMap(),
    suggest: suggestRows(data),
    labels,
  };
}

/** The catalogue itself, for a server that needs to name one content key. */
export const partyContent = (): ContentDef[] => catalogue(partySeeds());

export const contentByKey = (key: string): ContentDef | undefined =>
  partyContent().find((c) => c.key === key);
