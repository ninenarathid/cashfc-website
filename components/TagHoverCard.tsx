"use client";

import type { ReactNode } from "react";
import { HoverCard } from "@/components/ui/HoverCard";
import TagIcon from "@/components/TagIcon";
import { TAG_CLASS, TAG_LABELS, tagHelp, gradeHelp, rarestLine } from "@/components/MemberTags";
import { ACHV_TIER_STYLE, tagText } from "@/lib/tags";
import { useLang } from "@/lib/i18n";

/**
 * What a tag means, as a card rather than as a run-on line.
 *
 * The three things worth saying about a playstyle tag — what the tag is, what
 * the grade on it means, and how rare the rarest thing they hold is — used to
 * be joined with " · " into one string for the `title` attribute, because a
 * title can only be one string. Read aloud that was a sentence with no shape:
 * three unrelated claims in a row, in whichever order the code happened to put
 * them.
 *
 * Here they are three lines, with the tag wearing its own colour at the top, so
 * the answer to "what is this chip" is separate from "and how good is it".
 */
export default function TagHoverCard(
  { tag, tier, rarest, extra, children }: {
    tag: string;
    /** The grade, where the tag carries one. */
    tier?: string | null;
    /** Rarity of the rarest achievement in this bucket, as a percentage. */
    rarest?: number | null;
    /** Anything the chip itself wants to add — the Ultimates it stands for. */
    extra?: ReactNode;
    children: ReactNode;
  },
) {
  const { lang } = useLang();
  const help = tagHelp(tag, lang);
  const grade = tier ? gradeHelp(tier, lang) : "";
  const rare = rarestLine(rarest, lang);
  const style = tier ? ACHV_TIER_STYLE[tier] : undefined;

  // Nothing to say means no card at all, rather than an empty one that opens
  // and explains nothing.
  if (!help && !grade && !rare && !extra) return <>{children}</>;

  return (
    <HoverCard trigger={children}>
      <div className="flex flex-col gap-2">
        <div className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${
          TAG_CLASS[tag] ?? "border-line text-muted"}`}>
          <TagIcon tag={tag} size={14} />
          {TAG_LABELS[tag] ?? tag}
        </div>

        {help && <p className="text-ink/85">{help}</p>}

        {grade && (
          <p className="border-t border-line/70 pt-2">
            <span className="font-semibold"
                  style={style ? { color: style.color, fontWeight: style.weight } : undefined}>
              {tagText(tag, tier ?? undefined)}
            </span>
            <span className="text-muted"> — {grade}</span>
          </p>
        )}

        {rare && <p className="text-muted">{rare}</p>}
        {extra}
      </div>
    </HoverCard>
  );
}
