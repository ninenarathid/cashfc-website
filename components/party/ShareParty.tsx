"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * A link to one party.
 *
 * The board is one page, so "come and look at this" used to mean "go to the
 * party finder and scroll until you find the M12S one on Thursday" — which is
 * the Discord problem the board exists to fix, reappearing in the sentence
 * people use to share it.
 *
 * The address is the state, not a second copy of it. Opening a row writes the
 * id in and closing it takes the id out, with replaceState rather than push so
 * that the back button still leaves the page instead of stepping back through
 * every row somebody opened on the way down.
 */

const PARAM = "p";

/** The party the address is asking for, if any. */
export function readDeepLink(): string | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get(PARAM);
  return v && /^\d+$/.test(v) ? v : null;
}

/** Put the open row in the address, or take it out again. */
export function writeDeepLink(id: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(PARAM, id);
  else url.searchParams.delete(PARAM);
  window.history.replaceState(null, "", url.toString());
}

/** The whole address of one party, which is the thing being shared. */
export const partyUrl = (id: string): string =>
  typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?${PARAM}=${id}`;

export default function ShareParty({ id }: { id: string }) {
  const { t } = useLang();
  const [said, setSaid] = useState(false);

  const copy = async () => {
    const url = partyUrl(id);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard permission, or an insecure origin. Falling back to a
      // prompt is not nothing: the link is still in front of them, selected,
      // and Ctrl+C works — which is better than a button that does nothing
      // and does not say why.
      window.prompt(t("party.copyLink"), url);
      return;
    }
    setSaid(true);
    setTimeout(() => setSaid(false), 1800);
  };

  return (
    <button onClick={copy}
            className="rounded-lg border border-line px-2.5 py-1 text-[12px] text-muted transition-colors hover:border-muted hover:text-ink">
      {said ? `✓ ${t("party.copied")}` : `🔗 ${t("party.copyLink")}`}
    </button>
  );
}
