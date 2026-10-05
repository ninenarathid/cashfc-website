"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Shade } from "@/lib/town/fountain";
import { BAITS, BUFFS, FISH, ITEMS, type BaitId, type CatchId, type FishId, type ItemId } from "@/lib/town/items";
import { STEPS, oddsOf, seesOdds, startFight, stepFight, strikeOf, strikeWindow, surging, warning, type Fight, type Strike } from "@/lib/town/fishing";
import { gearOf, type Gear } from "@/lib/town/gear";
import type { FishingEnd, FishingPlay } from "@/lib/town/plays";
import { measure, type FishSfx, type FishSound } from "@/lib/town/sfx";
import { buffOf, buffsOf, hasBuff, isSpent, staminaOf } from "@/lib/town/stamina";
import { handOf, held, roomFor } from "@/lib/town/trade";
import type { Keeper } from "@/lib/town/keeper";
import type { Fishing } from "@/lib/town/world";
import { BIG, PixelGround, STAGE } from "./TownGame";
import { AT_THE_LINE, BuffAura, Twinkle } from "./TownBuffFx";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon, WHY } from "./TownTrade";

/** What my line is doing, for the map to draw: waiting, twitching at a nibble, pulled under by a bite, or tight with a fish on. */
export type LineState = "wait" | "nibble" | "bite" | "fight";
/** A place to fish from: the tile stood on, where its float lands, and whether that is deep water (the deck's) or the shallows (the bank's). */
export type FishPlace = Fishing & { tile: [number, number] };

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
  | { at: "waiting"; wait: number; nibbles: number[]; from: number; shade?: Shade }
  | { at: "striking" }
  | { at: "fight"; fish: FishId; size: number; strike: Strike; reaction: number }
  | { at: "result"; how: "landed" | "snapped" | "slipped" | "early" | "missed"; what?: CatchId; size?: number; kept?: boolean; record?: boolean };

