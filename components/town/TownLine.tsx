"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FARMING, WATER } from "@/lib/town/farm";
import { readTold, type Told } from "@/lib/town/handing";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import { carried, inReach, takers, toWell, type Lack, type Stander } from "@/lib/town/line";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent, staminaOf } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import { atWell, fishFrom, yardPlace } from "@/lib/town/world";
import TownHanding, { newOtherHand, type HandingResult, type OtherHand } from "./TownHanding";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import TownPouring from "./TownPouring";

export type { Stander };

/** The room's way for two people to tell each other of a game they play together (lib/town/session's `pair`): into one letterbox, never the room. */
export interface Pairing { send: (to: string, told: Told) => void; hear: (fn: ((from: string, data: unknown) => void) | null) => void }

/**
 * A handing-over that is a game (somebody has no stamina), as this page has it: which one, whether I throw
 * (`from`) or take (`to`), who the other is and what they hold, whether they have answered yet, whose hands are
 * tired, the seed the two share, and whether it is settled already (its board still up for a blink, saying how it
 * went).
 */
interface Match {
  id: string; role: "from" | "to"; who: { id: string; name: string; hold: ItemId | null }; phase: "asking" | "playing";
  tired: { from: boolean; to: boolean }; seed: number; over?: boolean;
}
/** How long an answer is waited for (it comes in a fifth of a second). None by then: a page built before this was a game, and the water goes over as it always did. */
const ASK_MS = 2000;
/** How long somebody whose handing-over I gave up is not answered yes again: a board is not to come up over and over on a page that does not want it. */
const SHY_MS = 8000;
/** A bucket's picture, with water in it or without. */
const pic = (item: ItemId | null, full: boolean): IconName => {
  const base = item && iconOf(item) in ICON_ATLAS.icons ? iconOf(item) : "bucket", filled = `${base}Full`;
  return (full && filled in ICON_ATLAS.icons ? filled : base) as IconName;
};

