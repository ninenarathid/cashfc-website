"use client";

import type { Member } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { HoverCard } from "@/components/ui/HoverCard";

/**
 * A sprout after the name: this account has not been around long.
 *
 * Worked out from the size of the collection rather than from how far through
 * the story somebody is, which was the obvious rule and the wrong one — a
 * member who has been here two years and never finished Endwalker is not a new
 * player, and a mark saying otherwise sends help to the wrong person while
 * missing somebody who rushed the story to get here.
 *
 * It says why when you point at it, because a badge on somebody's name that
 * cannot explain itself is a badge people argue about.
 */
/**
 * The sprout the game itself uses, at 32 by 32 with an alpha channel.
 *
 * It was the seedling emoji first, which is the right idea and the wrong
 * picture: every operating system draws that character differently, so a mark
 * meant to be recognised at a glance was a different shape on every machine
 * looking at the same board. Then a drawn one, which was one shape everywhere
 * and still not the shape anybody knows.
 *
 * This is the one FFXIV puts beside a new adventurer's name. The FC reads it
 * without being told what it means, which no drawing of mine was going to
 * manage — and a 2KB file is a small price for a mark that needs no caption.
 */
function Sprout({ size = 15 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/sprout.png" alt="" width={size} height={size}
         className="shrink-0" style={{ width: size, height: size }} />
  );
}

export default function NewPlayer(
  { m, size = 15 }: { m: Member; size?: number },
) {
  const { t } = useLang();
  if (!m.new_player) return null;

  const msq = m.msq ?? null;
  const where = msq?.playing
    ? t("new.playingMsq", { patch: msq.playing })
    : msq?.done
      ? t("new.doneMsq", { patch: msq.done })
      : null;

  return (
    <HoverCard
      side="top"
      trigger={
        <span aria-label={t("new.label")} title={t("new.label")}
              className="inline-flex cursor-default items-center align-middle">
          <Sprout size={size} />
        </span>
      }>
      <div className="flex flex-col gap-1">
        <div className="font-display text-[13px] font-semibold text-jade">
          {t("new.label")}
        </div>
        <p className="text-[12.5px] leading-relaxed text-muted">{t("new.why")}</p>
        {where && <p className="text-[12.5px] text-ink/85">{where}</p>}
      </div>
    </HoverCard>
  );
}

/**
 * Where somebody is in the story, in the shape the raid board already uses.
 *
 * "Still on it" and "just finished it" are the two states a fight has, and the
 * story is read the same way — so it is the same chip in a different colour
 * rather than a second idea to learn. Only ever drawn where the achievements
 * could be read: a closed profile is not the beginning of the story, and
 * nothing here guesses.
 */
export function MsqBadge(
  { m, patches = {}, size = "sm" }: {
    m: Member;
    /** What each patch is called, from the board. */
    patches?: Record<string, { era: string | null; title: string }>;
    size?: "sm" | "md";
  },
) {
  const { t } = useLang();
  const msq = m.msq;
  if (!msq) return null;
  // Up to date. There is nothing to report about somebody who has read all of
  // it, and a chip saying so on four hundred rows is noise.
  if (!msq.playing) return null;

  const pad = size === "md"
    ? "px-3 py-1 text-[12.5px]" : "px-2.5 py-[3px] text-[11.5px]";
  const here = patches[msq.playing] ?? null;

  return (
    <HoverCard
      side="top"
      trigger={
        // Worded the way the raid one is, because it is the same kind of fact
        // and sits on the same line: a prefix that says which of the two states
        // this is, then the thing itself.
        <span className={`inline-flex cursor-default items-center gap-1.5 rounded-full border border-[#7c6bd6]/50 bg-[#7c6bd6]/10 font-medium text-[#a495ee] ${pad}`}>
          <span className="shrink-0 opacity-75">{t("new.msq")}</span>
          <span className="min-w-0">
            {msq.playing}
            {/* The number alone is a number. What makes it where somebody is in
                the story is the era and the name of the patch. */}
            {here?.era && <span className="opacity-80"> {here.era}</span>}
            {here?.title && here.title !== here.era && <> {here.title}</>}
          </span>
        </span>
      }>
      <div className="flex flex-col gap-1">
        <div className="text-[12.5px] leading-relaxed text-ink/90">
          {t("new.playingMsq", { patch: msq.playing })}
          {here?.title ? ` — ${here.title}` : ""}
        </div>
        {msq.playing_name && (
          // What finishing it is called, which is the achievement this was all
          // read from in the first place.
          <div className="text-[12px] text-muted">{msq.playing_name}</div>
        )}
        {msq.done && (
          <div className="text-[12px] text-muted">
            {t("new.doneMsq", { patch: msq.done })}
          </div>
        )}
      </div>
    </HoverCard>
  );
}
