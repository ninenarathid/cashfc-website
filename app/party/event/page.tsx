import raw from "@/data/members.json";
import PfEventPublic from "@/components/party/PfEventPublic";
import type { BoardData } from "@/lib/types";
import { everyone, isFcMember } from "@/lib/people";
import { partyContent } from "@/lib/party-seeds";
import type { ContentInfo } from "@/lib/pf-event";

export const metadata = { title: "CASH PARTY FINDER — Cafe And SHabu" };

/**
 * The party finder event, as members read it.
 *
 * Open to anybody, as the finder is: the points are counted in the browser
 * from the same board everybody can already read, with Aqua's verdicts. A
 * draft is read by admins alone (v320), so until she publishes, everybody
 * else finds this page saying there is no event.
 */
export default function PartyEventPage() {
  const data = raw as unknown as BoardData;
  const content: Record<string, ContentInfo> = {};
  for (const c of partyContent()) {
    const lv = /^Lv(\d+)$/.exec(c.badge ?? "")?.[1];
    content[c.key] = { name: c.name, kind: c.kind, ...(lv ? { level: Number(lv) } : {}) };
  }
  const people = everyone(data).map((p) => ({ id: p.id, name: p.name, face: p.avatar, fc: isFcMember(p.id) }));
  return <PfEventPublic content={content} people={people} />;
}