/** How long a nibble's twitch shows, in seconds. */
const NIBBLE = 0.55;
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
  const [bait, setBait] = useState<BaitId>("worm");
  const [note, setNote] = useState<string | null>(null);
  /** In the trial, the wait can be cut to a fifth, to try the fight without the fishing. */
  const [quick, setQuick] = useState(false);
  // The sounds: the line through the air, the float's plop, a nibble, the bite, the reel's ticking, and how it ends.
  const [sound, setSound] = useState(() => sfx.on);

  const now = keeper.now(), purse = keeper.purse(), hour = bangkokHour(now);
  const stamina = Math.round(staminaOf(purse, now)), spent = isSpent(purse, now);
  // (every buff I have: a meal's, and the fountain's blessings)
  const buffs = buffsOf(purse, now), keen = buffs.includes("keen"), lucky = buffs.includes("lucky");
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
  const write = useCallback((how: FishingEnd, more: { reaction?: number | null; strike?: Strike | null; kept?: boolean; record?: boolean; what?: CatchId; size?: number } = {}) => {
    const o = out.current, b = bout.current;
    out.current = null;
    bout.current = null;
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

  /* ── dropping the line, and waiting ── */
  const drop = async () => {
    if (!gear.rod || !baits.length || afloat.current) return;
    setNote(null);
    sfx.wake();
    sfx.play("cast");
    afloat.current = true;
    setPhase({ at: "casting" });
    // (how long until the bite, and when the float twitches first: never what is on its way)
    const cast = await keeper.cast(inHand, place, rain, quick);
    if (!cast.ok) {
      afloat.current = false;
      const w = WHY[cast.why as keyof typeof WHY] ?? WHY.none;
      setNote(th ? w[0] : w[1]);
      setPhase({ at: "ready" });
      return;
    }
    out.current = { bait: inHand, hour, rain, gear, wait: cast.wait, nibbles: cast.nibbles.length };
    setPhase({ at: "waiting", wait: cast.wait, nibbles: cast.nibbles, from: performance.now() - cast.lag * 1000, ...(cast.shade ? { shade: cast.shade } : {}) });
  };
  const float = useRef<HTMLSpanElement>(null), ring = useRef<HTMLSpanElement>(null), thread = useRef<SVGLineElement>(null);
  useEffect(() => {
    if (phase.at !== "waiting") return;
    const { from } = phase, cast = phase, grace = strikeWindow({ keen, spent, gear: out.current?.gear });
    let raf = 0, heard = -1, under = false;
    const frame = (t: number) => {
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
      if (ring.current) {
        const since = bitten ? s - cast.wait : nibbling ? s - cast.nibbles.find((n) => s >= n && s < n + NIBBLE)! : -1;
        ring.current.style.opacity = since >= 0 ? String(Math.max(0, 1 - since / (bitten ? 1.2 : NIBBLE))) : "0";
        ring.current.style.transform = `scale(${since >= 0 ? (bitten ? 1 + since * 1.6 : 0.6 + since) : 0.5})`;
      }
      if (s > cast.wait + grace) {
        sfx.play("missed");
        afloat.current = false;
        void keeper.missed().then((it) => write("missed", it));
        setPhase({ at: "result", how: "missed" });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, keen, spent, reduced, show, write, sfx, keeper]);

  /** Strike: at a nibble or before anything it scares the fish off; within moments of the bite it sets the hook. */
  const strike = useCallback(async () => {
    if (phase.at !== "waiting") return;
    const { wait, from } = phase, p = keeper.purse(), t = keeper.now();
    const reaction = Math.round(((performance.now() - from) / 1000 - wait) * 1000) / 1000;
    // How good a strike it was is this hand's to say, and heard at once; whether anything is on the hook, and what,
    // is the keeper's (its clock gives a moment's grace either way).
    const hit = strikeOf(reaction, { keen: hasBuff(p, t, "keen"), spent: isSpent(p, t), gear: out.current?.gear });
    sfx.wake();
    sfx.play(!hit ? "early" : hit === "perfect" ? "perfect" : "strike");
    setPhase({ at: "striking" });
    const did = await keeper.strike(reaction, hit);
    if (!did.ok || !did.hooked) {
      afloat.current = false;
      const how = did.ok && did.how === "missed" ? "missed" : "early";
      if (hit) sfx.play(how);
      write(how, { reaction, what: did.ok ? did.what : undefined, size: did.ok ? did.size : undefined });
      setPhase({ at: "result", how });
      return;
    }
    // (taken by the keeper's grace when this hand thought it too soon: a late one's worth)
    const worth: Strike = hit ?? "late";
    if (!hit) sfx.play("strike");
    if (did.landed || !did.what || !(did.what in FISH)) {
      // no fish: it comes in with no fight
      afloat.current = false;
      const landed = { kept: !!did.kept, record: !!did.record };
      window.setTimeout(() => sfx.play("flotsam"), 350);
      onLanded();
      write("landed", { reaction, strike: worth, ...landed, what: did.what, size: 0 });
      setPhase({ at: "result", how: "landed", what: did.what, size: 0, ...landed });
      return;
    }
    if (out.current) { out.current.what = did.what; out.current.size = did.size ?? 0; }
    setPhase({ at: "fight", fish: did.what as FishId, size: did.size ?? 0, strike: worth, reaction });
  }, [phase, keeper, write, sfx, onLanded]);

  /* ── the fight ── */
  const holding = useRef(false);
  const fight = useRef<Fight | null>(null);
  const gauge = { needle: useRef<HTMLSpanElement>(null), band: useRef<HTMLSpanElement>(null), line: useRef<HTMLSpanElement>(null),
    strain: useRef<HTMLSpanElement>(null), slack: useRef<HTMLSpanElement>(null), fish: useRef<HTMLSpanElement>(null), word: useRef<HTMLSpanElement>(null),
    swim: useRef<HTMLSpanElement>(null), taut: useRef<SVGLineElement>(null) };
  useEffect(() => {
    if (phase.at !== "fight") return;
    const p = keeper.purse(), t0 = keeper.now(), seed = Math.floor(Math.random() * 2 ** 31);
    let f = startFight(phase.fish, phase.strike, { spent: isSpent(p, t0), calm: hasBuff(p, t0, "calm"), gear: out.current?.gear }, seed);
    const log = { seed, holds: [] as number[], steps: 0, inside: 0, secs: 0, strike: phase.strike, reaction: phase.reaction };
    bout.current = log;
    // (the fight's stamina was taken as the hook was set: a fight costs it whatever comes of it)
    fight.current = f;
    holding.current = false;
    show("fight");
    let raf = 0, last = performance.now(), owed = 0, was = false, thrashing = false, creak = 0;
    const frame = (t: number) => {
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
        gauge.taut.current.setAttribute("stroke", f.strain >= 0.75 ? "#ff7a5c" : f.strain >= 0.4 ? "#ffd27a" : "#f0f0eb");
      }
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
      if (gauge.word.current) gauge.word.current.textContent = wild ? (th ? "ปลาดิ้น!" : "It surges!") : about ? (th ? "ปลากำลังจะดิ้น" : "It is about to surge") : f.tension > f.hi ? (th ? "ตึงไป!" : "Too tight!") : f.tension < f.lo ? (th ? "หย่อนไป!" : "Too slack!") : (th ? "สาวสายได้" : "Reel");
      if (f.over) {
        // How it ended is told to the keeper, with this hand's account of the fight; the keeper has the last word (a
        // fish landed sooner than any fight could be is one that slipped).
        afloat.current = false;
        sfx.reel(false, false, 0);
        const told = { seed: log.seed, steps: log.steps, secs: Math.round(log.secs * 10) / 10, inBand: log.steps ? Math.round((log.inside / log.steps) * 1000) / 1000 : 0,
          strike: log.strike, holds: log.holds.slice(0, 1500) };
        void keeper.land(f.over, told).then((end) => {
          const how = end.how === "landed" || end.how === "snapped" ? end.how : "slipped";
          if (how === "landed") { sfx.play("landed", FISH[phase.fish].tier); onLanded(); if (end.record) window.setTimeout(() => sfx.play("record"), 1100); }
          else sfx.play(how);
          write(how, { kept: end.kept, record: end.record });
          setPhase({ at: "result", how, what: phase.fish, size: phase.size, kept: end.kept, record: end.record });
        });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); fight.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a fight runs from when it begins; the gauge's refs do not change
  }, [phase, keeper, reduced, th, show, write, sfx, onLanded]);

  useEffect(() => { if (phase.at === "ready" || phase.at === "result") show(null); else if (phase.at === "casting") show("wait"); }, [phase, show]);

  // The keyboard (the owner: "การเล่น mini game ตกปลา ช่วยทำให้กดปุ่ม space bar แทนได้"): the space bar does whatever the
  // big button does: drops the line, strikes, is held to reel, and drops again; Escape puts the rod away. Heard
  // before the town hears it, and before a button that happens to have the focus does.
  const dropRef = useRef<() => void>(() => {});
  useEffect(() => {
    const key = (down: boolean) => (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && (target as HTMLInputElement).type !== "checkbox")) return;
      if (e.key === "Escape" && down) { e.preventDefault(); onClose(); return; }
      if (e.key !== " " && e.code !== "Space") return;
      e.preventDefault();
      e.stopPropagation();
      if (phase.at === "fight") { holding.current = down; if (down) sfx.wake(); return; }
      if (!down || e.repeat) return;
      if (phase.at === "waiting") void strike();
      else if (phase.at === "ready") dropRef.current();
      else if (phase.at === "result") setPhase({ at: "ready" });
    };
    const down = key(true), up = key(false);
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); };
  }, [phase, strike, onClose, sfx]);
  // (the way to drop the line is made anew each time the panel is drawn: the keyboard is given the newest)
  useEffect(() => { dropRef.current = () => { void drop(); }; });

  // (for scripts in `next dev`: what is happening, and a hand on the reel)
  useEffect(() => {
    const handle = {
      phase: () => phase.at, cast: () => (phase.at === "waiting" ? { wait: phase.wait, nibbles: phase.nibbles, since: (performance.now() - phase.from) / 1000 } : null),
      fight: () => fight.current, hold: (on: boolean) => { holding.current = on; }, strike, result: () => (phase.at === "result" ? phase : null),
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
              <div className="mt-2 flex items-center gap-2">
                {process.env.NODE_ENV !== "production" && trial && (
                  <label className="flex min-h-11 items-center gap-1.5 text-meta text-[#e9cfa4]">
                    <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
                    {th ? "โหมดลอง: รอสั้นลงห้าเท่า" : "Trial: a fifth of the wait"}
                  </label>
                )}
                <button type="button" onClick={() => { void drop(); }}
                        className="pressable ml-auto min-h-11 rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] px-5 text-ui font-semibold text-[#3a2209] shadow-[inset_0_-3px_0_#c98f2f]">
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
            {phase.at === "waiting" && lucky && <Twinkle size={20} className="absolute -translate-y-6 translate-x-7" />}
            <span ref={ring} className="absolute size-10 rounded-full border-2 border-white/80 opacity-0" />
            <span ref={float} className="relative transition-opacity duration-150"><TownIcon name="bobber" size={34} /></span>
          </div>
          {/* (nothing is said of when to strike: the float shows it, and a strike too soon or too late says why it failed) */}
          <button type="button" onClick={() => { void strike(); }} disabled={phase.at !== "waiting"} className={`${BIG} mt-2 disabled:opacity-70`}>
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

      {phase.at === "result" && (
        <div className="mt-2" aria-live="polite">
          {phase.how === "landed" && phase.what ? (
            <div className="flex items-center gap-3">
              <ItemIcon id={phase.what} size={52} />
              <div className="min-w-0">
                <p className="text-read font-semibold text-[#fff6e3]">{th ? `ได้ ${name(phase.what)}` : `You landed: ${name(phase.what)}`}{phase.size ? (th ? ` ยาว ${phase.size} ซม.` : `, ${phase.size} cm`) : ""}</p>
                {phase.record && <p className="text-ui font-semibold text-[#ffe19a]">{th ? "ตัวยาวที่สุดที่เคยจับได้!" : "Your longest yet!"}</p>}
                {phase.kept === false && <p className="text-meta text-[#ffb09c]">{th ? "กระเป๋าเต็ม เลยปล่อยกลับลงน้ำไป" : "Your bag is full, so it went back in the water."}</p>}
                <p className="text-meta text-[#e9cfa4]">{th ? ITEMS[phase.what].about.th : ITEMS[phase.what].about.en}</p>
              </div>
            </div>
          ) : (
            <p className="text-read text-[#fff6e3]">
              {phase.how === "snapped" ? (th ? "สายขาด! ปลาหนีไปพร้อมเหยื่อ" : "The line snapped! It is gone, with the bait.")
                : phase.how === "slipped" ? (th ? "เบ็ดหลุด ปลาหนีไปแล้ว" : "The hook slipped. It got away.")
                  : phase.how === "early" ? (th ? "ตวัดเร็วไป ปลายังไม่กินเบ็ด มันตกใจหนีไปแล้ว" : "Too soon: it had not taken the hook, and now it has fled.")
                    : (th ? "ช้าไป ปลากินเหยื่อแล้วว่ายหนีไป" : "Too late: it ate the bait and swam off.")}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-1.5">
            <button type="button" onClick={onClose} className="pressable min-h-11 rounded-full px-3 text-ui text-[#e9cfa4] hover:text-[#fff6e3]">{th ? "พอแล้ว" : "That will do"}</button>
            <button type="button" onClick={() => setPhase({ at: "ready" })} className="pressable min-h-11 rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] px-5 text-ui font-semibold text-[#3a2209] shadow-[inset_0_-3px_0_#c98f2f]">{th ? "หย่อนอีก" : "Again"}<Key /></button>
          </div>
        </div>
      )}
    </section>
  );
}

/** The key that does what a button does, shown on it where there is a keyboard to press (not on a phone's width). */
function Key() {
  return <kbd aria-hidden className="ml-2 hidden rounded border border-[#3a2209]/40 px-1.5 py-px align-middle font-data text-label font-normal uppercase tracking-wider text-[#3a2209]/80 sm:inline">Space</kbd>;
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
