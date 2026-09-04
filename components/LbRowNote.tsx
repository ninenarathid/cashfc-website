"use client";

import { useLang } from "@/lib/i18n";

/**
 * What one leaderboard number is made of, for its hover.
 *
 * A component for two sentences because the leaderboards page is a server
 * component — it reads the roster at build time — and these have to be in the
 * reader's language. The same reason LbTopTen next door exists.
 */
export default function LbRowNote(
  { n, score, share, ceiling, kind }: {
    n: number; score: number;
    /** The playstyle's own name, so the sentence says which target. */
    kind?: string;
    /** Share of what a dedicated player would hold, 0-1. */
    share?: number | null;
    ceiling?: number | null;
  },
) {
  const { t } = useLang();
  const over = ceiling != null && score > ceiling;
  return (
    <>
      {t("lb.rowMeasure", { n, p: score.toFixed(1) })}
      {/* The share moved here when the column started showing points. It is
          still the number the grade is worked out from, so it belongs
          somewhere — just not in a column that ranks by something else. */}
      {share != null && (
        <span className="mt-1 block text-muted">
          {t("lb.ofDedicated", { s: (share * 100).toFixed(0), k: kind ?? "" })}
        </span>
      )}
      {over && (
        <span className="mt-1 block text-muted">
          {t("lb.pastCeiling", { c: ceiling!.toFixed(0) })}
        </span>
      )}
    </>
  );
}
