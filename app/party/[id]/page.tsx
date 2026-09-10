import type { Metadata } from "next";
import PartyFinder from "@/components/party/PartyFinder";
import { everyone } from "@/lib/people";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { partySeeds, contentByKey } from "@/lib/party-seeds";
import { partyCard, seatCount } from "@/lib/party-card";
import {
  KIND_LABEL, PROGRESS_LABEL, SHAPE_LABEL, fmtDay, fmtFood, fmtLength, fmtRuns,
  fmtTime, lootText, openLabel, spotText,
} from "@/lib/party";

/**
 * One party, at its own address.
 *
 * The board could already open a party from `?p=`, and that was enough for a
 * person and useless for everybody else: Discord's crawler has no session, so a
 * link to Thursday's raid unfurled as the site's own boilerplate, and the
 * details got typed underneath it by hand. Which is the scrollback problem the
 * board exists to fix, reappearing in the sentence used to share the fix.
 *
 * So a party has a URL, and that URL carries a card. The page itself is the
 * board with that party open over it — there is no separate reading view,
 * because the party is the thing in front of you either way and a second layout
 * would be a second place for the seat grid to be slightly different.
 */

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = { title: "Party finder — Cafe And SHabu" };

  const card = await partyCard(id);
  if (!card) return fallback;
  const def = contentByKey(card.contentKey);

  const name = def?.duty ?? def?.name ?? card.contentKey;
  const kind = def ? KIND_LABEL[def.kind] : "Party";

  // The sentence somebody reads in a channel, in the order they want it: when,
  // how full, and what the evening's terms are.
  const bits = [
    `${fmtDay(card.startsAt)} ${fmtTime(card.startsAt)}`,
    card.lengthUnit === "maps" ? "until the maps are done"
      : card.lengthUnit === "runs" ? fmtRuns(card.runs ?? 1)
        : card.lengthUnit === "food" ? fmtFood(card.lengthMinutes)
          : fmtLength(card.lengthMinutes),
    card.seatsTotal ? `${seatCount(card)} in the party` : `${card.seatsTaken} coming`,
    card.shape === "open" ? openLabel(def?.kind) : SHAPE_LABEL[card.shape],
    card.progress ? PROGRESS_LABEL[card.progress.at] : null,
    lootText(card.loot ?? undefined),
    spotText(card.spot ?? undefined),
    card.roulettes?.length ? card.roulettes.join(", ") : null,
    card.note,
  ].filter(Boolean) as string[];

  const title = `${name} — ${kind} · Cafe And SHabu`;
  const description = bits.join(" · ");

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function OneParty(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return (
    <main className="pt-2">
      <PartyFinder people={everyone(raw as unknown as BoardData)}
                   openParty={id} {...partySeeds()} />
    </main>
  );
}
