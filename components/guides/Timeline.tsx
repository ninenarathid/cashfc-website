"use client";

import { useLang } from "@/lib/i18n";
import { TAG_LABEL, TAG_TONE, say, type Guide, type MechTag } from "@/lib/guides/types";

/**
 * The whole fight on one line, start to finish.
 *
 * A raid does not remember a fight as a list of cast names. It remembers "the
 * tankbuster, then the stack, then the one you have to memorise" — so every
 * skill carries what kind of thing it is, in a colour, and the shape of the
 * fight can be read before a word of it is.
 *
 * It is also how anybody gets around. A guide is opened by somebody who just
 * wiped to one mechanic, and the fastest route to that mechanic is a strip of
 * everything that happens with their own place on it.
 */
export default function Timeline(
  { guide, at, onPick }: {
    guide: Guide;
    /** Index into the flattened list of mechanics. */
    at: number;
    onPick: (i: number) => void;
  },
) {
  const { lang } = useLang();
  let i = -1;
  return (
    <div className="flex flex-col gap-2">
      {guide.phases.map((p) => (
        <div key={p.id} className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
          <div className="w-full shrink-0 sm:w-36">
            <div className="font-data text-[10.5px] uppercase tracking-[0.14em] text-accent">
              {say(p.name, lang)}
            </div>
            {p.enter && (
              <div className="text-[10.5px] text-muted">{say(p.enter, lang)}</div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {p.mechanics.map((m) => {
              i += 1;
              const here = i;
              const on = here === at;
              return (
                <button key={m.id} onClick={() => onPick(here)} aria-current={on}
                        className={`flex flex-col items-start gap-1 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                          on ? "border-accent bg-accent/10"
                             : "border-line hover:border-muted"}`}>
                  <span className="flex items-baseline gap-1.5">
                    <span className={`text-[12px] ${on ? "text-accent" : "text-ink/85"}`}>
                      {m.name.split(" (")[0]}
                    </span>
                    {/* Cast, then resolve. Both, because a raid calls both: one
                        is when to press a cooldown, the other when to already
                        be standing somewhere. A skill with no cast bar shows
                        only the moment it lands. */}
                    {(m.cast || m.at) && (
                      <span className="font-data text-[10.5px] text-muted">
                        {m.cast && <span className="opacity-70">{m.cast} → </span>}
                        {m.at}
                      </span>
                    )}
                  </span>
                  {(m.tags?.length ?? 0) > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {m.tags!.map((t: MechTag) => (
                        <span key={t}
                              className={`rounded-full border px-1.5 text-[10px] ${TAG_TONE[t]}`}>
                          {TAG_LABEL[t]}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
