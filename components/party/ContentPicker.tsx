"use client";

import { useState } from "react";
import type { ContentDef, ContentKind } from "@/lib/party";
import { KIND_COLOR, KIND_ICON, KIND_LABEL, KIND_ORDER, SHAPE_SIZE } from "@/lib/party";
import TagIcon from "@/components/TagIcon";

/**
 * Picking what the party is for, with a still from the fight on it.
 *
 * This was a dropdown, and a dropdown of forty rows is a list of names you have
 * to already know — "Lindwurm II" tells a new member nothing, and "M12S-2" only
 * tells them the FC has a shorthand. The site already has a picture of every
 * extreme, savage boss and Ultimate, filed under the fight's own name and shown
 * on every member page. Using them here costs nothing and answers "which one is
 * that?" before the question is asked.
 *
 * Kinds along the top rather than all forty at once. Somebody opening this
 * knows whether they are running an extreme or an ultimate long before they
 * know which, so that is the first question and it cuts the grid to a handful.
 *
 * A fight with no picture filed is a plain card in its kind's colour, not a
 * broken image and not a gap — the same rule the member pages use, so adding a
 * picture later is dropping a file in and nothing here changes.
 */
export default function ContentPicker(
  { content, value, onChange }: {
    content: ContentDef[];
    value: string;
    onChange: (key: string) => void;
  },
) {
  const chosen = content.find((c) => c.key === value);
  const [kind, setKind] = useState<ContentKind>(chosen?.kind ?? "savage");
  const rows = content.filter((c) => c.kind === kind);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {KIND_ORDER.map((k) => {
          const n = content.filter((c) => c.kind === k).length;
          if (!n) return null;
          const on = k === kind;
          return (
            <button key={k} type="button" onClick={() => setKind(k)}
                    style={on ? { borderColor: KIND_COLOR[k], color: KIND_COLOR[k],
                                  background: `color-mix(in srgb, ${KIND_COLOR[k]} 12%, transparent)` }
                              : undefined}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                      on ? "" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {/* The game's own badge, the same one the member board puts on
                  the matching tag. A member who has learned that orange maw
                  means savage should not have to learn a second symbol for it
                  one page over. */}
              {KIND_ICON[k] && <TagIcon tag={KIND_ICON[k]!} size={20} />}
              {KIND_LABEL[k]}
            </button>
          );
        })}
      </div>

      {/* Three across at most. Four made each card narrower than the boss
          names written on them, and a card whose title is cut off is a card
          you have to hover to read — which defeats the point of putting a
          picture on it. */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => {
          const on = c.key === value;
          return (
            <button key={c.key} type="button" onClick={() => onChange(c.key)}
                    style={{
                      // The still goes on as a background, so a fight whose
                      // file nobody has added yet is the plain card it always
                      // was rather than a broken-image glyph.
                      backgroundImage: c.art ? `url(${c.art})` : undefined,
                      backgroundPosition: c.focus ?? "center top",
                      borderColor: on ? KIND_COLOR[c.kind] : undefined,
                    }}
                    className={`group relative flex h-[124px] items-end overflow-hidden rounded-xl border-2 bg-card bg-cover text-left transition-colors ${
                      on ? "ring-2" : "border-line hover:border-muted"}`}>
              {/* A gradient off the floor of the card, so the name is readable
                  over whatever the screenshot happens to be doing there. */}
              <span aria-hidden
                    className={`absolute inset-0 ${
                      c.art ? "bg-gradient-to-t from-black/85 via-black/35 to-transparent"
                            : ""}`} />
              {/* The game's own badge, top left, over the picture. EX1 and
                  M11S are what the FC says to each other; the card is easier to
                  find by the thing people say than by the boss's name. */}
              {/* Its own badge where it has one, over the picture with the
                  short name. Three community rows share a category chip and
                  the game gives each of them a symbol of its own. */}
              {c.icon && (
                <span className="absolute right-2 top-2 z-[1]">
                  <TagIcon tag={c.icon} size={26} />
                </span>
              )}
              {c.badge && (
                <span className="absolute left-2 top-2 z-[1] rounded-md border border-line/70 bg-bg/80 px-2 py-[2px] font-data text-[12px] font-bold text-ink/90">
                  {c.badge}
                </span>
              )}

              <span className="relative z-[1] flex w-full flex-col gap-0.5 p-2.5">
                <span className="truncate font-display text-[15px] font-semibold text-ink">
                  {c.name}
                </span>
                {/* The second line is whichever of the two says something the
                    line above did not. For a trial that is the duty you queue
                    for ("Worqor Lar Dor" under "Valigarmanda"); for a criterion
                    dungeon the duty *is* the title, and what is missing is
                    which of the three it is. An Ultimate has neither, since its
                    badge already carries the only other name it has. */}
                <span className="flex items-baseline justify-between gap-1.5">
                  <span className="truncate text-[12px] text-ink/70">
                    {c.duty && c.duty !== c.name ? c.duty
                      : c.short && c.short !== c.badge ? c.short : " "}
                  </span>
                  <span className="shrink-0 font-data text-[11px] uppercase tracking-[0.1em] text-ink/70">
                    {SHAPE_SIZE[c.shape] || "—"}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
