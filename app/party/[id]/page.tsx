import { Suspense } from "react";
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
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  },
): Promise<Metadata> {
  const { id } = await params;
  /*
   * The stamp the share button put on the link, passed down to the picture.
   *
   * Discord caches the card by the page's address and the picture by the
   * picture's own — so a fresh address alone gets a new card drawn around the
   * old image. Checked rather than trusted: it goes into a URL, and anything
   * that is not a short word is not one of ours.
   */
  const v = (await searchParams).v;
  const stamp = typeof v === "string" && /^[a-z0-9]{1,16}$/i.test(v) ? v : null;
  const image = `/party/${id}/opengraph-image${stamp ? `?v=${stamp}` : ""}`;
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
    // Named by hand rather than left to the file convention, which is what
    // pins every share to one address. Same route, same picture — only the
    // name it is asked for by changes.
    openGraph: {
      title, description, type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: "A party on the board" }],
    },
    twitter: {
      card: "summary_large_image", title, description, images: [image],
    },
  };
}

export default async function OneParty(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return (
    <main className="pt-2">
      {/* Same boundary as /party, for the same reason: the board reads the
          address, and this route is rendered on demand for a crawler as well
          as for a person. */}
      <Suspense>
        <PartyFinder people={everyone(raw as unknown as BoardData)}
                     openParty={id} {...partySeeds()} />
      </Suspense>
    </main>
  );
}
