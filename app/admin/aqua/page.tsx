import raw from "@/data/members.json";
import AquaDesk from "@/components/AquaDesk";
import type { BoardData } from "@/lib/types";
import { everyone } from "@/lib/people";

export const metadata = { title: "Aqua — Cafe And SHabu" };

/**
 * Aqua's page, split out of the admin panel.
 *
 * The prize tab is where the cupboard is set up and every admin works; this
 * is the part of it that is Aqua's alone to worry about, which is the gil. It
 * gets a page of its own so it can be read in one go rather than found
 * halfway down a tab.
 *
 * And, since v157, the other thing that is hers to do by hand: typing in how
 * each member is reached. That needs everybody there is to type one in for,
 * so the page hands over a name and a face each, which is all the list
 * draws, and not the roster they come out of.
 */
export default function AquaPage() {
  const people = everyone(raw as unknown as BoardData)
    .map((p) => ({ id: p.id, name: p.name, face: p.avatar }));
  return <AquaDesk people={people} />;
}
