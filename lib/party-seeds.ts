import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { ULTIMATE_ABBR } from "@/lib/types";
import { dutyArtMap } from "@/lib/duty-server";
import {
  ALLIANCE_RAIDS, CRITERION_DUNGEONS, byReleaseOrder, dutyOf, savageDuty,
} from "@/lib/duties";
import { catalogue, type ContentDef, type ContentSeed } from "@/lib/party";
import type { DutyArt } from "@/lib/duty";

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

export interface PartySeeds {
  extremes: ContentSeed[];
  savage: ContentSeed[];
  ultimates: ContentSeed[];
  alliances: ContentSeed[];
  criterions: ContentSeed[];
  art: DutyArt;
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
  };
}

/** The catalogue itself, for a server that needs to name one content key. */
export const partyContent = (): ContentDef[] => catalogue(partySeeds());

export const contentByKey = (key: string): ContentDef | undefined =>
  partyContent().find((c) => c.key === key);
