"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BLADES, WATER, WILD, hitsFor, plotKey, roll, see, type Chore, type Deed, type Seen } from "@/lib/town/farm";
import { FIELD } from "@/lib/town/gear";
import { ITEMS, growIconOf, iconOf, type ItemId } from "@/lib/town/items";
import type { FishSfx, WorkSound } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import type { Keeper } from "@/lib/town/keeper";
import { FARM, WELL, bedCorner, plotAt, type Vec } from "@/lib/town/world";
import { ICON_ATLAS, type IconName } from "./TownIcon";
import TownTiming, { type TimingResult } from "./TownTiming";
import { WHY } from "./TownTrade";
import { Vfx, type VfxKind } from "./vfx";

/** What the map hands the farm each frame, to draw its plots among everything else. */
export interface FarmFrame {
  ctx: CanvasRenderingContext2D;
  things: Array<{ depth: number; draw: () => void }>;
  project: (t: Vec) => Vec;
  onScreen: (p: Vec) => boolean;
  /** Write a few words over a point of the screen, as the map writes its own signs. */
  sign: (text: string, x: number, y: number) => void;
  /** The map's scale: screen pixels to one of its own. */
  s: number;
  now: number;
  img: HTMLImageElement | null;
  still: boolean;
  th: boolean;
  /** Whether what is in the cooking yard can be seen: from outside it is a house, with its roof on. */
  indoors: boolean;
  /** Where I stand on the map, if I am in town. */
  self: Vec | null;
}
export type FarmDraw = (frame: FarmFrame) => void;

/** The word on the button for each deed, and for each chore with water. */
const VERB: Record<Deed | Chore, [th: string, en: string]> = {
  clear: ["ถางหญ้า", "Clear the weeds"], till: ["พรวนดิน", "Till the soil"], pull: ["ถอนทิ้ง", "Pull it up"], sow: ["หว่านเมล็ด", "Sow"],
  water: ["รดน้ำ", "Water"], feed: ["ใส่ปุ๋ย", "Feed"], cure: ["ไล่แมลง", "Drive the pest off"], pick: ["เก็บ", "Pick"],
  draw: ["ตักน้ำ", "Draw water"], pour: ["เทน้ำลงบ่อ", "Pour it into the well"], fill: ["เติมน้ำใส่บัว", "Fill the can"],
};
const WHY_FARM: Record<string, [string, string]> = {
  hand: ["ของในมือทำอะไรกับแปลงนี้ไม่ได้", "What you hold does nothing here"], soil: ["แปลงนี้ยังไม่พร้อม", "This plot is not ready for that"],
  wet: ["เพิ่งรดไป", "Watered already"], theirs: ["แปลงนี้มีเจ้าของแล้ว", "This bed is somebody's"], unripe: ["ยังไม่สุก", "Not ripe yet"],
  beds: ["มีแปลงของตัวเองครบแล้ว", "You hold as many beds as you may"],
  tired: ["หมดแรง จอบหลุดมือ", "Too tired: the hoe slips from your hands"],
  shaky: ["หมดแรง มือสั่นจนทำไม่สำเร็จ", "Too tired: your hands shake, and it comes to nothing"],
};
/** The work that is done with water: its short round (tired hands play one) runs along a strip of water, not of earth. */
const WATERY: Array<Deed | Chore> = ["water", "draw", "pour", "fill"];
/** What runs along the strip in that short round: the thing in the hand, or the hand itself (picking takes no tool, unless a blade is held). */
function toolIcon(work: Deed | Chore, hand: ItemId | null): IconName {
  const name = work === "pick" && hand !== BLADES.plant && hand !== BLADES.tree ? "hand" : hand ? iconOf(hand) : "hand";
  return (name in ICON_ATLAS.icons ? name : "hand") as IconName;
}
/** What flies up at each deed, and what it sounds like (the owner, 2026-10-03: "ปลูกพืช ช่วยใช้ vfx ที่เหมาะสมด้วยนะครับ ตอนนี้เหมือน ตกปลาเลย"). */
const DEED_FX: Record<Deed, [VfxKind, WorkSound]> = {
  clear: ["leaves", "pull"], till: ["soil", "hoe"], pull: ["soil", "pull"], sow: ["seeds", "sow"], water: ["water", "water"], feed: ["dust", "feed"], cure: ["mist", "spray"], pick: ["sparkle", "pick"],
};
/** And at each chore with water. */
const CHORE_FX: Record<Chore, [VfxKind, WorkSound]> = { draw: ["splash", "dip"], pour: ["splash", "pour"], fill: ["water", "pour"] };
/** How big a plant is drawn: screen pixels to one of its picture's, at the map's own scale 1. */
const PLANT = 0.62;