/** Why not, in the line's own words. */
const WHY_LINE: Record<string, [string, string]> = {
  hand: ["ถังในมือไม่มีน้ำ", "The bucket you hold is empty"], none: ["อีกฝ่ายไม่ได้ถือถังอยู่", "They hold no bucket now"],
  full: ["ถังของอีกฝ่ายมีน้ำอยู่แล้ว", "Their bucket has water in it already"], away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town could not be reached: try again"],
  shaky: ["หมดแรง มือสั่นจนส่งไม่ถึง", "Too tired: your hands shake, and it does not get there"],
  spilt: ["รับน้ำไม่ทัน ยังไม่ได้ส่ง ลองอีกครั้ง", "It was not caught: nothing was handed on. Try again"],
  notReady: ["อีกฝ่ายยังไม่พร้อมรับน้ำ", "They are not ready to take it"], elsewhere: ["อีกฝ่ายไม่ได้ดูแผนที่อยู่", "They are not looking at the map"],
  left: ["อีกฝ่ายเลิกกลางคัน", "They stopped"],
};
/** Why the other said no, in those words. */
const NO = { busy: "notReady", away: "elsewhere", bare: "none", full: "full" } as const;
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
 * then whoever is nearest me. **With stamina on both sides it is in their
 * bucket at once**, and they hand it on in their turn, or pour it where they
 * stand. **With none on either side it is a game the two play together**
 * (lib/town/handing, TownHanding; the owner, 2026-10-06): the button puts a
 * board up and asks the other's page, where one comes up by itself; whoever
 * takes the water presses ready, whoever has it presses throw, and whoever
 * takes it presses the side it flies to. Each board says what to press, step
 * by step. Caught, it is in their bucket.
 *
 * The two pages talk through the room's letterboxes (`pair`). Where the
 * other is not there to play (another page of the site; a page built before
 * this, which does not answer) the water goes over as it did before there was
 * a game: by the short pour of tired hands, or at once.
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
export default function TownLine({ keeper, me, th, here, people, bottom, sfx, pair = null, art }: {
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
  /** How this page and another tell each other of a handing-over (null: nobody to tell, and water goes over as it did). */
  pair?: Pairing | null;
  /** The town's scenery, for the game's own scene. */
  art?: (name: string) => Sprite | null;
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
  const hand_on = useCallback(async (to: { id: string; name: string }) => {
    setBusy(true);
    const did = await keeper.passTo(to.id);
    setBusy(false);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work("pour", 0.8);
    setNote(th ? `ส่งน้ำ ${did.n} ถังให้ ${to.name || "เพื่อน"} แล้ว` : `${did.n} bucketful${did.n === 1 ? "" : "s"} handed to ${to.name || "them"}`);
  }, [keeper, sfx, th, say]);
  /** Handed on as it was before it was a game for two: at once, or, with no stamina, by the short pour of tired hands. */
  const alone = useCallback((to: Stander) => {
    if (isSpent(keeper.purse(), keeper.now())) setWorking(to); else void hand_on(to);
  }, [keeper, hand_on]);

  // ── the game for two (lib/town/handing) ──
  const [match, setMatch] = useState<Match | null>(null);
  const matchRef = useRef<Match | null>(null), other = useRef<OtherHand>(newOtherHand()), asking = useRef<ReturnType<typeof setTimeout> | null>(null);
  const put = useCallback((m: Match | null) => {
    if (asking.current && m?.phase !== "asking") { clearTimeout(asking.current); asking.current = null; }
    matchRef.current = m;
    setMatch(m);
  }, []);
  // (what hearing another page's word needs to know of this one, as it stands now)
  const hereRef = useRef(here), idle = useRef(true);
  /** Whose handing-over I gave up, and until when they are not answered yes again. */
  const shy = useRef(new Map<string, number>());
  /** (for scripts in `next dev`: a page that asks nobody, as one built before this was a game does) */
  const mute = useRef(false);
  useEffect(() => { hereRef.current = here; idle.current = !busy && !working; });

  const begin = useCallback((to: Stander | null) => {
    if (!to || busy || working || matchRef.current) return;
    const tired = isSpent(keeper.purse(), keeper.now());
    // With stamina on both sides there is no game: the water is in the other's bucket at once, as it always was.
    // (Whether the other has any is what the room says of them; a page built before it was told says nothing, and
    // is taken to have some.)
    if (!tired && to.spent !== true) { void hand_on(to); return; }
    // Somebody has none: the game for two, where the other is there to play it; where not (another page of the
    // site, nobody to tell), as it was before there was one.
    if (!pair || to.away) { alone(to); return; }
    const id = Math.random().toString(36).slice(2, 10).padEnd(8, "0"), seed = Math.floor(Math.random() * 2 ** 31);
    other.current = newOtherHand();
    put({ id, role: "from", who: { id: to.id, name: to.name, hold: to.hold }, phase: "asking", tired: { from: tired, to: to.spent === true }, seed });
    if (!mute.current) pair.send(to.id, { k: "ask", m: id, s: tired, z: seed });
    asking.current = setTimeout(() => {
      asking.current = null;
      const m = matchRef.current;
      if (!m || m.id !== id || m.phase !== "asking") return;
      put(null);
      alone(to);
    }, ASK_MS);
  }, [busy, working, pair, keeper, alone, hand_on, put]);

  /** What another page said of a handing-over: asked to take water, or a word of the one that is on. */
  const heard = useCallback((from: string, raw: unknown) => {
    const told = readTold(raw);
    if (!told || !pair) return;
    const m = matchRef.current;
    if (told.k === "ask") {
      // (only from somebody the room has, with a bucket in their hand)
      const who = people().find((p) => p.id === from), at = hereRef.current, purse = keeper.purse(), hand = handOf(purse);
      if (!who || !who.hold || !(who.hold in WATER.buckets)) return;
      const no = (w: keyof typeof NO) => pair.send(from, { k: "no", m: told.m, w });
      if (m || !idle.current || !at || !inReach({ x: at[0] + 0.5, y: at[1] + 0.5 }, who) || (shy.current.get(from) ?? 0) > performance.now()) return no("busy");
      if (!hand || !(hand in WATER.buckets)) return no("bare");
      if (carried(purse)) return no("full");
      // yes: a board comes up here, and nothing is thrown until I say I am ready
      const tired = isSpent(purse, keeper.now());
      other.current = newOtherHand();
      put({ id: told.m, role: "to", who: { id: from, name: who.name, hold: who.hold }, phase: "playing", tired: { from: told.s, to: tired }, seed: told.z });
      pair.send(from, { k: "ok", m: told.m, s: tired });
      return;
    }
    if (!m || m.id !== told.m || m.who.id !== from) {
      // (a yes that comes after I have stopped waiting for it: their board is up for nothing, and is told so)
      if (told.k === "ok") pair.send(from, { k: "bye", m: told.m });
      return;
    }
    if (m.over) return;
    const o = other.current;
    if (told.k === "ok") { if (m.role === "from" && m.phase === "asking") put({ ...m, phase: "playing", tired: { ...m.tired, to: told.s } }); }
    else if (told.k === "no") {
      if (m.role !== "from" || m.phase !== "asking") return;
      put(null);
      // (looking at another page: nobody there to play it with, and the water goes over as it did before there was a game)
      if (told.w === "away") { const to = people().find((p) => p.id === from); if (to) alone(to); else say(NO.away); }
      else say(NO[told.w]);
    }
    else if (told.k === "r") { if (m.role === "from") o.ready = true; }
    else if (told.k === "p") { if (m.role === "from") o.put = told.d; }
    else if (told.k === "th") { if (m.role === "to" && o.thrown === null) o.thrown = performance.now(); }
    else if (told.k === "end") { if (m.role === "from") o.verdict = told.c; }
    else if (told.k === "bye") { put(null); say("left"); }
  }, [pair, people, keeper, put, say, alone]);
  useEffect(() => { if (!pair) return; pair.hear(heard); return () => pair.hear(null); }, [pair, heard]);

  /** Giving it up: the other is told (and, having taken no water from them, I am not asked again at once). */
  const stop = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    // (one that is settled already is only shut)
    if (!m.over) {
      pair?.send(m.who.id, { k: "bye", m: m.id });
      if (m.role === "to") shy.current.set(m.who.id, performance.now() + SHY_MS);
    }
    put(null);
  }, [pair, put]);
  // walking off, or something else opening, leaves it; and so does leaving the town
  useEffect(() => { if (match && !here) stop(); }, [match, here, stop]);
  useEffect(() => () => {
    const m = matchRef.current;
    if (m && !m.over) pair?.send(m.who.id, { k: "bye", m: m.id });
    if (asking.current) clearTimeout(asking.current);
  }, [pair]);

  /**
   * Settled: caught, whoever threw it hands the water on at that moment (whoever took it is told by the keeper, as
   * ever). The board is up a blink longer, and shut by itself (`shut`).
   */
  const played = useCallback((r: HandingResult) => {
    const m = matchRef.current;
    if (!m || m.over) return;
    put({ ...m, over: true });
    const mine = m.role === "from";
    keeper.record({ game: "farming", at: keeper.now(), won: r.won, secs: r.secs, spent: mine ? m.tired.from : m.tired.to, buff: null, what: mine ? "hand" : "take", need: 1, hits: r.won ? 1 : 0, misses: r.won ? 0 : 1 });
    if (!r.won) { say("spilt"); return; }
    if (mine) void hand_on(m.who);
  }, [keeper, put, say, hand_on]);
  const shut = useCallback(() => { if (matchRef.current?.over) put(null); }, [put]);
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
      match: () => (match ? { role: match.role, phase: match.phase, with: match.who.id, tired: match.tired } : null),
      ...(process.env.NODE_ENV === "production" ? {} : { mute: (on = true) => { mute.current = on; } }),
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
      {(next || lacks || note || working || match) && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-line-note>{note}</p>}
          {match ? (
            // (the game for two, where somebody has no stamina: my bucket and theirs on one board, which says step by
            // step what to press. Whoever asks has it from the button, before the other has answered.)
            <div className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game="handing">
              <TownHanding key={match.id} th={th} role={match.role} m={match.id} waiting={match.phase === "asking"} seed={match.seed} tired={match.tired} other={other} sfx={sfx} scene={art?.("gameHanding") ?? null}
                           names={match.role === "from" ? { from: "", to: match.who.name } : { from: match.who.name, to: "" }}
                           icons={match.role === "from"
                             ? { from: pic(hand, true), fromEmpty: pic(hand, false), to: pic(match.who.hold, false), toFull: pic(match.who.hold, true) }
                             : { from: pic(match.who.hold, true), fromEmpty: pic(match.who.hold, false), to: pic(hand, false), toFull: pic(hand, true) }}
                           tell={(told) => pair?.send(match.who.id, told)} onDone={played} onClose={shut} onCancel={stop} />
            </div>
          ) : working ? (
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
