"use client";

import Link from "next/link";
import type { Member } from "@/lib/types";
import { useAvatar } from "@/lib/avatars";
import { HoverCard } from "@/components/ui/HoverCard";

/**
 * What somebody wrote about themselves, in full, when you point at it.
 *
 * The line in the list is one line and has to be: five hundred rows that each
 * grow to fit whatever was typed is not a list any more, it is a wall. So it is
 * truncated — and a truncated sentence is a sentence nobody can read, which is
 * the complaint this answers.
 *
 * Drawn as the game draws somebody talking: a portrait, the speaker's name over
 * a rule, and the line itself below. That is not decoration for its own sake.
 * A bio is the one thing on this board written in the member's own voice rather
 * than measured out of their logs, and a box that looks like the one FFXIV uses
 * for a person speaking says whose words these are before it is read.
 *
 * The accent is theirs too, so the name in the plate is the colour their own
 * page is in — the card belongs to them and looks like it.
 */
export default function MemberBio(
  { m, bio, accent }: { m: Member; bio: string; accent: string },
) {
  const face = useAvatar(m.id, m.avatar);

  return (
    <HoverCard
      side="top"
      align="start"
      bare
      className="max-w-[23rem] border-line/80 bg-bg/95 backdrop-blur"
      trigger={
        <div className="mt-0.5 cursor-default truncate text-[12px] italic"
             style={{ color: accent }}>
          &ldquo;{bio}&rdquo;
        </div>
      }>
      {/* An inner rule inside the outer border, which is what gives the game's
          talk window its depth. One hairline, not a second frame. */}
      <div className="rounded-xl border border-white/10 p-3.5">
        {/* The whole plate is the way to them. Radix keeps the card open while
            the pointer travels from the line to it, which is what makes a link
            in a hover card reachable at all — the portrait comes along because
            aiming at a name is harder than aiming at a name and a face. */}
        <Link href={`/member/${m.id}`}
              className="group flex items-center gap-2.5 border-b border-line/70 pb-2 no-underline">
          {face ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={face} alt="" loading="lazy"
                 className="size-9 shrink-0 rounded-full border border-line object-cover" />
          ) : (
            <span className="size-9 shrink-0 rounded-full border border-line bg-card" />
          )}
          <span className="min-w-0 truncate font-display text-[13.5px] font-semibold group-hover:underline"
                style={{ color: accent }}>
            {m.name}
          </span>
        </Link>

        <p className="mt-2.5 whitespace-pre-wrap text-[13px] italic leading-relaxed text-ink/90">
          &ldquo;{bio}&rdquo;
        </p>
      </div>
    </HoverCard>
  );
}
