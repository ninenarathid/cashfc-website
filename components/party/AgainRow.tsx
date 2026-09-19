"use client";

import type { ContentDef, Party } from "@/lib/party";
import type { Setup } from "@/lib/party-db";
import { KIND_ICON, progressText, shapeLabel } from "@/lib/party";
import TagIcon from "@/components/TagIcon";
import { lengthSay } from "@/lib/party-i18n";
import { fmtDate } from "@/lib/dates";
import { useLang } from "@/lib/i18n";

/**
 * The parties this lead has put up before, to put up again.
 *
 * Some of these are a standing arrangement — the same fight, the same four
 * hours, the same loot rule, the same write-up, every night at eight — and
 * posting one meant answering the same nine questions again. Only one of the
 * answers was ever different, and it is the quickest one to give.
 *
 * So: press one and the form fills in with everything that was true last time,
 * with nobody in it and the same hour on the soonest day that has not passed.
 * Not a repost — a new party that starts where the last one left off, and every
 * field is still there to be changed.
 *
 * Cards with the fight's own still on them rather than a row of small chips.
 * These were chips, and two TEA parties as two chips are two words that differ
 * only in the sentence after them; as cards they are the two evenings they
 * actually were — the picture says which fight without being read, and the
 * lines under it are what a lead checks before pressing: how long, how far in,
 * and when they last ran it.
 *
 * Under the content picker, because that is the question these answer. A lead
 * who knows what they are playing tonight looks there first; a lead repeating
 * last night's finds it already answered one scroll down.
 */
export default function AgainRow(
  { setups, content, onPick, picked }: {
    setups: Setup[];
    content: ContentDef[];
    onPick: (p: Party) => void;
    /** The one the form is currently filled in from, if any. */
    picked?: Party;
  },
) {
  const { t } = useLang();

  /*
   * Only settings the form could still open.
   *
   * Content leaves the catalogue — a tier rotates, a roulette is retired — and
   * a card for one of those would fill the form in with a content picker
   * showing nothing selected and every field beneath it already answered, which
   * is a worse state than not offering it. The party it came from is still on
   * the board and still readable; it just cannot be run again from here.
   */
  const shown = setups
    .map((s) => ({ s, c: content.find((x) => x.key === s.party.contentKey) }))
    .filter((r): r is { s: Setup; c: ContentDef } => !!r.c);
  if (!shown.length) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-data text-meta uppercase tracking-[0.16em] text-muted">
        {t("pf.againTitle")}
      </h3>

      {/*
        * A rail rather than a grid.
        *
        * Four of these at card width is wider than the form on anything but a
        * desktop, and a grid would answer that by making each one narrower —
        * which takes the picture, the only part read at a glance, and shrinks
        * it. Sideways they keep their size at every width, and the bar is
        * hidden because the cards are visibly cut off at the edge, which says
        * there are more of them without a grey trough saying it again.
        */}
      <div className="no-bar -mx-0.5 flex snap-x gap-2.5 overflow-x-auto px-0.5 pb-1">
        {shown.map(({ s, c }) => {
          // The party handed back is the one kept for this setting, so its id
          // is the whole of the answer.
          const on = picked?.id === s.party.id;
          const name = c.duty ?? c.name ?? s.party.contentKey;
          const badge = c.badge && c.badge !== c.duty ? c.badge : null;
          const far = progressText(s.party.progress);

          return (
            <button key={s.key} type="button" onClick={() => onPick(s.party)}
                    aria-pressed={on}
                    className={`group relative isolate flex w-[15.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                      on ? "border-accent bg-accent/10"
                         : "border-line bg-card hover:border-accent/60"}`}>
              {/* The still from the fight, cropped to a strip. Where nobody has
                  filed one the kind's own badge stands in — an empty grey band
                  would say the card was broken rather than that the picture was
                  never fetched. */}
              <span aria-hidden={!!c.art}
                    style={c.art ? {
                      backgroundImage: `url(${c.art})`,
                      backgroundPosition: c.focus ?? "center top",
                    } : undefined}
                    className={`relative flex h-[4.5rem] items-center justify-center bg-cover ${
                      c.art ? "" : "bg-surface"}`}>
                {!c.art && (c.icon || KIND_ICON[c.kind]) && (
                  <TagIcon tag={c.icon ?? KIND_ICON[c.kind]!} size={28} />
                )}
                {/* Only as dark as the name needs: the title sits along the
                    bottom edge, so that is the only part that has to be. */}
                <span aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <span className="absolute inset-x-2 bottom-1.5 flex items-baseline gap-1.5">
                  <span className="truncate font-display text-title font-semibold text-white drop-shadow">
                    {name}
                  </span>
                  {badge && (
                    <span className="shrink-0 rounded border border-white/40 px-1 font-data text-label font-bold text-white/90">
                      {badge}
                    </span>
                  )}
                </span>

                {/* How many times this exact setting has gone up in the week.
                    A setting used twice is a coincidence; one used eleven times
                    is the reason this list exists, and the number is what tells
                    the reader which of them is that one. */}
                {s.times > 1 && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 font-data text-meta tabular-nums text-white backdrop-blur-sm">
                    ×{s.times}
                  </span>
                )}
              </span>

              <span className="flex min-w-0 flex-col gap-1 px-2.5 py-2">
                {/* The headline, which is what tells two parties for the same
                    fight apart — "P1 only", "come if you still have it in you".
                    Where there is none, how far in the party was stands in. */}
                <span className={`truncate text-read ${
                  s.party.note?.trim() ? "text-ink" : "text-muted"}`}>
                  {s.party.note?.trim() || far || t("pf.againNoNote")}
                </span>

                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data text-meta text-muted">
                  <span>{shapeLabel(s.party.shape, c.kind, c.queueIn)}</span>
                  <span aria-hidden className="opacity-40">·</span>
                  <span>{lengthSay(s.party, t)}</span>
                </span>

                <span className="font-data text-meta text-muted/80">
                  {t("pf.againLast", { when: fmtDate(s.lastAt) })}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
