"use client";

import Link from "next/link";
import type { PersonOption } from "@/lib/people";
import { findMentions } from "@/lib/mentions";
import Linkify from "@/components/Linkify";

/**
 * What a message says, with the two things in it that are not prose.
 *
 * Links, which Linkify already handles, and names. A name is marked up because
 * "@Aqua Eleison can you bring food" is addressed to somebody, and a line
 * addressed to you should be findable by looking rather than by reading — the
 * same reason your own messages are down the right-hand side.
 *
 * The names are matched against the roster rather than against a pattern: most
 * of the FC is called two words, so "@ followed by a word" would tag half of
 * "@Aqua Eleison" and miss the rest. Same matcher the sending side uses, so
 * what is highlighted and who was told are the same list.
 *
 * A name is a link to the member's page. Not because anybody needs it from
 * here, but because the rest of this site makes a member's name a link and a
 * name that is not one reads as a different kind of thing.
 */
export default function MessageText(
  { text, people }: { text: string; people: PersonOption[] },
) {
  const named = findMentions(text, people);
  if (!named.length) return <Linkify text={text} />;

  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of named) {
    if (m.at > at) out.push(<Linkify key={`t${at}`} text={text.slice(at, m.at)} />);
    out.push(m.id == null ? (
      // The room is not a page to go to. Marked the same way so it reads as
      // the same kind of thing, and left as text because there is nowhere for
      // it to lead.
      <span key={`m${m.at}`}
            className="rounded bg-gold/15 px-1 font-medium text-gold">
        @{m.name}
      </span>
    ) : (
      <Link key={`m${m.at}`} href={`/member/${m.id}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded bg-accent/15 px-1 font-medium text-accent no-underline hover:bg-accent/25">
        @{m.name}
      </Link>
    ));
    at = m.at + m.len;
  }
  if (at < text.length) out.push(<Linkify key={`t${at}`} text={text.slice(at)} />);
  return <>{out}</>;
}
