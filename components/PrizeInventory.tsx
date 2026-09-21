"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import PrizeChat from "@/components/PrizeChat";
import { TierBadge } from "@/components/PopotoRare";
import { TIER_FX, TIER_LOOK } from "@/lib/popoto-rare";
import Fanfare from "@/components/PrizeFanfare";
import {
  PRIZE_INVENTORY_ID, claim, markRead, myWins, type Win,
} from "@/lib/prizes";
import { fmtGil } from "@/lib/wallet";

/**
 * What somebody has won and not yet been handed. See v87 and v88.
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
  /** Which cards are playing their fanfare right now. */
  const [playing, setPlaying] = useState<Set<number>>(new Set());
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
   * A prize plays its fanfare the first time its owner lays eyes on it, and
   * then never again by itself — seen_winner is the record of that, so it
   * survives a reload rather than going off every time the page is opened.
   * Pressing the picture plays it again on purpose, which is what somebody
   * who wants to see it again will try.
   */
  const unseen = wins.filter((w) => !w.seenWinner).map((w) => w.id).join(",");
  useEffect(() => {
    if (!unseen || !supabase) return;
    const ids = unseen.split(",").map(Number);
    setPlaying(new Set(ids));
    for (const id of ids) void markRead(supabase, id);
    const stop = setTimeout(() => setPlaying(new Set()), 2600);
    return () => clearTimeout(stop);
  }, [unseen, supabase]);

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

  const replay = (id: number) => {
    setPlaying((v) => new Set(v).add(id));
    setTimeout(() => setPlaying((v) => {
      const next = new Set(v);
      next.delete(id);
      return next;
    }), 2600);
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
          /*
           * A wallet cashed out (v91). It is a prize like any other from here
           * on — claimed, arranged, handed over — and it is drawn differently
           * for the one thing that is different about it: what it is worth is
           * a figure and not a name, so the figure is the line. It wears no
           * tier either. R, SR and UR say how lucky somebody got, and nobody
           * got lucky pressing a button on money they had already earned.
           */
          const gil = w.gilAmount;
          const showing = open === w.id;
          const look = TIER_LOOK[w.tier];
          const fx = TIER_FX[w.tier];
          const hue = w.color || look.color;
          const lit = playing.has(w.id);
          return (
            <div key={w.id}
                 className={`relative rounded-xl border-2 p-3 ${
                   lit && fx.shake ? `rare-shake-${fx.shake}` : ""}`}
                 style={{ borderColor: `${look.color}80`, background: `${hue}0d`,
                          boxShadow: `inset 0 0 ${w.tier === "ultra" ? 40 : w.tier === "super" ? 22 : 10}px ${hue}22` }}>
              {lit && <Fanfare tier={w.tier} hue={hue} />}
              <div className="relative flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => replay(w.id)}
                        title={name}
                        className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-bg/50 transition-transform hover:scale-105">
                  {w.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={w.icon} alt="" className="size-12 object-contain" />
                    : <span className="text-2xl">{gil != null ? "💰" : "🎁"}</span>}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    {gil == null && <TierBadge tier={w.tier} small />}
                    <span className="text-title font-semibold leading-snug"
                          style={{ color: hue }}>
                      {gil != null ? `${fmtGil(gil)} gil` : name}
                    </span>
                    {gil != null && <span className="text-read text-muted">{name}</span>}
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
                <div className="relative mt-3 border-t border-line pt-3">
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
