"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import PrizeChat from "@/components/PrizeChat";
import {
  PRIZE_INVENTORY_ID, claim, myWins, type Win,
} from "@/lib/prizes";

/**
 * What somebody has won and not yet been handed. See v87.
 *
 * Beside the rare popoto shelf, and deliberately not part of it: a rare popoto
 * is complete the moment it is opened, and one of these is a promise that
 * somebody has to keep. So it is a list of things to do rather than a
 * collection — claim it, arrange it, and watch it leave when it arrives.
 *
 * Leaving is the whole design. A prize that has been handed over disappears
 * from here, which is what "delivered" should look like to the person who was
 * waiting for it. The row is still in the database and the admins can still
 * read the conversation; it is a line on a page that goes, not a fact.
 */
export function PrizeInventory() {
  const { t, lang } = useLang();
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<string | null>(null);
  const [wins, setWins] = useState<Win[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const read = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    setMe(uid);
    if (!uid) return;
    setWins(await myWins(supabase, uid));
  }, [supabase]);
  useEffect(() => { void read(); }, [read]);

  /*
   * Arriving from the notification. Same problem the rare inventory has: this
   * is far down a long page and does not exist until the wins have loaded, by
   * which time the browser has given up on the #prize-inventory in the address.
   */
  const has = wins.length > 0;
  useEffect(() => {
    if (!has || window.location.hash !== `#${PRIZE_INVENTORY_ID}`) return;
    document.getElementById(PRIZE_INVENTORY_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [has]);

  if (!me || !supabase || !wins.length) return null;

  const press = async (w: Win) => {
    if (busy || w.claimedAt) return;
    setBusy(true);
    setErr(null);
    const r = await claim(supabase, w.id);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setOpen(w.id);
    await read();
  };

  const unclaimed = wins.filter((w) => !w.claimedAt).length;

  return (
    <section id={PRIZE_INVENTORY_ID}
             className="mt-3 scroll-mt-24 rounded-xl border border-line bg-surface p-4">
      <div className="font-display font-semibold">
        {t("prize.inventory")} · {wins.length}
      </div>
      <p className="mt-1 text-ui leading-relaxed text-muted">
        {unclaimed ? t("prize.inventoryNew", { n: unclaimed }) : t("prize.inventoryHint")}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {wins.map((w) => {
          const name = (lang === "en" ? w.nameEn : null) || w.name;
          const detail = (lang === "en" ? w.detailEn : null) || w.detail;
          const showing = open === w.id;
          return (
            <div key={w.id} className="rounded-xl border p-3"
                 style={{ borderColor: `${w.color}66`, background: `${w.color}0d` }}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg/50">
                  {w.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={w.icon} alt="" className="size-12 object-contain" />
                    : <span className="text-2xl">🎁</span>}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-title font-semibold leading-snug"
                        style={{ color: w.color }}>
                    {name}
                  </span>
                  {detail && (
                    <span className="text-read leading-relaxed text-ink/80">{detail}</span>
                  )}
                  <span className="text-meta text-muted">
                    {t("prize.wonOn", { when: fmtDate(w.at) })}
                    {w.claimedAt && ` · ${t("prize.claimedOn", { when: fmtDate(w.claimedAt) })}`}
                  </span>
                </div>
                {w.claimedAt ? (
                  <button type="button" onClick={() => setOpen(showing ? null : w.id)}
                          className="rounded-lg border border-line px-3 py-1.5 text-read text-muted hover:border-accent hover:text-accent">
                    {showing ? t("prize.hideChat") : t("prize.openChat")}
                  </button>
                ) : (
                  <button type="button" onClick={() => void press(w)} disabled={busy}
                          className="rounded-lg border border-jade/60 bg-jade/15 px-3.5 py-1.5 text-lead font-medium text-jade hover:bg-jade/25 disabled:opacity-40">
                    {t("prize.claim")}
                  </button>
                )}
              </div>

              {/* The conversation only once it has been claimed: before that
                  there is nothing to arrange, and an empty box under an
                  unclaimed prize only asks a question nobody has yet. */}
              {w.claimedAt && showing && (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="mb-2 text-ui leading-relaxed text-muted">
                    {t("prize.chatHint")}
                  </p>
                  <PrizeChat supabase={supabase} winId={w.id} me={me} winner={w.winner}
                             closed={!!w.deliveredAt} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {err && <p className="mt-2 text-ui text-chili">{err}</p>}
    </section>
  );
}

export default PrizeInventory;
