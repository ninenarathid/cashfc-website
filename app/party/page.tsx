import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { ULTIMATE_ABBR } from "@/lib/types";
import { everyone } from "@/lib/people";
import { dutyArtMap } from "@/lib/duty-server";
import {
  ALLIANCE_RAIDS, CRITERION_DUNGEONS, byReleaseOrder, dutyOf, savageDuty,
} from "@/lib/duties";
import type { ContentSeed } from "@/lib/party";
import PartyFinder from "@/components/party/PartyFinder";

export const metadata = { title: "Party finder (WIP) — Cafe And SHabu" };

/**
 * The party finder. Admin-only while it is being finished.
 *
 * Everything the list is built from is assembled here, out of what the rest of
 * the site already knows. The extremes and the savage tier move with the patch
 * and the pipeline keeps them current, so a list typed into the front end would
 * be wrong the week a tier lands — in the one place people would be trying to
 * use it. The pictures come from the folder the member pages read. And the duty
 * names come from the same table the member pages use, because "Hell on Rails
 * (Extreme)" is what you would type into the game's own Party Finder while
 * "Doomtrain" is what FF Logs calls the thing inside it.
 */
export default function PartyPage() {
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
  // The label is what anybody would pick from a list, the boss name is what the
  // picture is filed under, and the duty is what the game calls the instance.
  const labels = data.current_tier?.labels ?? [];
  const bosses = (data.current_tier?.zone?.encounters ?? []).map((e) => e.name);
  const zone = data.current_tier?.zone?.name ?? null;
  const savage: ContentSeed[] = labels.map((short, i) => ({
    name: bosses[i] ?? short,
    short,
    badge: short,
    duty: savageDuty(short, zone) ?? undefined,
  }));

  // The patch is the badge: it is the only short handle these have, and it puts
  // them in order for free.
  const alliances: ContentSeed[] = ALLIANCE_RAIDS.map((a) => ({
    name: a.duty, badge: a.patch, duty: a.duty,
  }));

  // Which of the three a dungeon is goes in the shorthand rather than the
  // title: the game's own names nearly say it -- "Another" means Criterion --
  // but nearly is not enough to pick from a grid.
  const criterions: ContentSeed[] = CRITERION_DUNGEONS.map((c) => ({
    name: c.duty, badge: c.patch, duty: c.duty, short: c.kind,
  }));

  return (
    <main className="pt-2">
      <PartyFinder
        people={everyone(data)}
        extremes={extremes}
        savage={savage}
        // Full name for the artwork and for the duty, community shorthand for
        // the badge: nobody says "The Unending Coil of Bahamut" out loud, and
        // nobody searches the Duty Finder for "UCOB".
        ultimates={Object.entries(ULTIMATE_ABBR)
          .map(([name, short]) => ({ name, short, badge: short, duty: name }))}
        alliances={alliances}
        criterions={criterions}
        art={dutyArtMap()}
      />
    </main>
  );
}
