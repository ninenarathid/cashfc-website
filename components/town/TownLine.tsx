"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FARMING } from "@/lib/town/farm";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { carried, takers, toWell, type Lack, type Stander } from "@/lib/town/line";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent, staminaOf } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import { atWell, fishFrom, yardPlace } from "@/lib/town/world";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import TownPouring from "./TownPouring";

export type { Stander };

/** Why not, in the line's own words. */
const WHY_LINE: Record<string, [string, string]> = {
  hand: ["ถังในมือไม่มีน้ำ", "The bucket you hold is empty"], none: ["อีกฝ่ายไม่ได้ถือถังอยู่", "They hold no bucket now"],
  full: ["ถังของอีกฝ่ายมีน้ำอยู่แล้ว", "Their bucket has water in it already"], away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town could not be reached: try again"],
  shaky: ["หมดแรง มือสั่นจนส่งไม่ถึง", "Too tired: your hands shake, and it does not get there"],
};
/** What somebody close by lacks to be handed water, said of them by name. */
const LACKS: Record<Lack, [(name: string) => string, (name: string) => string]> = {
  walking: [(n) => `${n} ต้องยืนนิ่งก่อน ถึงจะส่งน้ำให้ได้`, (n) => `${n} has to stand still to be handed water`],
  full: [(n) => `ถังของ ${n} มีน้ำอยู่แล้ว`, (n) => `${n} has a bucket with water in it already`],
  bare: [(n) => `${n} ต้องถือถังเปล่าไว้ในมือ ถึงจะส่งน้ำให้ได้`, (n) => `${n} has to hold an empty bucket to be handed water`],
};

/**
 * A bucket line (lib/town/line; the owner, 2026-10-05: "a bucket line of
 * three or more", for the members who carry water for the others, and so
 * that the town's games need several people).
 *
 * Standing still with a bucket that has water in it, when somebody stands
 * still within sight (as the path goes: across the map, or through the gate)
 * with an empty bucket in their hand: a button hands the water on to them,
 * by name. With several such there is a button for each, three at the most:
 * whoever is nearer the farm's well than I am first (the way a line goes),
 * then whoever is nearest me. It is in their bucket at once, and they hand it
 * on in their turn, or pour it where they stand. With no stamina left it is
 * poured like any water, the short game of tired hands.
 *
 * **With nobody to hand it to, whoever stands close by is named with what
 * they lack**: walking, a bucket that has water, no bucket in the hand (the
 * owner, 2026-10-05: "ทำไมใช้ยากจังเลย": until then nothing was shown unless
 * everything held, and water went only to somebody two tiles nearer the
 * well, so two friends side by side were offered nothing and could not tell
 * why; lib/town/line's `takers`).
 *
 * And the other way round: when water comes into my bucket by somebody's
 * hand, the map says so.
 *
 * What is kept is the keeper's: for a member the database's (v132); in `next
 * dev`'s test room the browser's trial, where the others are the other
 * testers of the same browser.
 */
