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
 * The address is the state, not a second copy of it — the board reads the open
 * party out of it and writes it back through the router, which is what makes a
 * link to one work whether it is followed from Discord or from a notification
 * on the board itself.
 */

/**
 * The whole address of one party, which is the thing being shared.
 *
 * The path form rather than the query one. Both open the same party, and only
 * this one is a page as far as anybody else's software is concerned: Discord
 * fetches it and gets a card with the fight, the time and how full the party
 * is, where /party?p=11 gets whatever /party says about itself. Which was the
 * site's own eleven-word description, under every link anybody had ever
 * posted.
 */
export const partyUrl = (id: string): string =>
  typeof window === "undefined" ? ""
    /*
     * With a throwaway stamp on the end.
     *
     * Discord keeps what it has already unfurled, keyed by the address — so the
     * second time somebody shares a party, the card it draws is the one it drew
     * the first time: the seats as they were an hour ago, before three people
     * joined. Which is the one thing a card of a party has to get right.
     *
     * An address it has not seen makes it look again. It changes nothing about
     * where the link goes, and the page passes the stamp down to the picture —
     * Discord caches that separately, by its own address, so without that the
     * fresh card would be drawn around the stale image. Same trick the member
     * page uses, for the same reason.
     */
    : `${window.location.origin}/party/${id}?v=${Date.now().toString(36)}`;

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
