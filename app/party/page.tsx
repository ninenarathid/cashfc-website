import { Suspense } from "react";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { everyone } from "@/lib/people";
import { partySeeds } from "@/lib/party-seeds";
import PartyFinder from "@/components/party/PartyFinder";

export const metadata = { title: "Party finder — Cafe And SHabu" };

/**
 * The party finder, open to anybody.
 *
 * What the list is built from is assembled in lib/party-seeds.ts, because a
 * second page needs the same thing: a link preview has to turn "sav:M12S-2"
 * into a name and a picture without a browser, and two copies of that assembly
 * are two places to disagree about what M12S is called.
 */
export default function PartyPage() {
  return (
    <main className="pt-2">
      {/*
        * The board reads the open party out of the address, which makes it a
        * client component that depends on the query — and a page that is
        * otherwise prerendered cannot know the query at build time. The
        * boundary is what lets the rest of the page stay static while this one
        * hole is filled in the browser.
        *
        * Nothing to show while it waits: the board draws its own loading line
        * a beat later, and a second spinner above it would be the page saying
        * the same thing twice.
        */}
      <Suspense>
        <PartyFinder people={everyone(raw as unknown as BoardData)} {...partySeeds()} />
      </Suspense>
    </main>
  );
}
