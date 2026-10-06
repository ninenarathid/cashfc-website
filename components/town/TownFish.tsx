"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Shade } from "@/lib/town/fountain";
import { BAITS, BUFFS, FISH, ITEMS, type BaitId, type CatchId, type FishId, type ItemId } from "@/lib/town/items";
import { PAIR, REST, STEPS, oddsOf, seesOdds, settling, startFight, startPair, stepFight, stepPair, strikeOf, strikeWindow, surging, warning, type Fight, type Mend, type Pair, type Strike } from "@/lib/town/fishing";
import { gearOf, type Gear } from "@/lib/town/gear";
import { PACE, paced } from "@/lib/town/pace";
import type { FishingEnd, FishingPlay } from "@/lib/town/plays";
import { measure, type FishSfx, type FishSound } from "@/lib/town/sfx";
import { charmBy, numberOf, usesLeft, works } from "@/lib/town/gifts";
import { buffOf, buffsOf, isSpent, levelOf, staminaOf } from "@/lib/town/stamina";
import { handOf, held, roomFor } from "@/lib/town/trade";
import type { CastHow, Hooked, Keeper } from "@/lib/town/keeper";
import type { Fishing } from "@/lib/town/world";
import { BIG, PixelGround, STAGE } from "./TownGame";
import { AT_THE_LINE, BuffAura, Twinkle } from "./TownBuffFx";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon, WHY } from "./TownTrade";

/** What my line is doing, for the map to draw: waiting, twitching at a nibble, pulled under by a bite, or tight with a fish on. */
export type LineState = "wait" | "nibble" | "bite" | "fight";
/** A place to fish from: the tile stood on, where its float lands, and whether that is deep water (the deck's) or the shallows (the bank's). */
export type FishPlace = Fishing & { tile: [number, number] };

/** The length of the whispering float's ring (a circle of radius 28), which runs down to the bite. */
const COUNT_ROUND = 2 * Math.PI * 28;
/** How the shade of what is on its way looks under clear water: the rarer, the brighter. */
const SHADE_LOOK: Record<Shade, string> = {
  common: "none", uncommon: "brightness(1.6) saturate(1.4)", rare: "brightness(2.2) saturate(2) hue-rotate(60deg)",
  legend: "brightness(3) saturate(2.4) hue-rotate(190deg) drop-shadow(0 0 4px #ffe07a)", other: "grayscale(1) brightness(0.9)",
};

type Phase =
  | { at: "ready" }
  /** The line is on its way out, or the strike on its way in: nothing to press until the keeper has answered. */
  | { at: "casting" }
  /** (`shade`: under the fountain's clear water, how rare a thing is on its way; never which) */
  /** (`coming`: what is on its way, for whoever wears the whispering float: a fish landed before is shown as itself, another as a shade of its tier) */
  /** (`pair`: two lines are out, on a rod of two lines; `coming2`: what is on its way to the second, told as the first's is) */
  | { at: "waiting"; wait: number; nibbles: number[]; from: number; shade?: Shade; coming?: CatchId; pair?: boolean; coming2?: CatchId }
  | { at: "striking" }
  | { at: "fight"; fish: FishId; size: number; strike: Strike; reaction: number }
  /** Two fish on a rod of two lines, fought at once (lib/town/fishing's `Pair`). */
  | { at: "fight2"; fish: [FishId, FishId]; sizes: [number, number]; strike: Strike; reaction: number }
  /** The otter is driving a fish that got away back to the hook (lib/town/fishing's `driveBack`): a moment's show, then it is fought once more. */
  | { at: "driven"; fish: FishId; size: number; reaction: number; how: "snapped" | "slipped"; from: number }
  /** (`from`: when it was shown, by the page's own clock: nothing goes on from it for a moment) */
  /** (`also`: what the other line of a rod of two lines came to, shown beside it) */
  | ({ at: "result"; from: number; also?: Outcome } & Outcome);
/** What one line came to: how, and what was on it. */
interface Outcome { how: "landed" | "snapped" | "slipped" | "early" | "missed"; what?: CatchId; size?: number; kept?: boolean; record?: boolean; back?: boolean }
type Ended = Outcome & { also?: Outcome };