export default function TownLine({ keeper, me, th, here, people, bottom, sfx }: {
  keeper: Keeper;
  me: string;
  th: boolean;
  /** Where I stand still (null while walking, or while something else is open). */
  here: [number, number] | null;
  /** Everybody on the map now, as the map has them. */
  people: () => Stander[];
  /** How far up from the foot of the map the button sits. */
  bottom: string;
  sfx: FishSfx | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const purse = keeper.purse(), now = keeper.now(), hand = handOf(purse);
  const can = !!here && keeper.canPass();
  // who stands where is the map's, and changes without anything of the keeper's changing: looked at twice a second while I have water to hand on
  useEffect(() => {
    if (!can) return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [can]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2800); return () => clearTimeout(t); }, [note]);
  const [busy, setBusy] = useState(false);
  /** The handing on that tired hands are at: to whom. */
  const [working, setWorking] = useState<Stander | null>(null);

  /**
   * Whoever I may hand it to (lib/town/line's `takers`), and, with nobody, who stands close by and what they lack.
   * (Where those standing about have come for something else, they are not named for holding no bucket: at the
   * well and the yard's jar, where the water in my hand has a place of its own to go, and by the water it is drawn
   * from, where the others are fishing.)
   */
  const quiet = !!here && (atWell(here[0], here[1]) || yardPlace(here[0], here[1]) === "wash" || !!fishFrom(here[0], here[1]));
  const found = can && here ? takers(me, { x: here[0] + 0.5, y: here[1] + 0.5 }, people(), quiet) : null;
  const offered = found?.offered ?? [], next = offered[0] ?? null, lacks = found?.lacks ?? null;

  const say = useCallback((why: string) => { const w = WHY_LINE[why]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);
  const hand_on = useCallback(async (to: Stander) => {
    setBusy(true);
    const did = await keeper.passTo(to.id);
    setBusy(false);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work("pour", 0.8);
    setNote(th ? `ส่งน้ำ ${did.n} ถังให้ ${to.name || "เพื่อน"} แล้ว` : `${did.n} bucketful${did.n === 1 ? "" : "s"} handed to ${to.name || "them"}`);
  }, [keeper, sfx, th, say]);
  const begin = useCallback((to: Stander | null) => {
    if (!to || busy) return;
    // (no game with stamina; with none it is poured like any water, a short round)
    if (isSpent(keeper.purse(), keeper.now())) setWorking(to); else void hand_on(to);
  }, [busy, keeper, hand_on]);
  // walking off, or whoever it was for going, leaves the work
  const stays = !!working && can && offered.some((p) => p.id === working.id);
  useEffect(() => { if (working && !stays) setWorking(null); }, [working, stays]);

  // Water that comes into the bucket I hold by somebody's hand: said once, when my purse comes to have it. (Told apart
  // from a bucket I drew myself by the stamina, which drawing costs and being handed water does not.)
  const was = useRef<{ has: number; stamina: number; hand: ItemId | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const has = carried(purse)?.has ?? 0, stamina = staminaOf(purse, now);
  useEffect(() => {
    const before = was.current;
    was.current = { has, stamina, hand };
    if (!before || before.hand !== hand || has <= before.has || before.stamina !== stamina || stamina <= 0) return;
    setToast(th ? "มีคนส่งน้ำมาให้ ถังเต็มแล้ว" : "Somebody handed you water: your bucket is full");
    sfx?.wake();
    sfx?.work("dip", 0.8);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by what the bucket holds, not by the sound's identity
  }, [has, stamina, hand, th]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4200); return () => clearTimeout(t); }, [toast]);

  // (for scripts in `next dev`: whom I would hand it to, handing it on, and what was said)
  useEffect(() => {
    const handle = {
      can: () => can, next: () => next?.id ?? null, offered: () => offered.map((p) => p.id), lacks: () => (lacks ? { who: lacks.who.id, why: lacks.why } : null),
      act: (id?: string) => begin(id ? offered.find((p) => p.id === id) ?? null : next), note: () => note, toast: () => toast, toWell: (x: number, y: number) => toWell({ x, y }),
    };
    (window as unknown as { __townLine?: typeof handle }).__townLine = handle;
    return () => { delete (window as unknown as { __townLine?: typeof handle }).__townLine; };
  });

  const icon = (hand && iconOf(hand) in ICON_ATLAS.icons ? iconOf(hand) : "bucket") as IconName;
  return (
    <>
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center px-2">
          <p className="pop-in flex items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 py-2 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-line-toast>
            <TownIcon name="bucketFull" size={20} />
            {toast}
          </p>
        </div>
      )}
      {(next || lacks || note || working) && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-line-note>{note}</p>}
          {working ? (
            <div className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game="pouring">
              <TownPouring th={th} title={th ? "ส่งถังน้ำต่อ" : "Hand the bucket on"} verb={th ? "กดค้างส่ง" : "Hold to hand on"} need={FARMING.tired} mods={{ tool: 1, spent: true, drops: true }}
                           icon={icon} taking={false} into={"bucket" as IconName}
                           onHit={(hit) => { sfx?.wake(); if (!hit) sfx?.work("knock"); }}
                           onDone={(result) => {
                             const to = working;
                             setWorking(null);
                             keeper.record({ game: "farming", at: keeper.now(), won: !result.dropped, secs: result.secs, spent: true, buff: null, what: "pour", need: result.need, hits: result.hits, misses: result.misses });
                             if (result.dropped) { say("shaky"); return; }
                             void hand_on(to);
                           }}
                           onCancel={() => setWorking(null)} />
            </div>
          ) : next ? (
            // (one for each of those it may go to, the likeliest first and named in full)
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
              {offered.map((p, i) => {
                const name = p.name || (th ? ITEMS[p.hold!].name.th : "them");
                return (
                  <button key={p.id} type="button" onClick={() => begin(p)} disabled={busy} data-line-chip={p.id} data-state="open"
                          className="pop-in pressable pointer-events-auto flex min-h-11 max-w-[22rem] items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent disabled:opacity-60">
                    <TownIcon name="lineHands" size={22} />
                    <span className="min-w-0 truncate">{i === 0 ? (th ? `ส่งน้ำต่อให้ ${name}` : `Hand it on to ${name}`) : th ? `หรือ ${name}` : `or ${name}`}</span>
                  </button>
                );
              })}
            </div>
          ) : lacks && !note && (
            // (nobody to hand it to: who stands close by, and what they lack. Nothing to press.)
            <p className="pop-in flex max-w-[22rem] items-center gap-2 rounded-full border border-line bg-bg/80 px-4 py-2 text-ui text-muted shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-line-lacks={lacks.why}>
              <TownIcon name="lineHands" size={18} className="shrink-0 opacity-60" />
              <span className="min-w-0">{LACKS[lacks.why][th ? 0 : 1](lacks.who.name || (th ? "เพื่อน" : "Your friend"))}</span>
            </p>
          )}
        </div>
      )}
    </>
  );
}