/**
 * What grows wild on a plot nobody has cleared (the owner, 2026-10-03: "วัชพืช
 * ตอนนี้มีแค่แบบเดียว มันเลยดูเป้นระเบียบเกินไป ช่วย gen มาหลายๆแบบ และ random ลงในดิน เพื่อที่จะได้
 * ดูเป็นธรรมชาติขึ้น"): none, one, two or three weeds of thirteen kinds, each where
 * it happens to stand in the plot, as big as it happens to be, facing either
 * way. From the plot's own tile, so the same for everybody, and the same
 * tomorrow.
 */
const WEEDS = ["weedTuft", "weedTall", "weedClover", "weedDandelion", "weedThistle", "weedCreeper", "weedBroad", "weedFern", "weedDry", "weedBlue", "weedSeed", "weedStone", "plotWeeds"] as const;
interface Weed { name: IconName; dx: number; dy: number; k: number; flip: boolean }
const weedsAt = new Map<string, Weed[]>();
function weedsOf(tx: number, ty: number): Weed[] {
  const key = plotKey(tx, ty), have = weedsAt.get(key);
  if (have) return have;
  const many = roll("weeds", tx, ty), n = many < 0.07 ? 0 : many < 0.42 ? 1 : many < 0.84 ? 2 : 3;
  const out = Array.from({ length: n }, (_, i): Weed => ({
    name: WEEDS[Math.floor(roll("kind", tx, ty, i) * WEEDS.length)],
    dx: (roll("dx", tx, ty, i) - 0.5) * 30, dy: (roll("dy", tx, ty, i) - 0.5) * 12,
    k: 0.4 + roll("size", tx, ty, i) * 0.3, flip: roll("flip", tx, ty, i) < 0.5,
  })).sort((a, b) => a.dy - b.dy);
  weedsAt.set(key, out);
  return out;
}

/**
 * The vegetable plots, to tend (the owner, 2026-10-03: "ช่วยลองเทสด้วยว่า … การปลูกผัก
 * พร้อมที่จะเล่นได้จริง"). The rules are lib/town/farm's. Standing on a plot, what
 * can be done to it with the thing in the hand is offered as one button: a
 * hoe clears weeds, tills and pulls up what has died (each by the game of
 * timing); a seed is sown; a can waters; a fertiliser feeds; a cure drives a
 * pest off; and a ripe plant of one's own bed is picked. By the river a bucket
 * is filled, at the farm's well it is poured in, and a can is filled there.
 * Nothing says which thing does what: the button only shows when the hand
 * holds the right one. With no stamina left everything but the hoe's work is a
 * short round of the hoe's game as well (lib/town/farm's hitsFor), and all of
 * it is dropped at the third miss.
 *
 * It also draws every plot on the map, each frame: weeds, tilled soil, a
 * plant at its stage, a pest on it, the shine of a ripe one; whose each bed
 * is, and how much water the well has.
 *
 * What is kept is the keeper's (lib/town/keeper): for a member the database's,
 * one farm for the whole town; in `next dev`'s test room the browser's trial,
 * one farm for the browser.
 */
