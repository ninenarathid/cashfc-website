"use client";

import { useLang } from "@/lib/i18n";
import { shapeOf, thumbUrl, type ContestImage } from "@/lib/contest";

export interface ResultLook {
  id: number;
  place: number;
  votes: number;
  name: string;
  avatar: string | null;
  cover: ContestImage | undefined;
}

/**
 * The result, once Aqua has announced it.
 *
 * The top three places by popoto, and then whatever she named by hand. Ties
 * share a place, so a podium can hold four looks and that is right: two looks
 * with the same count both came second.
 *
 * Gold, steel and copper are the site's own three metals, already standing
 * for this everywhere else a ranking is drawn.
 */
const METAL: Record<number, { ring: string; chip: string }> = {
  1: { ring: "border-gold/70", chip: "bg-gold text-bg" },
  2: { ring: "border-steel/70", chip: "bg-steel text-bg" },
  3: { ring: "border-copper/70", chip: "bg-copper text-bg" },
};

export default function ContestResults(
  { podium, awards, onOpen }: {
    podium: ResultLook[];
    awards: { label: string; look: ResultLook }[];
    onOpen: (id: number) => void;
  },
) {
  const { t } = useLang();
  if (!podium.length && !awards.length) return null;

  return (
    <section className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-4">
      <h3 className="font-display text-xl font-semibold text-gold">{t("contest.results")}</h3>

      {podium.length > 0 && (
        // Whole pictures, as on the wall (see LookCard), so the cards are
        // each their own height and line up along the top.
        <div className="mt-3 grid grid-cols-2 items-start gap-3 sm:grid-cols-3">
          {podium.map((l) => {
            const m = METAL[l.place] ?? METAL[3];
            const shape = shapeOf(l.cover);
            return (
              <button key={l.id} type="button" onClick={() => onOpen(l.id)}
                      className={`group flex flex-col overflow-hidden rounded-xl border-2 bg-surface text-left transition-transform hover:-translate-y-0.5 ${m.ring} ${
                        l.place === 1 ? "col-span-2 sm:col-span-1" : ""}`}>
                <span style={shape ? { aspectRatio: String(shape) } : undefined}
                      className={`relative block w-full overflow-hidden bg-card ${shape ? "" : "aspect-[4/5]"}`}>
                  {l.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl(l.cover)} alt="" loading="lazy"
                         className={`size-full ${shape ? "object-cover" : "object-contain"}`} />
                  )}
                  <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 font-data text-ui font-semibold ${m.chip}`}>
                    {t("contest.place", { n: l.place })}
                  </span>
                </span>
                <span className="flex items-center gap-2 px-3 py-2.5">
                  {l.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.avatar} alt="" className="size-6 rounded-full border border-line object-cover" />
                  ) : (
                    <span className="size-6 rounded-full border border-line bg-card" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-data text-ui font-semibold text-ink">{l.name}</span>
                  <span className="font-data text-ui tabular-nums text-muted">
                    {t("contest.votes", { n: l.votes })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {awards.length > 0 && (
        <>
          <h4 className="mt-5 font-display text-lead font-semibold">{t("contest.awards")}</h4>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {awards.map(({ label, look }) => (
              <li key={`${label}-${look.id}`}>
                <button type="button" onClick={() => onOpen(look.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2 text-left transition-colors hover:border-gold/60">
                  <span className="block size-16 shrink-0 overflow-hidden rounded-lg bg-card">
                    {look.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl(look.cover)} alt="" loading="lazy" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-read font-semibold text-gold">{label}</span>
                    <span className="block truncate font-data text-ui text-ink">{look.name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
