import raw from "@/data/members.json";
import PfEventDesk from "@/components/aqua/PfEventDesk";
import type { BoardData } from "@/lib/types";
import { everyone, isFcMember } from "@/lib/people";
import { partyContent } from "@/lib/party-seeds";
import type { ContentInfo } from "@/lib/pf-event";

export const metadata = { title: "CASH PARTY FINDER · Aqua" };

/**
 * The party finder event, on a page of Aqua's own.
 *
 * The server hands over two things the browser cannot work out by itself:
 * what each content key is called (and its level, which the unsync rule
 * needs), and everybody with a page, so a lead who never sat in a seat still
 * has a name, and the new-player list can be picked from the FC with the
 * game's sprout already on the ones it would suggest.
 */
export default function PartyEventPage() {
  const data = raw as unknown as BoardData;
  const content: Record<string, ContentInfo> = {};
  for (const c of partyContent()) {
    const lv = /^Lv(\d+)$/.exec(c.badge ?? "")?.[1];
    content[c.key] = { name: c.name, kind: c.kind, ...(lv ? { level: Number(lv) } : {}) };
  }
  const sprout = new Set(data.members.filter((m) => m.new_player).map((m) => m.id));
  const people = everyone(data).map((p) => ({
    id: p.id, name: p.name, face: p.avatar,
    fc: isFcMember(p.id), sprout: sprout.has(p.id),
  }));
  return <PfEventDesk content={content} people={people} />;
}