export default function TownFarm({ keeper, name, th, tile, water, at, near, sfx, bottom, register }: {
  keeper: Keeper;
  /** What I am called, for the name plate of a bed I take. */
  name: string;
  th: boolean;
  /** The plot I stand on, when I stand still on one. */
  tile: [number, number] | null;
  /** Whether I stand still by the river, or at the farm's well; and the tile I stand on there (the database is told where). */
  water: "river" | "well" | null;
  at: [number, number] | null;
  /** Whether I am on the farm's map: what others do there is kept in sight while I am. */
  near: boolean;
  sfx: FishSfx | null;
  /** How far up from the foot of the map the button and the game sit. */
  bottom: string;
  /** Hand the map the way to draw the plots (and take it back with null). */
  register: (draw: FarmDraw | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 5000);
    return () => { stop(); clearInterval(t); };
  }, [keeper]);
  useEffect(() => (near ? keeper.look("farm") : undefined), [near, keeper]);
  /** The work being done by the game of timing: on which plot (none, for carrying water), what, and how many hits it asks for. */
  const [working, setWorking] = useState<{ key: string | null; work: Deed | Chore; need: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2600); return () => clearTimeout(t); }, [note]);
  /** What is in the air over the plots: earth, leaves, water, a sparkle. */
  const vfx = useMemo(() => new Vfx(), []);

  // What every tended plot shows now, whose every bed is, and the well's water: looked at afresh when the farm changes
  // and every few seconds, not every frame.
  const now = keeper.now(), plots = keeper.farm();
  const seen = useRef(new Map<string, Seen>());
  seen.current = new Map(Object.entries(plots).map(([key, plot]) => [key, see(key, plot, now)]));
  const owners = useRef(keeper.owners());
  owners.current = keeper.owners();
  const well = useRef(0);
  well.current = keeper.well();

  // The plots, drawn among everything else on the map.
  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, sign, s, now: t, img, still, th: thai } = frame;
      vfx.draw(frame);
      if (!img?.complete || !img.naturalWidth) return;
      const blit = (name: string, at: Vec, lift = 0, k = PLANT * s, flip = false) => {
        const cell = ICON_ATLAS.icons[name as IconName];
        if (!cell) return;
        const [x, y, w, h] = cell;
        ctx.imageSmoothingEnabled = false;
        if (!flip) { ctx.drawImage(img, x, y, w, h, Math.round(at.x - (w * k) / 2), Math.round(at.y - h * k + 5 * s - lift), w * k, h * k); return; }
        ctx.save();
        ctx.translate(Math.round(at.x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, x, y, w, h, -(w * k) / 2, Math.round(at.y - h * k + 5 * s - lift), w * k, h * k);
        ctx.restore();
      };
      for (let v = 0; v < FARM.h; v++) for (let u = 0; u < FARM.w; u++) {
        const tx = FARM.x + u, ty = FARM.y + v;
        if (!plotAt(tx, ty)) continue;
        const at = project({ x: tx + 0.5, y: ty + 0.5 });
        if (!onScreen(at)) continue;
        const what = seen.current.get(plotKey(tx, ty));
        things.push({ depth: tx + ty + 0.6, draw: () => {
          if (!what) { for (const w of weedsOf(tx, ty)) blit(w.name, { x: at.x + w.dx * s, y: at.y + w.dy * s }, 0, PLANT * s * w.k, w.flip); return; }
          if (what.soil === "tilled") blit("plotSoil", at, 0, PLANT * s * 0.9);
          if (!what.crop) return;
          if (what.dead) { blit("plotDead", at); return; }
          blit(growIconOf(what.crop, what.stage), at);
          if (what.wet) blit("plotDrop", { x: at.x + 13 * s, y: at.y }, 0, PLANT * s * 0.45);
          if (what.pest) blit("plotBug", { x: at.x - 10 * s, y: at.y }, (still ? 0 : Math.sin(t / 160 + tx) * 2 + 14) * s, PLANT * s * 0.5);
          else if (what.ripe && (still || Math.floor(t / 420 + tx + ty) % 3 !== 0)) blit("plotShine", { x: at.x + 9 * s, y: at.y }, 20 * s, PLANT * s * 0.5);
        } });
      }
      // whose each bed is, on a plate at its far corner; and the water in the well, over it
      for (const [bed, who] of owners.current) {
        const [bx, by] = bedCorner(bed), at = project({ x: bx, y: by });
        if (onScreen(at)) sign(thai ? `แปลงของ ${who.name}` : `${who.name}'s bed`, at.x, at.y - 6 * s);
      }
      const top = project({ x: WELL.x + 0.5, y: WELL.y + 0.5 });
      if (onScreen(top)) sign(`${thai ? "บ่อน้ำ" : "Well"} ${well.current}/${WATER.well}`, top.x, top.y - 66 * s);
    });
    return () => register(null);
  }, [register, vfx]);

  const key = tile ? plotKey(tile[0], tile[1]) : null;
  const purse = keeper.purse(), hand = handOf(purse);
  const deed = key ? keeper.deedAt(key) : null;
  const chore = !deed ? keeper.choreAt(water) : null;
  const nameOf = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const say = useCallback((why: string) => { const w = WHY_FARM[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);

  /** Do the deed, and say what came of it. */
  const act = useCallback(async (k: string, timing?: TimingResult) => {
    // (every miss of the hoe is a little more stamina gone: the keeper's to take)
    const did = await keeper.farmDo(k, name, timing ? { hits: timing.hits, misses: timing.misses, secs: timing.secs, need: timing.need } : undefined);
    if (!did.ok) { say(did.why); return; }
    if (timing) keeper.record({ game: "farming", at: keeper.now(), won: true, secs: timing.secs, spent: isSpent(purse, now), buff: null, what: did.deed, need: timing.need, hits: timing.hits, misses: timing.misses });
    setNote(did.got.length ? did.got.map(([id, n]) => `${nameOf(id)} ×${n}`).join(" · ") : null);
    // what flies up over the plot, and what it sounds like (the hoe's own swings were heard as they were made)
    const [x, y] = k.split(",").map(Number), at = { x: x + 0.5, y: y + 0.5 }, [fx, sound] = DEED_FX[did.deed];
    sfx?.wake();
    if (!timing) sfx?.work(sound);
    vfx.add(fx, at);
    if (did.got.length) vfx.add("pop", at, { icon: did.got[0][0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the purse and the clock are read when the deed is done
  }, [keeper, th, sfx, name, say, vfx]);
  /** Draw a bucket of water, pour it into the well, or fill the can. */
  const carry = useCallback(async () => {
    const did = await keeper.choreDo(water, at);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work(CHORE_FX[did.chore][1], did.chore === "fill" ? 0.7 : 1);
    vfx.add(CHORE_FX[did.chore][0], null, { lift: did.chore === "fill" ? 10 : 0 });
    if (did.chore !== "draw") setNote(`${th ? "บ่อน้ำ" : "Well"} ${keeper.well()}/${WATER.well}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the tile is told by its two numbers
  }, [keeper, water, at?.[0], at?.[1], sfx, th, say, vfx]);
  const begin = useCallback(() => {
    const work = key && deed ? deed : chore;
    if (!work) return;
    // the hoe's work is the game of timing; with no stamina left so is everything else, a short round of it
    const need = hitsFor(work, isSpent(keeper.purse(), keeper.now()));
    if (need) setWorking({ key: key && deed ? key : null, work, need });
    else if (key && deed) void act(key);
    else void carry();
  }, [key, deed, chore, act, carry, keeper]);
  // walking off the plot, or away from the water, leaves the work
  useEffect(() => { if (working && (working.key ? working.key !== key : working.work !== chore)) setWorking(null); }, [working, key, chore]);
  const hoeing = working?.work === "clear" || working?.work === "till";
  const offer = deed ?? chore;

  // The space bar is the button (while the timing game is up it is the game's).
  useEffect(() => {
    if (working || !offer) return;
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      if ((e.key !== " " && e.code !== "Space") || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      begin();
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [working, offer, begin]);

  // (for scripts in `next dev`: what stands in a plot, the deed or the chore on offer, the well and whose the beds are)
  useEffect(() => {
    const handle = {
      seen: (k: string) => seen.current.get(k) ?? see(k, WILD, keeper.now()), deed: () => deed, chore: () => chore, act: begin, plots: () => keeper.farm(),
      well: () => keeper.well(), owners: () => [...keeper.owners()].map(([bed, who]) => ({ bed, ...who })), weeds: (x: number, y: number) => weedsOf(x, y).map((w) => w.name),
    };
    (window as unknown as { __townFarm?: typeof handle }).__townFarm = handle;
    return () => { delete (window as unknown as { __townFarm?: typeof handle }).__townFarm; };
  }, [deed, chore, begin, keeper]);

  if (!working && !offer && !note) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {working ? (
        <div className="pop-in pointer-events-auto w-full max-w-[26rem]" data-state="open">
          <TownTiming th={th} title={th ? VERB[working.work][0] : VERB[working.work][1]} verb={hoeing ? (th ? "ฟันจอบ" : "Swing") : th ? "ออกแรง" : "Steady"} need={working.need}
                      mods={{ tool: hand ? FIELD[hand] ?? 1 : 1, spent: isSpent(purse, now), drops: true }}
                      look={WATERY.includes(working.work) ? "water" : "hoe"} icon={hoeing ? undefined : toolIcon(working.work, hand)}
                      onHit={(hit) => {
                        sfx?.wake();
                        // (tired hands at lighter work: only a miss is heard, the work's own sound comes when it is done)
                        if (!hoeing || !working.key) { if (!hit) sfx?.work("knock"); return; }
                        // the blade into the earth, and what it throws up
                        sfx?.work(hit ? "hoe" : "knock");
                        const [x, y] = working.key.split(",").map(Number);
                        if (hit) vfx.add(working.work === "clear" ? "leaves" : "soil", { x: x + 0.5, y: y + 0.5 });
                      }}
                      onDone={(result) => {
                        const { key: k, work } = working;
                        setWorking(null);
                        // (a round of tired hands is written down whatever its end; the hoe's own, when it is done, with the deed)
                        if (result.dropped || !hoeing) keeper.record({ game: "farming", at: keeper.now(), won: !result.dropped, secs: result.secs, spent: true, buff: null, what: work, need: result.need, hits: result.hits, misses: result.misses });
                        // with no stamina left the work is dropped at the third miss: nothing is done
                        if (result.dropped) { say(hoeing ? "tired" : "shaky"); return; }
                        if (k) void act(k, hoeing ? result : undefined);
                        else void carry();
                      }}
                      onCancel={() => setWorking(null)} />
        </div>
      ) : offer && (
        <button type="button" onClick={begin}
                className="pop-in pressable pointer-events-auto mb-14 flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-read font-semibold text-bg shadow-xl shadow-black/40" data-state="open">
          {th ? VERB[offer][0] : VERB[offer][1]}
          <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>
        </button>
      )}
    </div>
  );
}
