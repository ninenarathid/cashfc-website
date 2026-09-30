"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import PopotoIcon from "@/components/ui/PopotoIcon";

/**
 * The popoto button on a look.
 *
 * The same potato and the same toggle as the gallery's — press to give, press
 * again to take it back — so nobody has to learn a second button. What is
 * different is underneath: it asks contest_vote, which knows the window, the
 * limit and whose look this is (v98).
 *
 * It waits for the answer before it changes, unlike the gallery's, which moves
 * first and puts itself back on a failure. Here a refusal is an ordinary
 * outcome — the last popoto already given, voting closed a minute ago — and a
 * potato that flies and then un-flies is a stranger thing to watch than a
 * button that takes a quarter of a second.
 *
 * `count` is null when the count is not on show; the button then says nothing
 * about how many a look has, not even zero.
 */
export default function PopotoVote(
  { given, count, disabled = false, why, onToggle, compact = false, overlay = false, className = "" }: {
    given: boolean;
    count: number | null;
    disabled?: boolean;
    /** Why it cannot be pressed, as a tooltip, when it cannot. */
    why?: string;
    /** Resolves once the database has answered; the caller throws the potato. */
    onToggle: (button: HTMLButtonElement) => Promise<void>;
    compact?: boolean;
    /**
     * Sitting on a picture rather than on the page. It then needs a ground of
     * its own, because a screenshot behind it can be any colour at all.
     */
    overlay?: boolean;
    className?: string;
  },
) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  return (
    <button type="button"
            disabled={disabled || busy}
            aria-pressed={given}
            title={why ?? (given ? t("contest.takeBackHint") : undefined)}
            onClick={async (e) => {
              const el = e.currentTarget;
              setBusy(true);
              try { await onToggle(el); } finally { setBusy(false); }
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors ${
              overlay ? "disabled:opacity-75" : "disabled:opacity-50"} ${
              compact ? "px-2.5 py-1 text-ui" : "px-3.5 py-1.5 text-read"} ${
              overlay
                ? given ? "border-accent bg-bg/85 text-accent backdrop-blur"
                        : "border-line bg-bg/80 text-ink/85 backdrop-blur hover:border-accent hover:text-accent"
                : given ? "border-accent bg-accent/15 text-accent"
                        : "border-line text-muted hover:border-accent hover:text-accent"} ${
              busy ? "cursor-progress" : ""} ${className}`}>
      <PopotoIcon />
      {!compact && <span>{given ? t("contest.given") : t("contest.give")}</span>}
      {count != null && (
        <span className={`font-data tabular-nums ${compact ? "" : "border-l border-current/30 pl-1.5"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
