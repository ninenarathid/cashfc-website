"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import PrizeChat from "@/components/PrizeChat";
import { TierBadge } from "@/components/PopotoRare";
import { TIER_FX, TIER_LOOK, type RareTier } from "@/lib/popoto-rare";
import {
  PRIZE_INVENTORY_ID, claim, markRead, myWins, type Win,
} from "@/lib/prizes";

/**
 * The fanfare a prize arrives with, scaled to a card.
 *
 * The rare popoto's, not a second one: the same TIER_FX numbers and the same
 * keyframes out of globals.css, so R, SR and UR mean the same amount of noise
 * whichever of the two things is making it. What is different is where it
 * happens — a popoto takes over the screen because it is a thing you open,
 * and a prize is a row in a list you came to on purpose, so it stays inside
 * its own card and lets the rest of the page alone.
 */
function Fanfare({ tier, hue }: { tier: RareTier; hue: string }) {
  const fx = TIER_FX[tier];
  const look = TIER_LOOK[tier];
  const ultra = tier === "ultra";

  const stars = useMemo(() => Array.from({ length: fx.stars }, (_, i) => {
    const a = i * 2.39996;            // the golden angle, so they never line up
    const r = 30 + ((i * 37) % 100) / 100 * 45;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.5,
             size: 6 + (i % 4) * 4, delay: (i * 173) % 1600, light: i % 2 === 0 };
  }), [fx.stars]);

  const crumbs = useMemo(() => Array.from({ length: look.crumbs }, (_, i) => {
    const a = (i / look.crumbs) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
    const r = (40 + (i % 4) * 18) * fx.reach;
    return { dx: `${Math.cos(a) * r}px`, dy: `${Math.sin(a) * r * 0.6}px`,
             size: (4 + (i % 3) * 2) * (ultra ? 1.4 : 1), light: i % 3 === 0,
             delay: (i % 5) * 40 };
  }), [look.crumbs, fx.reach, ultra]);

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <span className="rare-flash absolute inset-0"
            style={{ ["--flash" as string]: fx.flash,
                     background: `radial-gradient(circle at 12% 50%, #fff 0%, ${hue} 60%, transparent 100%)` }} />
      <span className={`rare-aura absolute inset-0 ${ultra ? "rare-ultra-glow" : ""}`}
            style={{ ["--aura" as string]: fx.aura,
                     background: `radial-gradient(circle at 12% 50%, ${hue} 0%, ${hue}55 30%, transparent 70%)` }} />
      {/* Everything below is pinned to the icon on the left, which is the
          thing that was won — the middle of the card is its name. */}
      <span className="absolute left-[2.1rem] top-1/2">
        <span className={`${"rare-rays"} absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full ${ultra ? "rare-ultra-glow" : ""}`}
              style={{
                width: `min(${fx.raySize / 2.4}px, 60vw)`, height: `min(${fx.raySize / 2.4}px, 60vw)`,
                ["--rays-o" as string]: ultra ? 1 : tier === "super" ? .85 : .6,
                ["--rays-speed" as string]: ultra ? "14s" : tier === "super" ? "20s" : "28s",
                background: `repeating-conic-gradient(from 0deg, transparent 0deg ${360 / fx.rays / 2}deg, ${
                  ultra ? "rgba(255,255,255,.9)" : `${hue}cc`} ${360 / fx.rays / 2}deg ${360 / fx.rays}deg)`,
                WebkitMaskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,.5) 35%, transparent 70%)",
                maskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,.5) 35%, transparent 70%)",
              }} />
        {Array.from({ length: fx.rings }, (_, i) => (
          <span key={`ring${i}`}
                className="rare-ring absolute left-0 top-0 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ borderColor: i % 2 && ultra ? "#fff" : hue,
                         boxShadow: `0 0 14px ${hue}, inset 0 0 10px ${hue}`,
                         animationDelay: `${120 + i * 150}ms`,
                         ["--ring-scale" as string]: 2 + fx.reach * 1.6 + i * .6 }} />
        ))}
        {crumbs.map((c, i) => (
          <span key={`c${i}`} className="rare-burst absolute left-0 top-0 rounded-full"
                style={{ width: c.size, height: c.size,
                         background: c.light ? "#fff4d6" : ultra ? `hsl(${(i * 47) % 360} 95% 65%)` : hue,
                         boxShadow: `0 0 ${c.size}px ${c.light ? "#fff" : hue}`,
                         animationDelay: `${160 + c.delay}ms`,
                         ["--dx" as string]: c.dx, ["--dy" as string]: c.dy }} />
        ))}
        {stars.map((st, i) => (
          <span key={`s${i}`} className="rare-twinkle absolute left-0 top-0"
                style={{ transform: `translate(${st.x}px, ${st.y}px)`,
                         width: st.size, height: st.size,
                         animationDelay: `${st.delay}ms`,
                         background: st.light ? "#fff" : hue,
                         clipPath: "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)" }} />
        ))}
      </span>
    </span>
  );
}

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
                    : <span className="text-2xl">🎁</span>}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <TierBadge tier={w.tier} small />
                    <span className="text-title font-semibold leading-snug"
                          style={{ color: hue }}>
                      {name}
                    </span>
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