/** The two fish of a rod of two lines, each in its own colour: its stretch on the gauge, the glow about it in the water, and its line's bar. */
const PAIR_LOOK = [
  { band: "border-[#d6ffe0] bg-[#5cc58d]/60", glow: "drop-shadow(0 0 3px #7dffb4) drop-shadow(0 0 1px #7dffb4)", bar: "bg-[#5cc58d]" },
  { band: "border-[#ffd9ee] bg-[#e06aa8]/60", glow: "drop-shadow(0 0 3px #ff9ed2) drop-shadow(0 0 1px #ff9ed2)", bar: "bg-[#e06aa8]" },
] as const;
/** How long a nibble's twitch shows, in seconds. */
const NIBBLE = 0.55;
/** How long the otter is watched driving a fish back before it is fought again, in seconds. */
const DRIVEN = 1.7;
const HOUR = 3_600_000;
const bangkokHour = (now: number) => Math.floor((((now + 7 * HOUR) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) / HOUR);

/**
 * Fishing (the owner, 2026-10-03: "ช่วยสร้าง mini game ตกปลาใน dev ที่พร้อมเล่นให้ดู
 * หน่อย"). The rules are lib/town/fishing's: choose a bait and drop the line;
 * watch the float, which twitches at a nibble and goes under at the bite;
 * strike within moments of the bite (never at a nibble); then fight the fish
 * with one button, held to reel and let go to give line, keeping the needle in
 * the safe stretch, which moves as the fish does, until the line is all in.
 *
 * Nothing here explains how any of it works (the owner: "ส่วนใหญ่ผมอยากให้ ผู้เล่น
 * หาข้อมูลกันเอาเอง"): when to strike, what no stamina does, what a place's
 * water holds. The panel shows what is happening and says why a go failed.
 * What a bait may bring is not told ("hide feature นี้ไปก่อน เราจะเปิดทีหลังเฉพาะบาง
 * คน"), and only the baits in the bag are offered ("อยากให้ผู้เล่นค้นพบเอาเองว่า อะไรใช้
 * ตกปลาได้บ้าง"): what can go on a hook is for the players to find out.
 *
 * The hand rests twice (lib/town/fishing's `REST`; the members, 2026-10-06, who fight by hammering the space bar and
 * found it going on to drop the next line and strike it at once, a bait gone each time): a line that has only just
 * gone out takes no strike, and what a go came to is left neither at once nor by the space bar at all: by Enter, or
 * a click, a moment after it shows.
 *
 * It has its own sounds (lib/town/sfx: "ช่วย gen sound effect ตอนตกปลา ให้ด้วย"), made
 * in code like the town's music, with a button to turn them off.
 *
 * What is kept (the bait used, the stamina spent, the fish landed, the longest
 * of each, and a line for every go, whatever its end) is the keeper's
 * (lib/town/keeper), like the stall's. For a member that is the database:
 * what takes the bait is decided there when the line is dropped and told only
 * at the strike, which its own clock judges, and a fight is believed only
 * when it lasted as long as one could. In `next dev`'s test room it is the
 * browser's trial, which plays the same part.
 */
export default function TownFish({ me, keeper, th, rain, place, reduced, sfx, onClose, onLine, onLanded }: {
  me: string;
  keeper: Keeper;
  th: boolean;
  /** Whether it is raining in town: some fish come out in it. */
  rain: boolean;
  /** Where I stand: the deck's deep water, or the bank's shallows. */
  place: FishPlace;
  reduced: boolean;
  /** The town's own maker of fishing sounds: mine are made here, other people's on the map. */
  sfx: FishSfx;
  onClose: () => void;
  /** Told what my line is doing, and null when it is out of the water (the rod still in my hand). */
  onLine: (state: LineState | null) => void;
  /** Told when something is landed, for the room to hear of it. */
  onLanded: () => void;
}) {
  // (the trial's own kit and short wait, in a branch a production build drops)
  const trial = process.env.NODE_ENV !== "production" ? keeper.trial : null;
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const [phase, setPhase] = useState<Phase>({ at: "ready" });
  /** A go has ended: what it came to is shown, from now. */
  const end = useCallback((it: Ended) => setPhase({ at: "result", from: performance.now(), ...it }), []);
  const [bait, setBait] = useState<BaitId>("worm");
  const [note, setNote] = useState<string | null>(null);
  /** In the trial, the wait can be cut to a fifth, to try the fight without the fishing. */
  const [quick, setQuick] = useState(false);
  // The sounds: the line through the air, the float's plop, a nibble, the bite, the reel's ticking, and how it ends.
  const [sound, setSound] = useState(() => sfx.on);

  const now = keeper.now(), purse = keeper.purse(), hour = bangkokHour(now);
  const stamina = Math.round(staminaOf(purse, now)), spent = isSpent(purse, now);
  // (every buff I have: a meal's, and the fountain's blessings)
  const buffs = buffsOf(purse, now), keen = levelOf(purse, now, "keen"), lucky = levelOf(purse, now, "lucky");
  const have = (b: BaitId) => held(purse.bag, b);
  /** What I fish with: the rod in my hand, and the best of each kind of tackle in my bag (lib/town/gear). */
  const gear = gearOf(purse.bag, handOf(purse));
  /** The trial hands out a rod and worms for the asking (the owner: "ช่วย Add คันเบ็ดให้ผมหน่อย เฉพาะใน DEV"): as much of them as the bag has room for. */
  const kit = () => {
    if (!trial) return;
    if (!gearOf(trial.purse().bag, null).rod) trial.grant("rod", 1);
    trial.grant("worm", 10);
    const got = trial.purse().bag;
    setNote(gearOf(got, null).rod && held(got, "worm") ? null : (th ? "กระเป๋าเต็ม ใส่ไม่ครบ ลองฝากขายหรือทิ้งของก่อน" : "Your bag is full: not all of it fitted. Sell or drop something first."));
  };
  const kitButton = (words: [string, string]) => (
    <button type="button" onClick={kit}
            className="pressable mt-2 flex min-h-11 items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-4 text-ui text-[#fff6e3] hover:border-gold">
      <span className="rounded-full bg-gold/20 px-1.5 py-0.5 font-data text-label uppercase tracking-wider text-[#ffe19a]">{th ? "โหมดลอง" : "Trial"}</span>
      {th ? words[0] : words[1]}
    </button>
  );
  // Only what is in the bag and goes on a hook is offered: what else might is for the players to find out.
  const baits = BAITS.filter((b) => have(b) > 0);
  // the bait in hand: the one chosen, or the first there is any of
  const inHand = have(bait) ? bait : baits[0] ?? bait;
  const shown = seesOdds(me);
  const odds = useMemo(() => (shown ? oddsOf(inHand, hour, rain, lucky, !place.deep).sort((a, b) => b.p - a.p) : []), [shown, inHand, hour, rain, lucky, place.deep]);

  // Tell the map what my line is doing.
  const line = useRef<LineState | null>(null);
  const show = useCallback((s: LineState | null) => { if (line.current !== s) { line.current = s; onLine(s); } }, [onLine]);

  /* ── every go is written down, whatever its end (lib/town/plays) ── */
  /** The line that is out: what was dropped, and where and when; and, once it is known (at the strike, or when the go ends), what took the bait. */
  const out = useRef<{ bait: BaitId; hour: number; rain: boolean; gear: Gear; wait: number; nibbles: number; what?: CatchId; size?: number } | null>(null);
  /** Whether a line of mine is in the water as far as the keeper knows: one left there when the rod is put away is pulled up. */
  const afloat = useRef(false);
  /** The fight that is on: how it began, and what the hand has done so far. */
  const bout = useRef<{ seed: number; holds: number[]; steps: number; inside: number; secs: number; strike: Strike; reaction: number } | null>(null);
  /** (`last`: nothing more is on this line. Of a rod of two lines each of the two is written down as a go of its own, and only the second ends the line.) */
  const write = useCallback((how: FishingEnd, more: { reaction?: number | null; strike?: Strike | null; kept?: boolean; record?: boolean; what?: CatchId; size?: number } = {}, last = true) => {
    const o = out.current, b = bout.current;
    if (last) { out.current = null; bout.current = null; }
    // (the database writes every go down itself, as it ends: this log is the trial's, which knows what took the bait)
    const what = more.what ?? o?.what;
    if (!o || !keeper.trial || !what) return;
    const t = keeper.now(), p = keeper.purse();
    const play: FishingPlay = {
      game: "fishing", at: t, won: how === "landed", secs: b ? Math.round(b.secs * 10) / 10 : 0, spent: isSpent(p, t), buff: buffOf(p, t),
      how, place: place.deep ? "deck" : "bank", tile: place.tile, bait: o.bait, hour: o.hour, rain: o.rain,
      what, size: more.size ?? o.size ?? 0, wait: o.wait, nibbles: o.nibbles, gear: o.gear,
      reaction: b ? b.reaction : more.reaction ?? null, strike: b ? b.strike : more.strike ?? null,
      fight: b ? { seed: b.seed, holds: b.holds, steps: b.steps, inBand: b.steps ? Math.round((b.inside / b.steps) * 1000) / 1000 : 0 } : null,
      kept: more.kept ?? false, record: more.record ?? false,
    };
    keeper.record(play);
  }, [keeper, place]);
  // The rod put away with the line still out (the panel closed, or walking off): that go ended there, and the line is
  // pulled up.
  const leaving = useRef(write);
  useEffect(() => { leaving.current = write; }, [write]);
  useEffect(() => () => {
    if (!afloat.current) return;
    afloat.current = false;
    void keeper.land("left", null).then(() => leaving.current("left"));
  }, [keeper]);

  /** What the other line of a rod of two lines has come to already in this go: shown beside what the last comes to. */
  const extra = useRef<Outcome | null>(null);

  /* ── dropping the line, and waiting ── */
  /** (`how`: "pair", both lines of a rod of two lines, for two of the bait: lib/town/fishing's `PAIR`) */
  const drop = async (how?: CastHow) => {
    if (!gear.rod || !baits.length || afloat.current) return;
    if (how === "pair" && have(inHand) < PAIR.lines) return;
    setNote(null);
    sfx.wake();
    sfx.play("cast");
    afloat.current = true;
    extra.current = null;
    setPhase({ at: "casting" });
    // (how long until the bite, and when the float twitches first: never what is on its way)
    const cast = await keeper.cast(inHand, place, rain, quick, how);
    if (!cast.ok) {
      afloat.current = false;
      const w = WHY[cast.why as keyof typeof WHY] ?? WHY.none;
      setNote(th ? w[0] : w[1]);
      setPhase({ at: "ready" });
      return;
    }
    out.current = { bait: inHand, hour, rain, gear, wait: cast.wait, nibbles: cast.nibbles.length };
    setPhase({ at: "waiting", wait: cast.wait, nibbles: cast.nibbles, from: performance.now() - cast.lag * 1000, ...(cast.shade ? { shade: cast.shade } : {}), ...(cast.coming ? { coming: cast.coming } : {}),
      ...(cast.pair ? { pair: true } : {}), ...(cast.coming2 ? { coming2: cast.coming2 } : {}) });
  };
  const float = useRef<HTMLSpanElement>(null), ring = useRef<HTMLSpanElement>(null), thread = useRef<SVGLineElement>(null);
  /** The second line's float and thread, of a rod of two lines. */
  const float2 = useRef<HTMLSpanElement>(null), thread2 = useRef<SVGLineElement>(null);
  /** The whispering float's own: the ring that runs down to the bite, and the flash at the true bite. */
  const count = useRef<SVGCircleElement>(null), flash = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (phase.at !== "waiting") return;
    const { from } = phase, cast = phase, grace = strikeWindow({ keen, spent, gear: out.current?.gear });
    let raf = 0, heard = -1, under = false, drawn = 0, due = 0;
    const frame = (t: number) => {
      // (no more often than the map is drawn at the most: lib/town/pace)
      const after = paced(t, drawn, due, PACE.most);
      if (after === null) { raf = requestAnimationFrame(frame); return; }
      due = after; drawn = t;
      const s = (t - from) / 1000;
      const nibble = cast.nibbles.findIndex((n) => s >= n && s < n + NIBBLE), nibbling = nibble >= 0, bitten = s >= cast.wait;
      show(bitten ? "bite" : nibbling ? "nibble" : "wait");
      // each nibble is heard once, and the bite once
      if (bitten && !under) { under = true; sfx.play("bite"); }
      else if (nibbling && nibble !== heard && !bitten) { heard = nibble; sfx.play("nibble"); }
      // a gentle bob; a nibble dips it and lets it up; the bite pulls it right under
      const bob = reduced ? 0 : Math.sin(t / 420) * 2;
      const dip = bitten ? 22 : nibbling ? 6 + (reduced ? 0 : Math.sin(t / 45) * 2) : 0;
      if (float.current) {
        float.current.style.transform = `translateY(${bob + dip}px) rotate(${bitten ? 14 : nibbling ? -8 : 0}deg)`;
        float.current.style.opacity = bitten ? "0.35" : "1";
      }
      if (thread.current) thread.current.setAttribute("y2", String(40 + bob + dip));
      // (a rod of two lines: the second float rides beside the first to its own beat, and goes under with it)
      if (float2.current) {
        const bob2 = reduced ? 0 : Math.sin(t / 420 + 1.9) * 2;
        float2.current.style.transform = `translateY(${bob2 + dip}px) rotate(${bitten ? -14 : nibbling ? 8 : 0}deg)`;
        float2.current.style.opacity = bitten ? "0.35" : "1";
        if (thread2.current) thread2.current.setAttribute("y2", String(40 + bob2 + dip));
      }
      // (the whispering float: its ring runs down to the bite, and it flashes when the bite is the true one)
      if (count.current) count.current.style.strokeDashoffset = String(COUNT_ROUND * Math.min(1, Math.max(0, s / cast.wait)));
      if (flash.current) flash.current.style.opacity = bitten ? String(Math.max(0, 1 - (s - cast.wait) / 0.9)) : "0";
      if (ring.current) {
        const since = bitten ? s - cast.wait : nibbling ? s - cast.nibbles.find((n) => s >= n && s < n + NIBBLE)! : -1;
        ring.current.style.opacity = since >= 0 ? String(Math.max(0, 1 - since / (bitten ? 1.2 : NIBBLE))) : "0";
        ring.current.style.transform = `scale(${since >= 0 ? (bitten ? 1 + since * 1.6 : 0.6 + since) : 0.5})`;
      }
      if (s > cast.wait + grace) {
        sfx.play("missed");
        afloat.current = false;
        void keeper.missed().then((it) => write("missed", it));
        end({ how: "missed" });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, keen, spent, reduced, show, write, sfx, keeper, end]);

  /**
   * Strike: at a nibble or before anything it scares the fish off; within moments of the bite it sets the hook. A
   * line that has only just gone out takes none (lib/town/fishing's `REST`): the hand that dropped it is often still
   * pressing. (`whenever`: a script's, which is no hand.)
   */
  const strike = useCallback(async (whenever = false) => {
    if (phase.at !== "waiting") return;
    const { wait, from } = phase, p = keeper.purse(), t = keeper.now();
    if (!whenever && settling((performance.now() - from) / 1000, wait)) return;
    const reaction = Math.round(((performance.now() - from) / 1000 - wait) * 1000) / 1000;
    // How good a strike it was is this hand's to say, and heard at once; whether anything is on the hook, and what,
    // is the keeper's (its clock gives a moment's grace either way).
    const hit = strikeOf(reaction, { keen: levelOf(p, t, "keen"), spent: isSpent(p, t), gear: out.current?.gear });
    sfx.wake();
    sfx.play(!hit ? "early" : hit === "perfect" ? "perfect" : "strike");
    setPhase({ at: "striking" });
    const did = await keeper.strike(reaction, hit);
    if (!did.ok || !did.hooked) {
      afloat.current = false;
      const how = did.ok && did.how === "missed" ? "missed" : "early";
      if (hit) sfx.play(how);
      write(how, { reaction, what: did.ok ? did.what : undefined, size: did.ok ? did.size : undefined });
      end({ how });
      return;
    }
    // (taken by the keeper's grace when this hand thought it too soon: a late one's worth)
    const worth: Strike = hit ?? "late";
    if (!hit) sfx.play("strike");
    // A rod of two lines: both are hooked by the one strike. What is no fish comes in at once (and is shown beside
    // what the other comes to); one fish is fought as any fish is, two are fought at once.
    if (did.pair && did.pair.length === 2) {
      const [a, b] = did.pair, isFish = (h: Hooked) => !h.landed && h.what in FISH;
      const came = (h: Hooked): Outcome => ({ how: "landed", what: h.what, size: 0, kept: !!h.kept, record: false });
      for (const h of did.pair) if (!isFish(h)) { onLanded(); window.setTimeout(() => sfx.play("flotsam"), 350); }
      if (isFish(a) && isFish(b)) {
        if (out.current) { out.current.what = a.what; out.current.size = a.size; }
        setPhase({ at: "fight2", fish: [a.what as FishId, b.what as FishId], sizes: [a.size, b.size], strike: worth, reaction });
        return;
      }
      if (!isFish(a) && !isFish(b)) {
        afloat.current = false;
        write("landed", { reaction, strike: worth, kept: !!a.kept, what: a.what, size: 0 }, false);
        write("landed", { reaction, strike: worth, kept: !!b.kept, what: b.what, size: 0 });
        end({ ...came(a), also: came(b) });
        return;
      }
      const fish = isFish(a) ? a : b, other = isFish(a) ? b : a;
      write("landed", { reaction, strike: worth, kept: !!other.kept, what: other.what, size: 0 }, false);
      extra.current = came(other);
      if (out.current) { out.current.what = fish.what; out.current.size = fish.size; }
      setPhase({ at: "fight", fish: fish.what as FishId, size: fish.size, strike: worth, reaction });
      return;
    }
    if (did.landed || !did.what || !(did.what in FISH)) {
      // no fish: it comes in with no fight
      afloat.current = false;
      const landed = { kept: !!did.kept, record: !!did.record };
      window.setTimeout(() => sfx.play("flotsam"), 350);
      onLanded();
      write("landed", { reaction, strike: worth, ...landed, what: did.what, size: 0 });
      end({ how: "landed", what: did.what, size: 0, ...landed });
      return;
    }
    if (out.current) { out.current.what = did.what; out.current.size = did.size ?? 0; }
    setPhase({ at: "fight", fish: did.what as FishId, size: did.size ?? 0, strike: worth, reaction });
  }, [phase, keeper, write, sfx, onLanded, end]);

  /* ── the fight ── */
  const holding = useRef(false);
  const fight = useRef<Fight | null>(null);
  /**
   * A line of dragon silk worn (lib/town/gifts' charmLine), in a fight of one or of two: while what would have lost
   * the fish is being mended, a count runs down over the water. (The line itself is drawn gold while the silk has its
   * mending still, and blinks while it mends.) Says what the word under the water is to be meanwhile, if any.
   */
  const silk = { box: useRef<HTMLSpanElement>(null), num: useRef<HTMLSpanElement>(null), bar: useRef<HTMLSpanElement>(null) };
  const silkShown = (mend: Mend | undefined, since: number): string | null => {
    if (silk.box.current) silk.box.current.style.display = mend ? "flex" : "none";
    if (mend) {
      if (silk.num.current) silk.num.current.textContent = String(Math.max(1, Math.ceil(mend.left)));
      if (silk.bar.current) silk.bar.current.style.width = `${Math.max(0, Math.min(1, mend.left / numberOf("charmLine"))) * 100}%`;
      return th ? "ใยมังกรยื้อไว้ รีบแก้!" : "The silk holds: mend it!";
    }
    return since < 1100 ? (th ? "รอดแล้ว!" : "Saved!") : null;
  };
  /** The line's colour and weight: gold with the silk's mending still to come, blinking while it mends, redder as it strains. */
  const silkLine = (line: SVGLineElement | null, strain: number, has: boolean, mend: Mend | undefined, t: number) => {
    if (!line) return;
    line.setAttribute("stroke", mend ? (reduced || Math.floor(t / 130) % 2 ? "#ffb52e" : "#fff4c2") : strain >= 0.75 ? "#ff7a5c" : strain >= 0.4 ? "#ffd27a" : has ? "#ffd86b" : "#f0f0eb");
    line.setAttribute("stroke-width", mend ? "3.2" : has ? "2.2" : "1.6");
    line.dataset.silk = mend ? "mend" : has ? "1" : "";
  };
  const gauge = { needle: useRef<HTMLSpanElement>(null), band: useRef<HTMLSpanElement>(null), line: useRef<HTMLSpanElement>(null),
    strain: useRef<HTMLSpanElement>(null), slack: useRef<HTMLSpanElement>(null), fish: useRef<HTMLSpanElement>(null), word: useRef<HTMLSpanElement>(null),
    swim: useRef<HTMLSpanElement>(null), taut: useRef<SVGLineElement>(null) };
  useEffect(() => {
    if (phase.at !== "fight") return;
    const p = keeper.purse(), t0 = keeper.now(), seed = Math.floor(Math.random() * 2 ** 31);
    let f = startFight(phase.fish, phase.strike, { spent: isSpent(p, t0), calm: levelOf(p, t0, "calm"), gear: out.current?.gear, silk: charmBy(p, "charmLine", 0) }, seed);
    const log = { seed, holds: [] as number[], steps: 0, inside: 0, secs: 0, strike: phase.strike, reaction: phase.reaction };
    bout.current = log;
    // (the fight's stamina was taken as the hook was set: a fight costs it whatever comes of it)
    fight.current = f;
    holding.current = false;
    show("fight");
    let raf = 0, last = performance.now(), owed = 0, was = false, thrashing = false, creak = 0, due = 0, mending = false, saved = -1e9;
    const frame = (t: number) => {
      // (no more often than the map is drawn at the most: lib/town/pace; the fight goes by its own steps whatever the frames)
      const after = paced(t, last, due, PACE.most);
      if (after === null) { raf = requestAnimationFrame(frame); return; }
      due = after;
      // In steps of the same length wherever it is played (so that it can be played again from what is written down),
      // however long the frame was; a step left over waits for the next frame.
      owed += Math.min(0.1, (t - last) / 1000);
      last = t;
      while (owed >= 1 / STEPS && !f.over) {
        const hold = holding.current;
        if (hold !== was) { log.holds.push(log.steps); was = hold; }
        f = stepFight(f, hold, 1 / STEPS);
        owed -= 1 / STEPS;
        log.steps++;
        if (f.tension >= f.lo && f.tension <= f.hi) log.inside++;
      }
      log.secs = f.t;
      fight.current = f;
      const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
      if (gauge.needle.current) gauge.needle.current.style.bottom = pct(f.tension);
      if (gauge.band.current) { gauge.band.current.style.bottom = pct(f.lo); gauge.band.current.style.height = pct(f.hi - f.lo); }
      if (gauge.line.current) gauge.line.current.style.width = pct(1 - f.line / f.length);
      // the fish, as far out as there is line still to bring in; and the line to it, redder the nearer it is to breaking
      if (gauge.swim.current) gauge.swim.current.style.left = `${8 + 70 * Math.max(0, Math.min(1, f.line / f.length))}%`;
      if (gauge.taut.current) {
        gauge.taut.current.setAttribute("x2", String(26 + 202 * Math.max(0, Math.min(1, f.line / f.length))));
      }
      // (a line of dragon silk: heard as it begins to mend and as it has; drawn gold, and counted down over the water)
      if (f.mend && !mending) sfx.play("strain");
      if (!f.mend && mending && !f.over) { sfx.play("perfect"); saved = t; }
      mending = !!f.mend;
      silkLine(gauge.taut.current, f.strain, !!f.silk, f.mend, t);
      const silkWord = silkShown(f.mend, t - saved);
      if (gauge.strain.current) gauge.strain.current.style.width = pct(f.strain);
      if (gauge.slack.current) gauge.slack.current.style.width = pct(f.slack);
      const wild = surging(f), about = warning(f);
      // heard: the fish thrashing as a surge begins, the line creaking as it strains, the reel ticking while it is held
      if (wild && !thrashing) sfx.play("surge");
      thrashing = wild;
      const straining = f.strain >= 0.75 ? 2 : f.strain >= 0.4 ? 1 : 0;
      if (straining > creak) sfx.play("strain");
      creak = straining;
      sfx.reel(holding.current, f.tension >= f.lo && f.tension <= f.hi, f.tension);
      if (gauge.fish.current) gauge.fish.current.style.transform = wild && !reduced ? `translateX(${Math.sin(t / 28) * 5}px) rotate(${Math.sin(t / 40) * 9}deg)` : about && !reduced ? `translateX(${Math.sin(t / 60) * 2}px)` : "";
      if (gauge.word.current) gauge.word.current.textContent = silkWord ?? (wild ? (th ? "ปลาดิ้น!" : "It surges!") : about ? (th ? "ปลากำลังจะดิ้น" : "It is about to surge") : f.tension > f.hi ? (th ? "ตึงไป!" : "Too tight!") : f.tension < f.lo ? (th ? "หย่อนไป!" : "Too slack!") : (th ? "สาวสายได้" : "Reel"));
      if (f.over) {
        // How it ended is told to the keeper, with this hand's account of the fight; the keeper has the last word (a
        // fish landed sooner than any fight could be is one that slipped).
        afloat.current = false;
        sfx.reel(false, false, 0);
        const told = { seed: log.seed, steps: log.steps, secs: Math.round(log.secs * 10) / 10, inBand: log.steps ? Math.round((log.inside / log.steps) * 1000) / 1000 : 0,
          strike: log.strike, holds: log.holds.slice(0, 1500) };
        void keeper.land(f.over, told).then((got) => {
          // (the otter drove it back: the line is out still, nothing of the go is written down yet, and the fish is fought once more)
          if (got.again && (f.over === "snapped" || f.over === "slipped")) {
            afloat.current = true;
            sfx.play("surge");
            setPhase({ at: "driven", fish: phase.fish, size: phase.size, reaction: phase.reaction, how: f.over, from: performance.now() });
            return;
          }
          const how = got.how === "landed" || got.how === "snapped" ? got.how : "slipped";
          if (how === "landed") { sfx.play("landed", FISH[phase.fish].tier); onLanded(); if (got.record) window.setTimeout(() => sfx.play("record"), 1100); }
          else sfx.play(how);
          write(how, { kept: got.kept, record: got.record, what: phase.fish, size: phase.size });
          // (with what the other line of a rod of two lines came to, where there was one)
          const also = extra.current;
          extra.current = null;
          end({ how, what: phase.fish, size: phase.size, kept: got.kept, record: got.record, ...(got.back ? { back: true } : {}), ...(also ? { also } : {}) });
        });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); fight.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a fight runs from when it begins; the gauge's refs do not change
  }, [phase, keeper, reduced, th, show, write, sfx, onLanded, end]);

  /* ── two fish at once, on a rod of two lines (lib/town/fishing's `Pair`) ── */
  const pair = useRef<Pair | null>(null);
  const two = {
    needle: useRef<HTMLSpanElement>(null), strain: useRef<HTMLSpanElement>(null), slack: useRef<HTMLSpanElement>(null), word: useRef<HTMLSpanElement>(null),
    band: [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)], line: [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)],
    swim: [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)], fish: [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)],
    taut: [useRef<SVGLineElement>(null), useRef<SVGLineElement>(null)], mark: [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)],
  };
  useEffect(() => {
    if (phase.at !== "fight2") return;
    const p0 = keeper.purse(), t0 = keeper.now(), seed = Math.floor(Math.random() * 2 ** 31), { fish, sizes, reaction } = phase;
    let p = startPair(fish, phase.strike, { spent: isSpent(p0, t0), calm: levelOf(p0, t0, "calm"), gear: out.current?.gear, narrow: numberOf("thingRod"), silk: charmBy(p0, "charmLine", 0) }, seed);
    const log = { seed, holds: [] as number[], steps: 0, inside: 0, secs: 0, strike: phase.strike, reaction };
    bout.current = log;
    pair.current = p;
    holding.current = false;
    show("fight");
    let raf = 0, last = performance.now(), owed = 0, was = false, creak = 0, due = 0, gone = false, mending = false, saved = -1e9;
    const thrashing = [false, false];
    /** What each fish ends as is told to the keeper as it ends, one after the other: the keeper has the last word on each. */
    let asked: Promise<unknown> = Promise.resolve();
    const finish = (i: 0 | 1, over: "landed" | "snapped" | "slipped", lastOne: boolean) => {
      const told = { seed: log.seed, steps: log.steps, secs: Math.round(log.secs * 10) / 10, inBand: log.steps ? Math.round((log.inside / log.steps) * 1000) / 1000 : 0, strike: log.strike, holds: log.holds.slice(0, 1500) };
      if (lastOne) { afloat.current = false; sfx.reel(false, false, 0); }
      asked = asked.then(() => keeper.land(over, told, lastOne ? undefined : i)).then((got) => {
        if (gone) return;
        // (the last of the two got away, and the otter drives it back: it is fought once more, alone)
        if (lastOne && got.again && over !== "landed") {
          afloat.current = true;
          sfx.play("surge");
          if (out.current) { out.current.what = fish[i]; out.current.size = sizes[i]; }
          setPhase({ at: "driven", fish: fish[i], size: sizes[i], reaction, how: over, from: performance.now() });
          return;
        }
        const how = got.how === "landed" || got.how === "snapped" ? got.how : "slipped";
        if (how === "landed") { sfx.play("landed", FISH[fish[i]].tier); onLanded(); if (got.record) window.setTimeout(() => sfx.play("record"), 1100); }
        else sfx.play(how);
        const came: Outcome = { how, what: fish[i], size: sizes[i], kept: got.kept, record: got.record, ...(got.back ? { back: true } : {}) };
        write(how, { kept: got.kept, record: got.record, what: fish[i], size: sizes[i] }, lastOne);
        if (!lastOne) { extra.current = came; return; }
        const also = extra.current;
        extra.current = null;
        end({ ...came, ...(also ? { also } : {}) });
      });
    };
    const frame = (t: number) => {
      const after = paced(t, last, due, PACE.most);
      if (after === null) { raf = requestAnimationFrame(frame); return; }
      due = after;
      owed += Math.min(0.1, (t - last) / 1000);
      last = t;
      while (owed >= 1 / STEPS && !(p.ended[0] && p.ended[1])) {
        const hold = holding.current, before = p.ended;
        if (hold !== was) { log.holds.push(log.steps); was = hold; }
        p = stepPair(p, hold, 1 / STEPS);
        owed -= 1 / STEPS;
        log.steps++;
        if (([0, 1] as const).some((i) => !p.ended[i] && p.tension >= p.lo[i] && p.tension <= p.hi[i])) log.inside++;
        log.secs = p.t;
        for (const i of [0, 1] as const) if (!before[i] && p.ended[i]) finish(i, p.ended[i]!, !!p.ended[i === 0 ? 1 : 0]);
      }
      pair.current = p;
      const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
      const live = ([0, 1] as const).filter((i) => !p.ended[i]), within = (i: 0 | 1) => p.tension >= p.lo[i] && p.tension <= p.hi[i];
      if (two.needle.current) two.needle.current.style.bottom = pct(p.tension);
      for (const i of [0, 1] as const) {
        const f = p.fights[i], on = !p.ended[i], far = Math.max(0, Math.min(1, f.line / f.length)), wild = on && surging(f), about = on && warning(f);
        const band = two.band[i].current, swim = two.swim[i].current, body = two.fish[i].current, taut = two.taut[i].current, mark = two.mark[i].current;
        if (band) { band.style.display = on ? "" : "none"; band.style.bottom = pct(p.lo[i]); band.style.height = pct(p.hi[i] - p.lo[i]); band.style.opacity = on && within(i) ? "1" : "0.55"; }
        if (two.line[i].current) two.line[i].current!.style.width = pct(p.ended[i] === "landed" ? 1 : 1 - f.line / f.length);
        if (swim) { swim.style.left = `${8 + 66 * (p.ended[i] === "landed" ? 0 : far)}%`; swim.style.opacity = on ? "1" : "0.25"; }
        if (taut) { taut.setAttribute("x2", String(26 + 190 * far)); taut.style.display = on ? "" : "none"; silkLine(taut, p.strain, p.silk > 0, p.mend, t); }
        if (body) body.style.transform = wild && !reduced ? `translateX(${Math.sin(t / 28 + i) * 5}px) rotate(${Math.sin(t / 40 + i) * 9}deg)` : about && !reduced ? `translateX(${Math.sin(t / 60) * 2}px)` : "";
        if (mark) { mark.style.display = p.ended[i] ? "" : "none"; mark.dataset.how = p.ended[i] ?? ""; mark.textContent = p.ended[i] === "landed" ? (th ? "ได้แล้ว" : "In") : p.ended[i] ? (th ? "หลุด" : "Gone") : ""; }
        if (wild && !thrashing[i]) sfx.play("surge");
        thrashing[i] = wild;
      }
      if (two.strain.current) two.strain.current.style.width = pct(p.strain);
      if (two.slack.current) two.slack.current.style.width = pct(p.slack);
      const straining = p.strain >= 0.75 ? 2 : p.strain >= 0.4 ? 1 : 0;
      if (straining > creak) sfx.play("strain");
      creak = straining;
      const inAny = live.some(within), inBoth = live.length === 2 && live.every(within);
      if (live.length) sfx.reel(holding.current, inAny, p.tension);
      const top = live.length ? Math.max(...live.map((i) => p.hi[i])) : 1, bottom = live.length ? Math.min(...live.map((i) => p.lo[i])) : 0;
      // (a line of dragon silk, as in a fight of one)
      if (p.mend && !mending) sfx.play("strain");
      if (!p.mend && mending && live.length && !p.silk) { sfx.play("perfect"); saved = t; }
      mending = !!p.mend;
      const silkWord = silkShown(p.mend, t - saved);
      if (two.word.current) {
        two.word.current.textContent = silkWord ?? (live.some((i) => surging(p.fights[i])) ? (th ? "ปลาดิ้น!" : "It surges!") : p.tension > top ? (th ? "ตึงไป!" : "Too tight!") : p.tension < bottom ? (th ? "หย่อนไป!" : "Too slack!")
          : inBoth ? (th ? "สาวได้ทั้งคู่!" : "Reeling both!") : inAny ? (th ? "สาวสายได้" : "Reel") : (th ? "อยู่ระหว่างสองตัว" : "Between the two"));
        two.word.current.dataset.both = inBoth && !silkWord ? "1" : "";
      }
      if (p.ended[0] && p.ended[1]) return;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { gone = true; cancelAnimationFrame(raf); pair.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a fight runs from when it begins; the gauge's refs do not change
  }, [phase, keeper, reduced, th, show, write, sfx, onLanded, end]);

  useEffect(() => { if (phase.at === "ready" || phase.at === "result") show(null); else if (phase.at === "casting") show("wait"); }, [phase, show]);

  /* ── the otter (lib/town/gifts' famOtter): a fish that got away is driven back to the hook, and fought once more ── */
  const chase = { otter: useRef<HTMLSpanElement>(null), fish: useRef<HTMLSpanElement>(null), wake: useRef<HTMLSpanElement>(null) };
  useEffect(() => {
    if (phase.at !== "driven") return;
    const { from, fish, size, reaction } = phase;
    show("fight");
    let raf = 0;
    const ease = (x: number) => x * x * (3 - 2 * x);
    const frame = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - from) / (DRIVEN * 1000)));
      // Out after it for the first two fifths (the fish making off to the right), round behind it, then both back
      // towards the rod, the fish first. With motion reduced the two are shown where they end.
      const out = reduced ? 1 : ease(Math.min(1, k / 0.4)), home = reduced ? 1 : ease(Math.max(0, (k - 0.4) / 0.6));
      const fishAt = 74 + 14 * out - 40 * home, otterAt = out < 1 ? 4 + 88 * out : 92 - 30 * home;
      const wave = reduced ? 0 : Math.sin(t / 70) * 3;
      if (chase.fish.current) chase.fish.current.style.transform = `translate(-50%, ${wave}px) scaleX(${home > 0 ? -1 : 1})`;
      if (chase.fish.current) chase.fish.current.style.left = `${fishAt}%`;
      if (chase.otter.current) { chase.otter.current.style.left = `${otterAt}%`; chase.otter.current.style.transform = `translate(-50%, ${-wave}px) scaleX(${out < 1 ? 1 : -1})`; }
      if (chase.wake.current) { chase.wake.current.style.left = `${otterAt}%`; chase.wake.current.style.opacity = String(0.35 + 0.35 * Math.abs(Math.sin(t / 160))); }
      if (k >= 1) { setPhase({ at: "fight", fish, size, strike: "good", reaction }); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the chase runs from when it begins; its refs do not change
  }, [phase, reduced, show]);

  // The hand's rest, as the buttons show it: the strike's is dim while the line settles, and the two under what a go
  // came to for a moment after it shows. (Whether a press is taken is asked of the clock where it is taken.)
  const [rested, setRested] = useState<Phase | null>(null);
  useEffect(() => {
    if (phase.at !== "waiting" && phase.at !== "result") return;
    const rest = phase.at === "waiting" ? Math.min(REST.settle, phase.wait) : REST.pause;
    const id = window.setTimeout(() => setRested(phase), Math.max(0, phase.from + rest * 1000 - performance.now()));
    return () => window.clearTimeout(id);
  }, [phase]);
  const resting = (phase.at === "waiting" || phase.at === "result") && rested !== phase;
  /** Whether what a go came to has been shown long enough to go on from. */
  const seen = useCallback(() => phase.at === "result" && performance.now() - phase.from >= REST.pause * 1000, [phase]);
  /** On from what a go came to: back to the baits, and the button that drops the line. */
  const again = useCallback(() => { if (seen()) setPhase({ at: "ready" }); }, [seen]);

  // The keyboard (the owner: "การเล่น mini game ตกปลา ช่วยทำให้กดปุ่ม space bar แทนได้"): the space bar does whatever the
  // big button does: drops the line, strikes, is held to reel; Escape puts the rod away. Heard before the town hears
  // it, and before a button that happens to have the focus does. **What a go came to is not left by the space bar**
  // (the members, 2026-10-06: "อยากให้เปลี่ยนปุ่มตรงข้อมูลปลาที่จับได้ ให้มันไม่ลั่นต่อไปโดนโยนเบ็ต"): the key that was hammered
  // through the fight does nothing there, and Enter goes on (the town's key for typing everywhere else; a button that
  // has the focus keeps it, as a button does).
  const dropRef = useRef<() => void>(() => {});
  useEffect(() => {
    const key = (down: boolean) => (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && (target as HTMLInputElement).type !== "checkbox")) return;
      if (e.key === "Escape" && down) { e.preventDefault(); onClose(); return; }
      if (e.key === "Enter" && phase.at === "result" && !(target && /^(BUTTON|A)$/.test(target.tagName))) {
        e.preventDefault();
        e.stopPropagation();
        if (down && !e.repeat) again();
        return;
      }
      if (e.key !== " " && e.code !== "Space") return;
      e.preventDefault();
      e.stopPropagation();
      if (phase.at === "fight" || phase.at === "fight2") { holding.current = down; if (down) sfx.wake(); return; }
      if (!down || e.repeat) return;
      if (phase.at === "waiting") void strike();
      else if (phase.at === "ready") dropRef.current();
    };
    const down = key(true), up = key(false);
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); };
  }, [phase, strike, again, onClose, sfx]);
  // (the way to drop the line is made anew each time the panel is drawn: the keyboard is given the newest)
  useEffect(() => { dropRef.current = () => { void drop(); }; });

  // (for scripts in `next dev`: what is happening, and a hand on the reel. Never in a production page: it strikes and reels for whoever calls it)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      phase: () => phase.at, cast: () => (phase.at === "waiting" ? { wait: phase.wait, nibbles: phase.nibbles, since: (performance.now() - phase.from) / 1000, coming: phase.coming ?? null, pair: !!phase.pair, coming2: phase.coming2 ?? null } : null),
      /** Two fish fought at once, on a rod of two lines: the fight as it stands. */
      pair: () => pair.current,
      // (a script's strike is taken whenever it comes: the line's rest is for hands, which the checks try by the button and the key)
      fight: () => fight.current, hold: (on: boolean) => { holding.current = on; }, strike: () => strike(true), result: () => (phase.at === "result" ? phase : null),
      quick: (on: boolean) => setQuick(on), place: () => place,
      /** A sound made where nobody hears it, and measured. */
      sound: (name: FishSound | "tick", tier?: Parameters<typeof measure>[1]) => measure(name, tier),
    };
    (window as unknown as { __townFish?: typeof handle }).__townFish = handle;
    return () => { delete (window as unknown as { __townFish?: typeof handle }).__townFish; };
  }, [phase, strike, place]);

  const name = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const known = (id: CatchId) => !(id in FISH) || purse.best[id as FishId] !== undefined;
  const press = (on: boolean) => (e: ReactPointerEvent) => { e.preventDefault(); holding.current = on; if (on) { sfx.wake(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } };
  const hasRod = !!gear.rod;
  /** What one line came to: the thing landed with what there is to say of it, or how it was lost. */
  const came = (o: Outcome, key: number) => (
    o.how === "landed" && o.what ? (
      <div key={key} className="flex items-center gap-3" data-came={o.how} data-what={o.what}>
        <ItemIcon id={o.what} size={52} />
        <div className="min-w-0">
          <p className="text-read font-semibold text-[#fff6e3]">{th ? `ได้ ${name(o.what)}` : `You landed: ${name(o.what)}`}{o.size ? (th ? ` ยาว ${o.size} ซม.` : `, ${o.size} cm`) : ""}</p>
          {o.record && <p className="text-ui font-semibold text-[#ffe19a]">{th ? "ตัวยาวที่สุดที่เคยจับได้!" : "Your longest yet!"}</p>}
          {o.kept === false && <p className="text-meta text-[#ffb09c]">{th ? "กระเป๋าเต็ม เลยปล่อยกลับลงน้ำไป" : "Your bag is full, so it went back in the water."}</p>}
          <p className="text-meta text-[#e9cfa4]">{th ? ITEMS[o.what].about.th : ITEMS[o.what].about.en}</p>
        </div>
      </div>
    ) : (
      <p key={key} className="text-read text-[#fff6e3]" data-came={o.how} data-what={o.what ?? ""}>
        {o.how === "snapped" ? (o.back ? (th ? "สายขาด! ปลาหนีไปแล้ว แต่เหยื่อยังอยู่" : "The line snapped! It is gone, but the bait is yours still.") : (th ? "สายขาด! ปลาหนีไปพร้อมเหยื่อ" : "The line snapped! It is gone, with the bait."))
          : o.how === "slipped" ? (o.back ? (th ? "เบ็ดหลุด ปลาหนีไปแล้ว แต่เหยื่อยังอยู่" : "The hook slipped. It got away, but the bait is yours still.") : (th ? "เบ็ดหลุด ปลาหนีไปแล้ว" : "The hook slipped. It got away."))
            : o.how === "early" ? (th ? "ตวัดเร็วไป ปลายังไม่กินเบ็ด มันตกใจหนีไปแล้ว" : "Too soon: it had not taken the hook, and now it has fled.")
              : (th ? "ช้าไป ปลากินเหยื่อแล้วว่ายหนีไป" : "Too late: it ate the bait and swam off.")}
      </p>
    )
  );
  /** A line of dragon silk mending: the seconds left, counted down across the top of the water (shown only while it mends: `silkShown`). */
  const silkCount = (
    <span ref={silk.box} className="absolute inset-x-0 top-0 items-center justify-center gap-2 border-b-2 border-[#2a190d] bg-[#ffcf4a] py-0.5 text-[#3a2209]" style={{ display: "none" }} data-fx="silk">
      <TownIcon name="charmLine" size={20} />
      <span ref={silk.num} className="w-4 text-center font-data text-read font-bold tabular-nums" />
      <span className="h-2 w-24 overflow-hidden border-2 border-[#2a190d] bg-[#fff4c2]"><span ref={silk.bar} className="block h-full bg-[#e9573f]" style={{ width: "100%" }} /></span>
    </span>
  );
  /** Whether I have a rod of two lines (lib/town/gifts' thingRod): both lines are then offered beside the plain one. */
  const rodOfTwo = works(purse, "thingRod");
  /** What the whispering float tells of a line: a fish landed before as itself with its name, another as a shade of its tier. */
  const whisper = (what: CatchId, second = false) => {
    const fish = what in FISH ? (what as FishId) : null, met = !fish || purse.best[fish] !== undefined, tier: Shade = fish ? FISH[fish].tier : "other";
    return (
      <span key={second ? 2 : 1} className="flex items-center gap-1.5 rounded-md border border-white/25 bg-black/45 px-1.5 py-1" data-fx={second ? "whisper2" : "whisper"} data-coming={met ? what : ""} data-tier={tier}>
        {met ? <ItemIcon id={what} size={28} /> : <span style={{ filter: SHADE_LOOK[tier] }}><TownIcon name="fishShadow" size={28} /></span>}
        <span className="font-data text-label text-white/90">{met ? (th ? ITEMS[what].name.th : ITEMS[what].name.en) : "???"}</span>
      </span>
    );
  };
  /** The otter, while it follows me: it keeps by the float, with how many fish it will still drive back in this meal's hours beside it. */
  const otter = works(purse, "famOtter"), otterLeft = otter ? usesLeft(purse, "famOtter", now) : 0;
  const otterBy = (className: string) => otter && (
    <span className={`absolute flex items-end gap-0.5 ${className}`} data-fx="otter" data-otter-left={otterLeft}>
      <span className="animate-bounce motion-reduce:animate-none [animation-duration:1.6s]"><TownIcon name="famOtter" size={30} /></span>
      <span className="mb-0.5 rounded-[3px] bg-[#2a190d]/75 px-1 font-data text-label tabular-nums text-[#fff6e3]">{otterLeft}</span>
    </span>
  );
  return (
    <section aria-labelledby="town-fish-h" data-town-game data-look="fish"
             className="rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-3 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2">
        {/* the rod in use, when there is one */}
        <span title={gear.rod ? name(gear.rod) : undefined}>{gear.rod ? <ItemIcon id={gear.rod} size={24} /> : <TownIcon name="hook" size={22} />}</span>
        <h2 id="town-fish-h" className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{th ? "ตกปลา" : "Fishing"}</h2>
        <span className="rounded-[3px] bg-[#4a2f18] px-2 py-0.5 text-meta text-[#e9cfa4]">{place.deep ? (th ? "น้ำลึก" : "Deep water") : (th ? "น้ำตื้น" : "Shallows")}</span>
        <span className={`ml-auto flex items-center gap-1 font-data text-ui tabular-nums ${stamina ? "text-[#fff6e3]" : "text-[#ffb09c]"}`} title="Stamina">
          <TownIcon name="stamina" size={16} />{stamina}
        </span>
        <BuffAura ids={AT_THE_LINE.filter((b) => buffs.includes(b))} th={th} size={18} />
        <button type="button" onClick={() => { const on = !sound; sfx.setOn(on); setSound(on); if (on) { sfx.wake(); sfx.play("nibble"); } }} aria-pressed={sound}
                title={th ? (sound ? "ปิดเสียงตกปลา" : "เปิดเสียงตกปลา") : (sound ? "Turn the fishing sounds off" : "Turn the fishing sounds on")}
                className={`pressable grid size-8 place-items-center rounded-full border ${sound ? "border-[#2a190d]" : "border-[#2a190d] opacity-50"}`}>
          <TownIcon name={sound ? "volumeHigh" : "volumeLow"} size={16} /><span className="sr-only">{th ? "เสียงตกปลา" : "Fishing sounds"}</span>
        </button>
        <button type="button" onClick={onClose} className="pressable -mr-1 rounded-full px-3 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3]">
          {phase.at === "ready" || phase.at === "result" ? (th ? "ปิด" : "Close") : (th ? "เก็บเบ็ด" : "Reel in")}
        </button>
      </div>

      {phase.at === "ready" && (
        <div className="mt-2">
          {!hasRod ? (
            <>
              <p className="text-ui text-[#fff6e3]">{th ? "ต้องมีคันเบ็ดก่อน" : "You need a rod first."}</p>
              {process.env.NODE_ENV !== "production" && trial && kitButton(["รับคันเบ็ดกับไส้เดือน 10 ตัว", "Take a rod and ten worms"])}
            </>
          ) : !baits.length ? (
            <>
              <p className="text-ui text-[#fff6e3]">{th ? "ในกระเป๋าไม่มีอะไรที่เกี่ยวเบ็ดได้เลย" : "Nothing in your bag will go on a hook."}</p>
              {process.env.NODE_ENV !== "production" && trial && kitButton(["รับไส้เดือน 10 ตัว", "Take ten worms"])}
            </>
          ) : (
            <>
              <div role="radiogroup" aria-label={th ? "เหยื่อ" : "Bait"} className="flex flex-wrap gap-1.5">
                {baits.map((b) => (
                  <button key={b} type="button" role="radio" aria-checked={inHand === b} onClick={() => setBait(b)}
                          className={`pressable flex min-h-11 items-center gap-1.5 rounded-md border-2 px-3 text-ui ${inHand === b ? "border-[#ffe19a] bg-[#f0c060]/25 font-semibold text-[#fff6e3]" : "border-[#2a190d] text-[#fff6e3] hover:border-[#ffe19a]"}`}>
                    <ItemIcon id={b} size={20} />{name(b)}<span className="font-data text-meta text-[#e9cfa4]">×{have(b)}</span>
                  </button>
                ))}
              </div>
              {/* what a bait may bring: shown to nobody for now (lib/town/fishing's seesOdds) */}
              {shown && (
                <>
                  <p className="mt-2 text-meta text-[#e9cfa4]">
                    {odds.some((o) => o.what in FISH) ? (th ? "ตอนนี้เหยื่อนี้อาจได้:" : "This bait, at this hour, may bring:") : (th ? "ชั่วโมงนี้ไม่มีปลาที่กินเหยื่อชนิดนี้ออกหากิน จะได้แต่ของลอยน้ำ" : "No fish that takes this bait is feeding at this hour: only what drifts by.")}
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {odds.map((o) => (
                      <li key={o.what} className="flex items-center gap-1 rounded-[3px] bg-[#4a2f18] px-2 py-0.5 text-meta text-[#fff6e3]">
                        {known(o.what) ? <ItemIcon id={o.what} size={16} /> : <TownIcon name="fishShadow" size={16} />}
                        {known(o.what) ? name(o.what) : (th ? "ยังไม่เคยจับได้" : "Not caught yet")}
                        <span className="font-data tabular-nums text-[#e9cfa4]">{o.p >= 0.1 ? Math.round(o.p * 100) : (o.p * 100).toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {!roomFor(purse.bag, "minnow") && purse.bag.every(Boolean) && <p className="mt-1.5 text-meta text-[#ffb09c]">{th ? "กระเป๋าเต็ม ปลาชนิดใหม่จะไม่มีที่ใส่" : "Your bag is full: a new kind of fish will have nowhere to go."}</p>}
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                {process.env.NODE_ENV !== "production" && trial && (
                  <label className="mr-auto flex min-h-11 items-center gap-1.5 text-meta text-[#e9cfa4]">
                    <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
                    {th ? "โหมดลอง: รอสั้นลงห้าเท่า" : "Trial: a fifth of the wait"}
                  </label>
                )}
                {/* a rod of two lines (lib/town/gifts' thingRod), beside the plain line: both lines at once, for two of the bait */}
                {rodOfTwo && (
                  <button type="button" onClick={() => { void drop("pair"); }} disabled={have(inHand) < PAIR.lines} data-fish-pair
                          className="pressable flex min-h-11 items-center gap-1.5 rounded-md border-[3px] border-[#2a190d] bg-[#8fd0ea] px-3 text-ui font-semibold text-[#12303f] shadow-[inset_0_-3px_0_#4d9dc0] disabled:opacity-50">
                    <TownIcon name="thingRod" size={22} />{th ? "หย่อนสองสาย" : "Drop two lines"}
                    <span className="flex items-center font-data text-meta"><ItemIcon id={inHand} size={16} />×{PAIR.lines}</span>
                  </button>
                )}
                <button type="button" onClick={() => { void drop(); }}
                        className="pressable min-h-11 rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] px-5 text-ui font-semibold text-[#3a2209] shadow-[inset_0_-3px_0_#c98f2f]">
                  {th ? "หย่อนเบ็ด" : "Drop the line"}<Key />
                </button>
              </div>
            </>
          )}
          {note && <p className="mt-1.5 text-meta text-[#ffb09c]" aria-live="polite">{note}</p>}
        </div>
      )}

      {/* (the same water while the line is on its way out and while the strike is on its way in: the keeper's answer is waited for) */}
      {(phase.at === "waiting" || phase.at === "casting" || phase.at === "striking") && (
        <div className="mt-2">
          <div aria-hidden className={`${STAGE} mx-auto grid h-28 w-full place-items-center`} data-look="float">
            <PixelGround kind="water" w={96} h={28} className="absolute inset-0 size-full" />
            {/* the rod's tip, and the line down to the float */}
            <svg className="absolute inset-0 size-full" viewBox="0 0 288 96" preserveAspectRatio="none">
              <line ref={thread} x1="262" y1="6" x2="144" y2="40" stroke="rgba(240,240,235,0.85)" strokeWidth="1.2" />
              {phase.at === "waiting" && phase.pair && <line ref={thread2} x1="262" y1="6" x2="184" y2="40" stroke="rgba(190,232,250,0.85)" strokeWidth="1.2" />}
              <line x1="292" y1="-10" x2="262" y2="6" stroke="#3d2913" strokeWidth="6" strokeLinecap="round" />
              <line x1="292" y1="-10" x2="262" y2="6" stroke="#e0ba72" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {/* what the buffs show on the water: quick rings under the swift blessing, the shade of what is coming under
                clear water (the rarer, the brighter), a light for luck */}
            {phase.at === "waiting" && buffs.includes("swift") && <span className="absolute translate-y-3 animate-ping opacity-70 motion-reduce:animate-none" data-fx="swift"><TownIcon name="fxRipple" size={44} /></span>}
            {phase.at === "waiting" && phase.shade && (
              <span className="absolute translate-y-7 animate-pulse motion-reduce:animate-none" data-fx="clear" data-shade={phase.shade} style={{ filter: SHADE_LOOK[phase.shade] }}>
                <TownIcon name={phase.shade === "other" ? "fxRing1" : "fishShadow"} size={phase.shade === "legend" ? 46 : phase.shade === "rare" ? 40 : 34} />
              </span>
            )}
            {phase.at === "waiting" && lucky > 0 && <Twinkle size={20} className="absolute -translate-y-6 translate-x-7" />}
            {/* the whispering float worn as a charm (lib/town/gifts): what is on its way, a ring that runs down to the
                bite, and a flash at the true bite. A fish landed before is itself; another is a shade of its tier. */}
            {phase.at === "waiting" && phase.coming && (
              <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
                {whisper(phase.coming)}
                {phase.coming2 && whisper(phase.coming2, true)}
              </span>
            )}
            {phase.at === "waiting" && phase.coming && (
              <svg className="absolute size-16" viewBox="0 0 64 64" aria-hidden>
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
                <circle ref={count} cx="32" cy="32" r="28" fill="none" stroke="rgba(255,236,170,0.95)" strokeWidth="3" strokeLinecap="round" strokeDasharray={COUNT_ROUND} strokeDashoffset="0" transform="rotate(-90 32 32)" data-fx="count" />
              </svg>
            )}
            {phase.at === "waiting" && phase.coming && <span ref={flash} className="absolute size-14 rounded-full opacity-0" style={{ background: "radial-gradient(circle, rgba(255,246,190,0.95) 0%, rgba(255,236,150,0.5) 45%, rgba(255,236,150,0) 70%)" }} data-fx="flash" />}
            <span ref={ring} className="absolute size-10 rounded-full border-2 border-white/80 opacity-0" />
            <span ref={float} className="relative transition-opacity duration-150"><TownIcon name="bobber" size={34} /></span>
            {/* a rod of two lines: the second float, beside the first */}
            {phase.at === "waiting" && phase.pair && (
              <span className="absolute left-[63.9%] top-1/2 -translate-x-1/2 -translate-y-1/2" data-fx="float2">
                <span ref={float2} className="block transition-opacity duration-150"><TownIcon name="bobber" size={30} /></span>
              </span>
            )}
            {otterBy("bottom-1 left-2")}
          </div>
          {/* (nothing is said of when to strike: the float shows it, and a strike too soon or too late says why it failed) */}
          {/* (dim while the keeper is waited for, and while a line that has only just gone out settles) */}
          <button type="button" onClick={() => { void strike(); }} disabled={phase.at !== "waiting" || resting} className={`${BIG} mt-2 disabled:opacity-70`}>
            {th ? "ตวัดเบ็ด!" : "Strike!"}<Key />
          </button>
        </div>
      )}

      {phase.at === "fight" && (
        <div className="mt-2">
          <div className="flex items-stretch gap-2.5">
            {/* the line's tension: the needle has to stay in the lit stretch, which moves as the fish does. Twice as
                long as it was at first (the owner: "เพิ่มหลอด ตกปลาให้กว้างกว่านี้ 2 เท่า"), less on a short screen. */}
            <div aria-hidden className={`${STAGE} h-[min(20rem,44dvh)] w-12 shrink-0 bg-[#1c2c38]`} data-look="tension">
              <span className="absolute inset-x-0 top-0 h-[2.5%] bg-[#e9573f]" />
              <span ref={gauge.band} data-fx={buffs.includes("calm") ? "calm" : undefined}
                    className={`absolute inset-x-0 border-y-[3px] border-[#d6ffe0] bg-[#5cc58d]/60 ${buffs.includes("calm") ? "shadow-[0_0_14px_4px_rgba(150,225,255,0.75)]" : ""}`} style={{ bottom: "42%", height: "16%" }} />
              <span ref={gauge.needle} className="absolute inset-x-0 -mb-[2px] h-[5px] bg-[#fff6e3] shadow-[0_0_0_1px_#2a190d]" style={{ bottom: "50%" }} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {/* the water: the fish out on the line, nearer as the line comes in, thrashing when it surges */}
              <div aria-hidden className={`${STAGE} h-24 w-full`} data-look="fight">
                <PixelGround kind="water" w={96} h={24} className="absolute inset-0 size-full" />
                <svg className="absolute inset-0 size-full" viewBox="0 0 260 96" preserveAspectRatio="none">
                  <line ref={gauge.taut} x1="6" y1="8" x2="228" y2="52" stroke="#f0f0eb" strokeWidth="1.6" />
                  <line x1="-12" y1="-6" x2="8" y2="9" stroke="#3d2913" strokeWidth="7" strokeLinecap="round" />
                  <line x1="-12" y1="-6" x2="8" y2="9" stroke="#e0ba72" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
                <span ref={gauge.swim} className="absolute top-[30%] block" style={{ left: "78%" }}>
                  <span ref={gauge.fish} className="inline-block"><TownIcon name="fishShadow" size={40} /></span>
                </span>
                <span ref={gauge.word} className="absolute bottom-1 right-1.5 rounded-[3px] bg-[#2a190d]/75 px-1.5 py-0.5 text-meta font-semibold text-[#fff6e3]" aria-live="off">{th ? "สาวสายได้" : "Reel"}</span>
                {otterBy("bottom-0.5 left-1.5")}
                {silkCount}
              </div>
              <Bar label={th ? "สายที่สาวเข้ามาแล้ว" : "Line in"} bar={gauge.line} tone="bg-[#7cc6e6]" icon="rod" />
              <Bar label={th ? "สายใกล้ขาด" : "Line straining"} bar={gauge.strain} tone="bg-[#e9573f]" icon="warning" />
              <Bar label={th ? "เบ็ดใกล้หลุด" : "Hook slipping"} bar={gauge.slack} tone="bg-[#f0c060]" icon="hook" />
              <button type="button" onPointerDown={press(true)} onPointerUp={press(false)} onPointerCancel={press(false)} onContextMenu={(e) => e.preventDefault()}
                      className={`${BIG} mt-auto`}>
                {th ? "กดค้าง = สาวสาย · ปล่อย = ผ่อน" : "Hold to reel · let go to give line"}<Key />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* two fish at once, on a rod of two lines: one needle across the gauge, a stretch for each fish in its own colour
          (the first's down the left half, the second's down the right), and line won for each fish whose stretch the
          needle is in (for both, where the two lie side by side) */}
      {phase.at === "fight2" && (
        <div className="mt-2" data-look="fight2">
          <div className="flex items-stretch gap-2.5">
            <div aria-hidden className={`${STAGE} h-[min(20rem,44dvh)] w-14 shrink-0 bg-[#1c2c38]`} data-look="tension">
              <span className="absolute inset-x-0 top-0 h-[2.5%] bg-[#e9573f]" />
              <span className="absolute inset-y-0 left-1/2 w-px bg-[#2a190d]" />
              {PAIR_LOOK.map((look, i) => (
                <span key={i} ref={two.band[i]} data-band={i} className={`absolute w-1/2 border-y-[3px] ${i ? "right-0" : "left-0"} ${look.band}`} style={{ bottom: "42%", height: "12%" }} />
              ))}
              <span ref={two.needle} className="absolute inset-x-0 -mb-[2px] h-[5px] bg-[#fff6e3] shadow-[0_0_0_1px_#2a190d]" style={{ bottom: "50%" }} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div aria-hidden className={`${STAGE} h-24 w-full`} data-look="fight">
                <PixelGround kind="water" w={96} h={24} className="absolute inset-0 size-full" />
                <svg className="absolute inset-0 size-full" viewBox="0 0 260 96" preserveAspectRatio="none">
                  <line ref={two.taut[0]} x1="6" y1="8" x2="216" y2="34" stroke="#f0f0eb" strokeWidth="1.6" />
                  <line ref={two.taut[1]} x1="6" y1="8" x2="216" y2="68" stroke="#f0f0eb" strokeWidth="1.6" />
                  <line x1="-12" y1="-6" x2="8" y2="9" stroke="#3d2913" strokeWidth="7" strokeLinecap="round" />
                  <line x1="-12" y1="-6" x2="8" y2="9" stroke="#e0ba72" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
                {PAIR_LOOK.map((look, i) => (
                  <span key={i} ref={two.swim[i]} className={`absolute block ${i ? "top-[50%]" : "top-[12%]"}`} style={{ left: "74%" }} data-fish2={i}>
                    <span ref={two.fish[i]} className="inline-block" style={{ filter: look.glow }}><TownIcon name="fishShadow" size={34} /></span>
                    <span ref={two.mark[i]} className="absolute left-full top-1 ml-0.5 whitespace-nowrap rounded-[3px] bg-[#2a190d]/85 px-1 text-label font-semibold text-[#fff6e3]" style={{ display: "none" }} />
                  </span>
                ))}
                <span ref={two.word} className="absolute bottom-1 right-1.5 rounded-[3px] bg-[#2a190d]/75 px-1.5 py-0.5 text-meta font-semibold text-[#fff6e3] data-[both=1]:bg-[#ffe19a] data-[both=1]:text-[#3a2209]" aria-live="off">{th ? "สาวสายได้" : "Reel"}</span>
                {otterBy("bottom-0.5 left-1.5")}
                {silkCount}
              </div>
              <Bar label={th ? "สายแรกที่สาวเข้ามาแล้ว" : "First line in"} bar={two.line[0]} tone={PAIR_LOOK[0].bar} icon="rod" />
              <Bar label={th ? "สายที่สองที่สาวเข้ามาแล้ว" : "Second line in"} bar={two.line[1]} tone={PAIR_LOOK[1].bar} icon="rod" />
              <Bar label={th ? "สายใกล้ขาด" : "Line straining"} bar={two.strain} tone="bg-[#e9573f]" icon="warning" />
              <Bar label={th ? "เบ็ดใกล้หลุด" : "Hook slipping"} bar={two.slack} tone="bg-[#f0c060]" icon="hook" />
              <button type="button" onPointerDown={press(true)} onPointerUp={press(false)} onPointerCancel={press(false)} onContextMenu={(e) => e.preventDefault()}
                      className={`${BIG} mt-auto`}>
                {th ? "กดค้าง = สาวสาย · ปล่อย = ผ่อน" : "Hold to reel · let go to give line"}<Key />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* the otter's moment: out after the fish that got away, round behind it, and both back to the hook */}
      {phase.at === "driven" && (
        <div className="mt-2" data-look="driven">
          <div aria-hidden className={`${STAGE} h-28 w-full`}>
            <PixelGround kind="water" w={96} h={28} className="absolute inset-0 size-full" />
            <svg className="absolute inset-0 size-full" viewBox="0 0 260 112" preserveAspectRatio="none">
              <line x1="-12" y1="-6" x2="8" y2="9" stroke="#3d2913" strokeWidth="7" strokeLinecap="round" />
              <line x1="-12" y1="-6" x2="8" y2="9" stroke="#e0ba72" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <span ref={chase.wake} className="absolute top-[52%] -translate-x-1/2 opacity-50" style={{ left: "4%" }}><TownIcon name="fxRipple" size={48} /></span>
            <span ref={chase.fish} className="absolute top-[30%] block" style={{ left: "74%" }}><TownIcon name="fishShadow" size={40} /></span>
            <span ref={chase.otter} className="absolute top-[32%] block" style={{ left: "4%" }}><TownIcon name="famOtter" size={40} /></span>
          </div>
          <p className="mt-2 text-center text-read font-semibold text-[#ffe19a] [text-shadow:0_2px_0_#2a190d]" aria-live="polite">
            {th ? "นากต้อนปลากลับมา สู้อีกรอบ!" : "The otter drives it back. Once more!"}
          </p>
        </div>
      )}

      {phase.at === "result" && (
        <div className="mt-2" aria-live="polite">
          {came(phase, 0)}
          {phase.also && <div className="mt-2 border-t-2 border-[#2a190d]/60 pt-2" data-also>{came(phase.also, 1)}</div>}
          <div className="mt-2 flex justify-end gap-1.5">
            {/* (both lie where the reel's button was a moment ago: neither is pressed until what the go came to has been seen) */}
            <button type="button" onClick={() => { if (seen()) onClose(); }} disabled={resting} className="pressable min-h-11 rounded-full px-3 text-ui text-[#e9cfa4] hover:text-[#fff6e3] disabled:opacity-60">{th ? "พอแล้ว" : "That will do"}</button>
            <button type="button" onClick={again} disabled={resting} className="pressable min-h-11 rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] px-5 text-ui font-semibold text-[#3a2209] shadow-[inset_0_-3px_0_#c98f2f] disabled:opacity-60">{th ? "หย่อนอีก" : "Again"}<Key name="Enter" /></button>
          </div>
        </div>
      )}
    </section>
  );
}

/** The key that does what a button does, shown on it where there is a keyboard to press (not on a phone's width). */
function Key({ name = "Space" }: { name?: string }) {
  return <kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">{name}</kbd>;
}

/** A bar with its sign and its name, filled from the left as told: in the board's own hard edges. */
function Bar({ label, bar, tone, icon }: { label: string; bar: RefObject<HTMLSpanElement | null>; tone: string; icon: IconName }) {
  return (
    <div className="flex items-center gap-2">
      <TownIcon name={icon} size={18} />
      <div className="min-w-0 flex-1">
        <span className="block text-label text-[#e9cfa4]">{label}</span>
        <span aria-hidden className="block h-2.5 overflow-hidden border-2 border-[#2a190d] bg-[#3a2513]"><span ref={bar} className={`block h-full ${tone}`} style={{ width: "0%" }} /></span>
      </div>
    </div>
  );
}
