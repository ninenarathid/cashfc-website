"use client";

import Link from "next/link";
import type { PersonOption } from "@/lib/people";
import { findMentions } from "@/lib/mentions";
import Linkify from "@/components/Linkify";
import Emote from "@/components/ui/Emote";
import { allEmotes, findEmotes } from "@/lib/emotes";

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
  /*
   * Three kinds of thing in one line, marked out in one pass.
   *
   * Names and emotes are both spans of the text that stop being text, and
   * finding them separately meant each one only ever saw what the other had
   * left — an emote inside the run after a mention was never looked for. So
   * both are gathered, sorted by where they start, and whatever is left
   * between them goes to Linkify, which handles the third.
   *
   * A name wins a tie. The two cannot really overlap — no emote token appears
   * inside a character name — but deciding it here is cheaper than being sure
   * of that forever.
   */
  const marks = [
    ...findMentions(text, people).map((m) => ({ ...m, emote: undefined })),
    ...findEmotes(text).map((e) => ({
      at: e.at, len: e.len, id: undefined, name: "", emote: e.emote,
    })),
  ].sort((a, b) => a.at - b.at || (a.emote ? 1 : -1));

  const clean: typeof marks = [];
  for (const m of marks) {
    const last = clean[clean.length - 1];
    if (!last || m.at >= last.at + last.len) clean.push(m);
  }

  if (!clean.length) return <Linkify text={text} />;

  /*
   * An emote on its own is the message, not a full stop in one.
   *
   * Somebody answering a wipe with one crying cat has not written a sentence
   * with a picture in it, and at the height of the text around it the picture
   * is unreadable. Every chat app draws these bigger for the same reason.
   */
  const big = allEmotes(text);

  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of clean) {
    if (m.at > at) out.push(<Linkify key={`t${at}`} text={text.slice(at, m.at)} />);
    if (m.emote) {
      out.push(
        <Emote key={`e${m.at}`} value={m.emote.id} size={big ? 44 : 20} />);
      at = m.at + m.len;
      continue;
    }
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
