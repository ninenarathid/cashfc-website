"use client";

import { LANGS, useLang } from "@/lib/i18n";

/**
 * Switching the whole site, from the header, at any time.
 *
 * Two languages, so a segmented pair beats a dropdown: both options are visible,
 * and changing language is one click rather than open-then-choose. Signed-in
 * members have their choice saved to their profile by the provider.
 */
export default function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    // No outer border. With the tabs beside it drawn as plain words, an outlined
    // box here was the loudest thing in a bar whose job is the tabs — so the
    // track is a tint instead, and only the chosen half is lit.
    <div className="flex overflow-hidden rounded-lg bg-card/60"
         role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.key} onClick={() => setLang(l.key)}
                aria-pressed={lang === l.key}
                title={l.label}
                className={`px-2.5 py-1.5 font-data text-meta transition-colors ${
                  lang === l.key
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-card hover:text-ink"}`}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
