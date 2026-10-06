"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BLADES, FARMING, WATER, WILD, cropOf, gameFor, hardFor, hitsFor, plotKey, pouchSeeds, quickUntil, ridCameOf, roll, see, type Chore, type Deed, type RowDeed, type Seen } from "@/lib/town/farm";
import { FIELD } from "@/lib/town/gear";
import { ITEMS, growIconOf, iconOf, type CropId, type ItemId } from "@/lib/town/items";
import type { FishSfx, WorkSound } from "@/lib/town/sfx";
import { FAMILIAR_AWAY } from "@/lib/town/familiar-away";
import { giftOf, type GiftId } from "@/lib/town/gifts";
import { buffBy, isSpent } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import { NATURE_NAMES, type Nature } from "@/lib/town/waters";
import type { Keeper } from "@/lib/town/keeper";
import { FARM, WELL, bedCorner, bedOf, plotAt, type Vec } from "@/lib/town/world";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import type { GameResult } from "./TownGame";
import { BURST, BuffAura, atPlot, seenAtPlot } from "./TownBuffFx";
import TownPouring from "./TownPouring";
import TownSteady from "./TownSteady";
import TownSweep from "./TownSweep";
import TownTiming from "./TownTiming";
import TownWeeding from "./TownWeeding";
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
  /** How dark it is, none (0) to night (1): the lamps' own measure. */
  dark?: number;
  /** Draw something over the hour's light and the night's dark, as the signs are: what is to show in the dark as it is. */
  over?: (draw: () => void) => void;
  /** Everybody on the map as this screen has them, myself among them: where, whether they are walking, and what they hold (lib/town/insects minds them). */
  people?: () => Array<{ id: string; x: number; y: number; moving: boolean; hold: ItemId | null }>;
}
export type FarmDraw = (frame: FarmFrame) => void;

/** A piece of the farm's work: a deed to a plot, a chore with water, or a bucket poured over a bed (lib/town/ditch). */
type Work = Deed | Chore | "ditch";
/** The word on the button for each deed, and for each chore with water. */
const VERB: Record<Work, [th: string, en: string]> = {
  ditch: ["เทน้ำรดทั้งแปลง", "Pour it over the bed"],
  clear: ["ถางหญ้า", "Clear the weeds"], till: ["พรวนดิน", "Till the soil"], pull: ["ถอนทิ้ง", "Pull it up"], uproot: ["ขุดออก", "Dig it out"], sow: ["หว่านเมล็ด", "Sow"],
  water: ["รดน้ำ", "Water"], feed: ["ใส่ปุ๋ย", "Feed"], cure: ["ไล่แมลง", "Drive the pest off"], pick: ["เก็บ", "Pick"],
  draw: ["ตักน้ำ", "Draw water"], pour: ["เทน้ำลงบ่อ", "Pour it into the well"], fill: ["เติมน้ำใส่บัว", "Fill the can"],
};
/** An insect in the hand is let go on a plant, not spread on it: the button says so (the deed is the fertiliser's all the same: lib/town/farm's PUT_ON). */
const LET_GO: [th: string, en: string] = ["ปล่อยแมลง", "Let it go"];
const verbOf = (work: Work, hand: ItemId | null): [th: string, en: string] => (work === "feed" && hand && ITEMS[hand].kind === "bug" ? LET_GO : VERB[work]);
const WHY_FARM: Record<string, [string, string]> = {
  hand: ["ของในมือทำอะไรกับแปลงนี้ไม่ได้", "What you hold does nothing here"], soil: ["แปลงนี้ยังไม่พร้อม", "This plot is not ready for that"],
  wet: ["เพิ่งรดไป", "Watered already"], theirs: ["แปลงนี้มีเจ้าของแล้ว", "This bed is somebody's"], unripe: ["ยังไม่สุก", "Not ripe yet"],
  beds: ["มีแปลงของตัวเองครบแล้ว", "You hold as many beds as you may"],
  // (the page thought the plant dead and asked about a dead one; it lives: somebody cured it just now)
  sure: ["ต้นนี้ยังไม่ตาย ถ้าจะขุดออกให้กดอีกครั้ง", "It is alive after all: ask again to dig it out"],
  tired: ["หมดแรง จอบหลุดมือ", "Too tired: the hoe slips from your hands"],
  // (the gifts of the farming line: what each is refused for, where the plain words do not say it)
  running: ["ทรายยังไหลอยู่", "The sand is still running here"], spent: ["วันนี้ใช้ไปแล้ว", "Used already today"],
  shaky: ["หมดแรง มือสั่นจนทำไม่สำเร็จ", "Too tired: your hands shake, and it comes to nothing"],
};
/** What water is poured into (or onto, or taken from) in each piece of work that is done with it: the picture beside the thing in the hand. */
const INTO: Partial<Record<Work, IconName>> = { water: "plotSprout", draw: "plotDrop", pour: "well", fill: "well", ditch: "plotSprout" };
/** The word on the button that is held for each of them. */
const HOLD: Partial<Record<Work, [th: string, en: string]>> = {
  water: ["กดค้างรด", "Hold to water"], draw: ["กดค้างตัก", "Hold to draw"], pour: ["กดค้างเท", "Hold to pour"], fill: ["กดค้างเติม", "Hold to fill"], ditch: ["กดค้างเท", "Hold to pour"],
};
/** What is in the hand for a piece of work: the thing held, or the hand itself (picking takes no tool, unless a blade is held). */
function toolIcon(work: Work, hand: ItemId | null): IconName {
  const name = work === "pick" && hand !== BLADES.plant && hand !== BLADES.tree ? "hand" : hand ? iconOf(hand) : "hand";
  return (name in ICON_ATLAS.icons ? name : "hand") as IconName;
}
/** What flies up at each deed, and what it sounds like (the owner, 2026-10-03: "ปลูกพืช ช่วยใช้ vfx ที่เหมาะสมด้วยนะครับ ตอนนี้เหมือน ตกปลาเลย"). */
const DEED_FX: Record<Deed, [VfxKind, WorkSound]> = {
  clear: ["leaves", "pull"], till: ["soil", "hoe"], pull: ["soil", "pull"], uproot: ["soil", "pull"], sow: ["seeds", "sow"], water: ["water", "water"], feed: ["dust", "feed"], cure: ["mist", "spray"], pick: ["sparkle", "pick"],
};
/** And at each chore with water. */
const CHORE_FX: Record<Chore, [VfxKind, WorkSound]> = { draw: ["splash", "dip"], pour: ["splash", "pour"], fill: ["water", "pour"] };
/** The light about the well while its water has a nature (lib/town/waters): the dew's gold, the rain's blue, the moon's silver. */
const NATURE_GLOW: Record<Nature, string> = { dawn: "#ffd98a", rain: "#9fd0ff", moon: "#e8ecff" };
/** What a row's work is called on its button and its board, whole (lib/town/farm's rowFor). */
const ROW_VERB: Record<RowDeed, [th: string, en: string]> = { clear: ["ถางหญ้าทั้งแถว", "Clear the whole row"], till: ["พรวนดินทั้งแถว", "Till the whole row"], sow: ["หว่านทั้งแถว", "Sow the whole row"], pick: ["เกี่ยวทั้งแถว", "Reap the whole row"] };
/** The gift whose power each of them is: its picture is on the button. */
const ROW_GIFT: Record<RowDeed, GiftId> = { clear: "charmHoe", till: "charmHoe", sow: "thingPouch", pick: "charmSickle" };
/** The button of a gift's power, beside the plain deed's: the town's own wood and gold, with the gift's picture (the plain one stays the page's accent, and the space bar's). */
const GIFT_BTN = "pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border-2 border-[#f0c060] bg-[#3a2513]/95 py-1 pl-2 pr-4 text-ui font-semibold text-[#ffeccb] shadow-xl shadow-black/40";
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
 * hoe clears weeds and tills (each by the game of timing), and in one's own
 * bed digs a plant out, dead or living, which is no game but is asked for
 * twice (the owner, 2026-10-04: "ไม่ต้องเล่นมินิเกม แต่ต้องกด ยืนยันก่อนว่าจะเอาออกจริง");
 * a seed is sown; a can waters; a fertiliser feeds; a cure drives a pest off
 * (and an insect that eats pests, let go on a plant that has one, eats it or
 * is off: which, is said in a word, since the insect is gone either way);
 * and a ripe plant of one's own bed is picked. By the river a bucket
 * is filled, at the farm's well it is poured in, and a can is filled there.
 * Nothing says which thing does what: the button only shows when the hand
 * holds the right one. Each piece of work that is a game is its own
 * (lib/town/farm's gameFor): weeds are pulled, soil is tilled by the hoe's
 * swing, and with no stamina left water is poured and everything else is
 * steadied by shaking hands, all of it dropped at the third miss; digging a
 * plant out is never a game.
 *
 * It also draws every plot on the map, each frame: weeds, tilled soil, a
 * plant at its stage, a pest on it, the shine of a ripe one; whose each bed
 * is, and how much water the well has. On a hot afternoon (lib/town/heat) the
 * air shimmers over every plant that could do with water: nothing says why.
 * While the well's water has a nature (lib/town/waters) motes of its colour
 * rise about the well and its sign names the water: nothing says what it does.
 *
 * With a bucket of water in the hand, standing on a plot of a bed that has
 * thirsty plants, the bucket is poured over the bed (lib/town/ditch): one
 * button, no game unless the hands are tired, when it is poured like any
 * water.
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
  /** (`row`: the plots of a bed's row that the enchanted hoe works at one swing, the one stood on first: a beat to each) */
  /** (`whole`: tired hands steadying themselves for a row's deed that has no game of its own, the pouch's sowing: done, the whole row is sown) */
  /** (`sweep`: the ripe plants of a row that the crescent sickle sweeps along once, from one end to the other: where each stands in the row, what it is, and how much harder it is for me) */
  const [working, setWorking] = useState<{ key: string | null; work: Work; need: number; row?: string[]; whole?: boolean; sweep?: Array<{ key: string; place: number; crop: CropId; hard: number }> } | null>(null);
  /** The plant I have been asked a second time about digging out: in which plot, and whether it is a dead one (pull) or a living (uproot). */
  const [asking, setAsking] = useState<{ key: string; deed: "pull" | "uproot" } | null>(null);
  const leaveIt = useRef<HTMLButtonElement>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2600); return () => clearTimeout(t); }, [note]);
  /** What is in the air over the plots: earth, leaves, water, a sparkle. */
  const vfx = useMemo(() => new Vfx(), []);
  /**
   * The garden gnome at work (lib/town/farm's gnomeWater): the plots it is going down with its can, in the order it
   * walks them (to and fro, a row at a time), how long it takes over each, and when it set off (by the map's clock:
   * known at the first frame it is drawn in). A plot it has not come to yet does not show as watered, though whoever
   * keeps the game has watered them all at once.
   */
  const gnome = useRef<{ path: Array<{ key: string; x: number; y: number }>; step: number; from: number | null; shown: number } | null>(null);

  // What every tended plot shows now, whose every bed is, and the well's water: looked at afresh when the farm changes
  // and every few seconds, not every frame.
  const now = keeper.now(), plots = keeper.farm();
  const seen = useRef(new Map<string, Seen>());
  // (with the rain the plots have had: lib/town/weather, by way of whoever keeps the game)
  const rains = keeper.rains();
  seen.current = new Map(Object.entries(plots).map(([key, plot]) => [key, see(key, plot, now, rains)]));
  const owners = useRef(keeper.owners());
  owners.current = keeper.owners();
  const well = useRef(0);
  well.current = keeper.well();
  /** Whether it is a hot afternoon: looked at with the rest, not every frame. */
  const hot = useRef(false);
  hot.current = keeper.hot();
  /** The nature the well's water has now, if any. */
  const nature = useRef<Nature | null>(null);
  nature.current = keeper.wellWater()?.kind ?? null;
  /**
   * The hourglass of seasons (lib/town/farm's glassTurn): the plants the sand runs over now, each with the moment it
   * runs out, and of each bed that has any the latest of those. Read off the plants themselves, so everybody at the
   * farm sees it, whoever turned it. And the keeper's clock, for the frames to tell how long is left by.
   */
  const sand = useRef(new Map<string, number>()), sandBeds = useRef(new Map<number, number>());
  sand.current = new Map(Object.entries(plots).flatMap(([k, plot]) => { const until = quickUntil(plot.plant, now); return until === null ? [] : [[k, until] as [string, number]]; }));
  sandBeds.current = new Map();
  for (const [k, until] of sand.current) { const [x, y] = k.split(",").map(Number), bed = bedOf(x, y); sandBeds.current.set(bed, Math.max(until, sandBeds.current.get(bed) ?? 0)); }
  const clock = useRef(() => keeper.now());
  clock.current = () => keeper.now();

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
      /**
       * A parched plant: the air over it shimmers (three threads of it rising, each a little out of step with the
       * others), and where a watered plant has its drop there is the ghost of one, coming and going.
       */
      const shimmer = (at: Vec, seed: number) => {
        const px = Math.max(2, Math.round(1.6 * s));
        ctx.fillStyle = "#fff6d8";
        for (let i = 0; i < 3; i++) {
          const rise = still ? 0.5 : (t / 1700 + seed * 0.37 + i * 0.31) % 1, x0 = at.x + (i - 1) * 9 * s, y0 = at.y - (24 + rise * 14) * s;
          for (let k = 0; k < 5; k++) {
            ctx.globalAlpha = Math.sin(rise * Math.PI) * 0.85 * (1 - k * 0.16);
            ctx.fillRect(Math.round(x0 + ((k + Math.floor(still ? 0 : t / 280 + seed + i)) % 2 ? px / 2 : -px / 2)), Math.round(y0 - k * px), px, px);
          }
        }
        ctx.globalAlpha = still ? 0.4 : 0.22 + 0.3 * (0.5 + 0.5 * Math.sin(t / 330 + seed));
        blit("plotDrop", { x: at.x + 13 * s, y: at.y }, 0, PLANT * s * 0.45);
        ctx.globalAlpha = 1;
      };
      // the gnome going down a bed: where it is now, the water it leaves over each plot as it comes to it, and the plots still to come
      const g = gnome.current, later = new Set<string>();
      if (g) {
        if (g.from === null) {
          g.from = t;
          // (nothing walks where motion is to be little: the bed is watered, and that is seen at once)
          if (still) { for (const p of g.path) vfx.add("water", { x: p.x + 0.5, y: p.y + 0.5 }); gnome.current = null; }
          else FAMILIAR_AWAY.until = performance.now() + g.path.length * g.step + 500;
        }
        const at = gnome.current ? (t - g.from) / g.step : 0;
        if (gnome.current) {
          while (g.shown < g.path.length && g.shown <= at) { const p = g.path[g.shown++]; vfx.add("water", { x: p.x + 0.5, y: p.y + 0.5 }); }
          for (let i = g.shown; i < g.path.length; i++) later.add(g.path[i].key);
          if (at >= g.path.length + 1) gnome.current = null;
          else {
            const i = Math.max(0, Math.min(g.path.length - 1, Math.floor(at))), a = g.path[i], b = g.path[Math.min(g.path.length - 1, i + 1)], k = Math.min(1, Math.max(0, at - i));
            const here = { x: a.x + (b.x - a.x) * k + 0.5, y: a.y + (b.y - a.y) * k + 0.5 }, c = project(here);
            // (which way it looks: the way it goes across the screen, as a familiar at heel does)
            const right = b.x - a.x - (b.y - a.y) >= 0;
            if (onScreen(c)) things.push({ depth: here.x - 0.5 + here.y - 0.5 + 0.7, draw: () => {
              const hop = Math.abs(Math.sin(t / 95)) * 3.5 * s;
              ctx.fillStyle = "rgba(0,0,0,0.2)";
              ctx.beginPath();
              ctx.ellipse(c.x, c.y + 4 * s, 7 * s, 3 * s, 0, 0, Math.PI * 2);
              ctx.fill();
              blit("famGnome", c, hop, 1.5 * s, !right);
              // its can, held out before it and tipped over the plot
              const cell = ICON_ATLAS.icons.can;
              if (cell) {
                const [x, y, w, h] = cell, kc = 0.9 * s, way = right ? 1 : -1;
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.translate(Math.round(c.x + way * 14 * s), Math.round(c.y - 16 * s - hop));
                ctx.scale(way, 1);
                ctx.rotate(0.5 + Math.sin(t / 140) * 0.12);
                ctx.drawImage(img, x, y, w, h, -(w * kc) / 2, -(h * kc) / 2, w * kc, h * kc);
                ctx.restore();
              }
            } });
          }
        }
      }
      // the hourglass's sand over a plant it quickens: a warm light at its foot, and grains falling past it, each in its own time.
      // Drawn over the night's dark, as a lamp's light is: it is seen from across the farm.
      const game = clock.current(), above = frame.over ?? ((draw: () => void) => draw());
      const grains = (at: Vec, seed: number) => {
        const px = Math.max(2, Math.round(1.6 * s));
        ctx.fillStyle = "#ffd98a";
        ctx.globalAlpha = still ? 0.2 : 0.14 + 0.09 * Math.sin(t / 420 + seed);
        ctx.beginPath();
        ctx.ellipse(at.x, at.y + 2 * s, 16 * s, 6.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          const fall = still ? (i + 0.5) / 5 : (t / 1100 + seed * 0.37 + i * 0.23) % 1;
          ctx.globalAlpha = 0.95 * Math.sin(fall * Math.PI);
          ctx.fillStyle = i % 2 ? "#f0c060" : "#fff1c4";
          ctx.fillRect(Math.round(at.x + (((i * 7 + seed * 3) % 23) - 11) * s), Math.round(at.y - (34 - fall * 32) * s), px, px);
        }
        ctx.globalAlpha = 1;
      };
      for (let v = 0; v < FARM.h; v++) for (let u = 0; u < FARM.w; u++) {
        const tx = FARM.x + u, ty = FARM.y + v;
        if (!plotAt(tx, ty)) continue;
        const at = project({ x: tx + 0.5, y: ty + 0.5 });
        if (!onScreen(at)) continue;
        const what = seen.current.get(plotKey(tx, ty));
        if ((sand.current.get(plotKey(tx, ty)) ?? 0) > game && what?.crop && !what.dead) above(() => grains(at, tx * 5 + ty * 3));
        things.push({ depth: tx + ty + 0.6, draw: () => {
          if (!what) { for (const w of weedsOf(tx, ty)) blit(w.name, { x: at.x + w.dx * s, y: at.y + w.dy * s }, 0, PLANT * s * w.k, w.flip); return; }
          if (what.soil === "tilled") blit("plotSoil", at, 0, PLANT * s * 0.9);
          if (!what.crop) return;
          if (what.dead) { blit("plotDead", at); return; }
          blit(growIconOf(what.crop, what.stage), at);
          if (what.wet && !later.has(plotKey(tx, ty))) blit("plotDrop", { x: at.x + 13 * s, y: at.y }, 0, PLANT * s * 0.45);
          // (a hot afternoon: the air shimmers over a plant that is still growing and has had no water this hour)
          else if (hot.current && !what.ripe) shimmer(at, tx * 3 + ty);
          if (what.pest) blit("plotBug", { x: at.x - 10 * s, y: at.y }, (still ? 0 : Math.sin(t / 160 + tx) * 2 + 14) * s, PLANT * s * 0.5);
          else if (what.ripe && (still || Math.floor(t / 420 + tx + ty) % 3 !== 0)) blit("plotShine", { x: at.x + 9 * s, y: at.y }, 20 * s, PLANT * s * 0.5);
        } });
      }
      // whose each bed is, on a plate at its far corner; and the water in the well, over it
      for (const [bed, who] of owners.current) {
        const [bx, by] = bedCorner(bed), at = project({ x: bx, y: by });
        if (onScreen(at)) sign(thai ? `แปลงของ ${who.name}` : `${who.name}'s bed`, at.x, at.y - 6 * s);
      }
      // a bed the sand runs over: the hourglass itself over its far corner, turning now and then, and how long is left
      for (const [bed, until] of sandBeds.current) {
        if (until <= game) continue;
        const [bx, by] = bedCorner(bed), at = project({ x: bx, y: by });
        if (!onScreen(at)) continue;
        const left = Math.max(0, until - game), h = Math.floor(left / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000);
        sign(`${h}:${String(m).padStart(2, "0")}`, at.x, at.y - 82 * s);
        above(() => {
          const cell = ICON_ATLAS.icons["thingHourglass" as IconName];
          if (!cell) return;
          const [x, y, w, hh] = cell, k = 0.85 * s, turn = still ? 0 : (t / 5200 + bed * 0.31) % 1;
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.translate(Math.round(at.x), Math.round(at.y - (46 + (still ? 0 : Math.sin(t / 600 + bed) * 2)) * s));
          // (it is turned over every few seconds, as an hourglass that never runs out would be)
          if (turn < 0.09) ctx.rotate((turn / 0.09) * Math.PI);
          ctx.drawImage(img, x, y, w, hh, -(w * k) / 2, -(hh * k) / 2, w * k, hh * k);
          ctx.restore();
        });
      }
      const top = project({ x: WELL.x + 0.5, y: WELL.y + 0.5 });
      const kind = nature.current;
      if (onScreen(top)) sign(`${thai ? "บ่อน้ำ" : "Well"} ${well.current}/${WATER.well}${kind ? ` · ${NATURE_NAMES[kind][thai ? 0 : 1]}` : ""}`, top.x, top.y - 66 * s);
      // while its water has a nature: motes of that water's colour rising about the well, each in its own time
      if (kind && onScreen(top)) {
        things.push({ depth: WELL.x + WELL.y + 1.2, draw: () => {
          const px = Math.max(3, Math.round(2.4 * s));
          ctx.fillStyle = NATURE_GLOW[kind];
          for (let i = 0; i < 11; i++) {
            const rise = still ? (i + 0.5) / 11 : (t / 3200 + i / 11) % 1, turn = i * 2.4 + (still ? 0 : t / 2100);
            ctx.globalAlpha = Math.sin(rise * Math.PI);
            // (a mote is a small cross of its colour: a point of light, not a square)
            const x = Math.round(top.x + Math.cos(turn) * (16 + (i % 3) * 5) * s), y = Math.round(top.y - (14 + rise * 92) * s);
            ctx.fillRect(x, y, px, px);
            ctx.globalAlpha *= 0.55;
            ctx.fillRect(x - px, y, px * 3, px);
            ctx.fillRect(x, y - px, px, px * 3);
          }
          ctx.globalAlpha = 1;
        } });
      }
    });
    return () => register(null);
  }, [register, vfx]);

  const key = tile ? plotKey(tile[0], tile[1]) : null;
  const purse = keeper.purse(), hand = handOf(purse);
  const deed = key ? keeper.deedAt(key) : null;
  const chore = !deed ? keeper.choreAt(water) : null;
  /** With a bucket of water in the hand and nothing else to do here: the plots of this bed it would water, poured from where I stand (lib/town/ditch). */
  const flood = key && !deed && !chore ? keeper.ditchAt(key) : [];
  const pours = flood.length > 0;
  const nameOf = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const say = useCallback((why: string) => { const w = WHY_FARM[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);

  /** Do the deed, and say what came of it. `sure`: a living plant is meant to be dug out (asked twice, and answered). */
  const act = useCallback(async (k: string, timing?: GameResult, sure = false) => {
    // (the buffs I have as the work begins: a blessing that had a hand in it shows over the plot when it is done)
    const mine = keeper.purse(), began = keeper.now();
    // (and the plot as it stands, with what is in the hand: what came of an insect let go on a pest is read from the plot as it was and as it is)
    const stood = keeper.farm()[k] ?? WILD, held = handOf(mine);
    // (every miss of the hoe is a little more stamina gone: the keeper's to take)
    const did = await keeper.farmDo(k, name, timing ? { hits: timing.hits, misses: timing.misses, secs: timing.secs, need: timing.need } : undefined, sure);
    if (!did.ok) { say(did.why); return; }
    if (timing) keeper.record({ game: "farming", at: keeper.now(), won: true, secs: timing.secs, spent: isSpent(purse, now), buff: null, what: did.deed, need: timing.need, hits: timing.hits, misses: timing.misses });
    // an insect that eats pests, let go on a plant that had one: it ate it, or it is off with the pest still there (lib/town/farm's FARMING.rids)
    const rid = did.deed === "feed" && held ? ridCameOf(k, stood, keeper.farm()[k] ?? WILD, held, began, keeper.rains()) : null;
    setNote(did.got.length ? did.got.map(([id, n]) => `${nameOf(id)} ×${n}`).join(" · ")
      : rid === null || !held ? null
        : th ? `${nameOf(held)}${rid ? "กินศัตรูพืชหมดแล้ว" : "บินหนีไปแล้ว ศัตรูพืชยังอยู่"}`
          : `The ${nameOf(held).toLowerCase()} ${rid ? "ate the pest" : "flew off, and the pest is still there"}`);
    // what flies up over the plot, and what it sounds like (the hoe's own swings were heard as they were made)
    const [x, y] = k.split(",").map(Number), at = { x: x + 0.5, y: y + 0.5 }, [fx, sound] = DEED_FX[did.deed];
    sfx?.wake();
    // (an insect that is off is heard going, and leaves nothing in the air; one that ate its pest, a sparkle)
    if (!timing) sfx?.work(rid === false ? "flit" : sound);
    if (rid !== false) vfx.add(fx, at);
    if (rid) vfx.add("sparkle", at);
    for (const id of seenAtPlot(did.deed, mine, began)) vfx.add("bless", at, { icon: BURST[id], lift: 8 });
    if (did.got.length) vfx.add("pop", at, { icon: did.got[0][0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the purse and the clock are read when the deed is done
  }, [keeper, th, sfx, name, say, vfx]);
  /** Draw a bucket of water, pour it into the well, or fill the can. */
  const carry = useCallback(async () => {
    const mine = keeper.purse(), began = keeper.now();
    const did = await keeper.choreDo(water, at);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work(CHORE_FX[did.chore][1], did.chore === "fill" ? 0.7 : 1);
    vfx.add(CHORE_FX[did.chore][0], null, { lift: did.chore === "fill" ? 10 : 0 });
    // (a bucket drawn under the fountain's blessing for water bearers: its own burst)
    for (const id of seenAtPlot(did.chore, mine, began)) vfx.add("bless", null, { icon: BURST[id], lift: 26 });
    if (did.chore !== "draw") setNote(`${th ? "บ่อน้ำ" : "Well"} ${keeper.well()}/${WATER.well}`);
    else {
      // (water drawn at certain moments has a nature: it is named for what it is, and a light goes up from the bucket)
      const kind = keeper.drawnNow();
      if (kind) { setNote(NATURE_NAMES[kind][th ? 0 : 1]); vfx.add("sparkle", null, { lift: 22 }); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the tile is told by its two numbers
  }, [keeper, water, at?.[0], at?.[1], sfx, th, say, vfx]);
  /** Pour the bucket over the bed I stand in. */
  const pourOver = useCallback(async (k: string) => {
    const did = await keeper.ditchDo(k);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work("pour");
    // water over every plant it reached, and a splash where it was poured
    for (const plot of did.watered) { const [x, y] = plot.split(",").map(Number); vfx.add("water", { x: x + 0.5, y: y + 0.5 }); }
    vfx.add("splash", null);
    setNote(th ? `รดไป ${did.watered.length} ต้น` : `${did.watered.length} plants watered`);
  }, [keeper, sfx, th, say, vfx]);
  const begin = useCallback(() => {
    const work: Work | null = key && deed ? deed : chore ?? (key && pours ? "ditch" : null);
    if (!work) return;
    if (work === "ditch") {
      // (no game with stamina; with none it is poured like any water, a short round)
      if (isSpent(keeper.purse(), keeper.now())) setWorking({ key, work, need: FARMING.tired });
      else void pourOver(key!);
      return;
    }
    // digging a plant out is asked for a second time, and is no game
    if (key && (deed === "pull" || deed === "uproot")) { setAsking({ key, deed }); return; }
    // the hoe's work is the game of timing; with no stamina left so is everything else, a short round of it
    const need = hitsFor(work, isSpent(keeper.purse(), keeper.now()));
    if (need) setWorking({ key: key && deed ? key : null, work, need });
    else if (key && deed) void act(key);
    else void carry();
  }, [key, deed, chore, pours, act, carry, pourOver, keeper, th]);
  /** A row's deed, done whole by whoever keeps the game: what flies up over each plot it did, and a word of how many those were. */
  const doRow = useCallback(async (k: string, marks: Record<string, boolean>, timing: GameResult | null) => {
    const did = await keeper.rowDo(k, name, marks, timing ? { hits: timing.hits, misses: timing.misses, secs: timing.secs, need: timing.need } : undefined);
    if (!did.ok) { say(did.why); return; }
    // (the hoe's row and the sickle's sweep are goes at a game, written down as the hoe's own are; the swings were heard as they were made)
    const hoed = did.deed === "clear" || did.deed === "till", reaped = did.deed === "pick";
    if (timing && (hoed || reaped)) keeper.record({ game: "farming", at: keeper.now(), won: true, secs: timing.secs, spent: isSpent(keeper.purse(), keeper.now()), buff: null, what: did.deed, need: timing.need, hits: timing.hits, misses: timing.misses });
    const [fx, sound] = DEED_FX[did.deed];
    sfx?.wake();
    if (!hoed && did.done.length) sfx?.work(sound);
    did.done.forEach((plot, i) => {
      const [x, y] = plot.split(",").map(Number), at = { x: x + 0.5, y: y + 0.5 };
      // (a plant cut well goes up brighter: what was picked pops out of it)
      window.setTimeout(() => { vfx.add(fx, at); if (reaped && marks[plot] && did.got[0]) vfx.add("pop", at, { icon: did.got[0][0] }); }, i * 70);
    });
    const of = Object.keys(marks).length, n = did.done.length, well = did.done.filter((plot) => marks[plot]).length;
    setNote(reaped ? `${did.got.map(([id, m]) => `${nameOf(id)} ×${m}`).join(" · ")} · ${th ? `ตวัดคม ${well}/${n}` : `${well} of ${n} cut clean`}`
      : did.deed === "sow" ? (th ? `หว่านทั้งแถว ${n} ช่อง ใช้ ${did.seeds ?? n} เมล็ด` : `${n} plots sown for ${did.seeds ?? n} seeds`)
      : th ? `ทั้งแถว: เสร็จ ${n} จาก ${of} ช่อง` : `The row: ${n} of ${of} plots done`);
  }, [keeper, name, say, sfx, th, vfx]);
  /** The plots the garden gnome would water if I sent it down the bed I stand in (lib/town/farm's gnomeReach): none, when there is nothing to send it for. */
  const gnomeHere = key ? keeper.gnomeAt(key) : [];
  /** Send it. It is seen going down the bed, to and fro a row at a time, with its can. */
  const sendGnome = useCallback(async () => {
    if (!key) return;
    const did = await keeper.gnomeDo(key);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work("water");
    const rows = new Map<number, Array<{ key: string; x: number; y: number }>>();
    for (const k of did.watered) { const [x, y] = k.split(",").map(Number); rows.set(y, [...(rows.get(y) ?? []), { key: k, x, y }]); }
    const path = [...rows.keys()].sort((a, b) => a - b).flatMap((y, i) => { const row = rows.get(y)!.sort((a, b) => a.x - b.x); return i % 2 ? row.reverse() : row; });
    gnome.current = { path, step: Math.max(900, Math.min(3600, path.length * 110)) / Math.max(1, path.length), from: null, shown: 0 };
    setNote(th ? `โนมรดน้ำให้แล้ว ${did.watered.length} ต้น` : `The gnome watered ${did.watered.length} plants`);
  }, [key, keeper, say, sfx, th]);
  /** The plots my hourglass of seasons would quicken if I turned it over the bed I stand in (lib/town/farm's glassReach): none, when there is nothing to turn it for. */
  const glassHere = key ? keeper.glassAt(key) : [];
  /** Turn it: a glint over every plant it quickens, and the sand is seen from then on. */
  const turnGlass = useCallback(async () => {
    if (!key) return;
    const did = await keeper.glassDo(key);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work("made");
    did.quickened.forEach((plot, i) => { const [x, y] = plot.split(",").map(Number); window.setTimeout(() => vfx.add("sparkle", { x: x + 0.5, y: y + 0.5 }), i * 45); });
    setNote(th ? "ทรายเริ่มไหลแล้ว" : "The sand is running");
  }, [key, keeper, say, sfx, th, vfx]);
  /** What a gift of the farming line would do to the whole row from where I stand (lib/town/farm's rowFor), if anything. */
  const rowHere = key ? keeper.rowAt(key) : null;
  /**
   * Begin it. The hoe's row is one game, a beat to a plot, the one stood on first. The pouch's sowing has no game, as
   * sowing has none: it is done at once; tired hands steady themselves for it first, once, as they would for a plot.
   */
  const beginRow = useCallback(() => {
    const row = key ? keeper.rowAt(key) : null;
    if (!key || !row) return;
    if (row.deed === "sow") {
      const need = hitsFor("sow", isSpent(keeper.purse(), keeper.now()));
      if (need) setWorking({ key, work: "sow", need, whole: true });
      else void doRow(key, {}, null);
      return;
    }
    // (the sickle's sweep goes along the row from one end to the other, whichever plot I stand on)
    if (row.deed === "pick") {
      const [x0, y0] = key.split(",").map(Number), [bx] = bedCorner(bedOf(x0, y0)), farm = keeper.farm(), points = keeper.lines()?.lines.farming.points ?? 0;
      const sweep = row.plots.flatMap((k) => { const crop = farm[k]?.plant?.crop; return crop ? [{ key: k, place: Number(k.split(",")[0]) - bx, crop, hard: hardFor(crop, points) }] : []; }).sort((a, b) => a.place - b.place);
      if (sweep.length > 1) setWorking({ key, work: "pick", need: sweep.length, sweep });
      return;
    }
    setWorking({ key, work: row.deed, need: row.plots.length, row: row.plots });
  }, [key, keeper, doRow]);
  // walking off the plot, or away from the water, leaves the work
  useEffect(() => { if (working && (working.key ? working.key !== key : working.work !== chore)) setWorking(null); }, [working, key, chore]);
  // …and the asking: it is about this plot and this plant as it stands (one that dies meanwhile, or is cured, is asked about afresh)
  useEffect(() => { if (asking && (asking.key !== key || asking.deed !== deed)) setAsking(null); }, [asking, key, deed]);
  // The asking opens with "leave it" under the keys: Space or Enter, pressed once too often, digs nothing out. Escape leaves it too.
  useEffect(() => {
    if (!asking) return;
    leaveIt.current?.focus();
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setAsking(null); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [asking]);
  /** The second asking, answered: dig it out. (A dead plant is not said to be meant living: if it lives after all, the keeper says so and nothing is done.) */
  const digOut = useCallback(() => {
    if (!asking) return;
    const { key: k, deed: what } = asking;
    setAsking(null);
    void act(k, undefined, what === "uproot");
  }, [asking, act]);
  const hoeing = working?.work === "clear" || working?.work === "till";
  const offer: Work | null = deed ?? chore ?? (pours ? "ditch" : null);

  // The space bar is the button (while the timing game is up it is the game's).
  useEffect(() => {
    if (working || asking || !offer) return;
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
  }, [working, asking, offer, begin]);

  // (for scripts in `next dev`: what stands in a plot, the deed or the chore on offer, the well and whose the beds are)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      seen: (k: string) => seen.current.get(k) ?? see(k, WILD, keeper.now(), keeper.rains()), deed: () => deed, chore: () => chore, act: begin, plots: () => keeper.farm(),
      offer: () => offer, flood: () => flood, hot: () => keeper.hot(), note: () => note, wellWater: () => keeper.wellWater(),
      // (the gifts of the farming line: what a row's power would do here, and beginning it)
      row: () => (key ? keeper.rowAt(key) : null), rowAct: beginRow,
      // (the gnome: the plots it would water here, sending it, and where it is on its round: how many plots it has come to of how many; null when it is not out)
      // (the hourglass: the plots it would quicken here, turning it, and the plots the sand runs over now with when it runs out)
      glass: () => (key ? keeper.glassAt(key) : []), glassTurn: turnGlass, sand: () => Object.fromEntries(sand.current),
      gnome: () => (key ? keeper.gnomeAt(key) : []), gnomeSend: sendGnome, gnomeOut: () => (gnome.current ? { shown: gnome.current.shown, of: gnome.current.path.length } : null),
      asking: () => asking,
      well: () => keeper.well(), owners: () => [...keeper.owners()].map(([bed, who]) => ({ bed, ...who })), weeds: (x: number, y: number) => weedsOf(x, y).map((w) => w.name),
    };
    (window as unknown as { __townFarm?: typeof handle }).__townFarm = handle;
    return () => { delete (window as unknown as { __townFarm?: typeof handle }).__townFarm; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the plots a bucket would water are told by how many they are
  }, [deed, chore, offer, flood.join("|"), note, begin, keeper, asking, beginRow, key, sendGnome, turnGlass]);

  /** What the gifts of the farming line offer here, beside the plain deed: each a button of its own, with the gift's picture. */
  const powers: Array<{ id: GiftId; word: string; more?: string; go: () => void }> = [];
  if (rowHere) {
    // (how many plots it would do now; and of the pouch, for how many seeds)
    const n = rowHere.plots.length, seeds = pouchSeeds(n);
    powers.push({ id: ROW_GIFT[rowHere.deed], word: ROW_VERB[rowHere.deed][th ? 0 : 1], go: beginRow,
      more: rowHere.deed === "sow" ? (th ? `${n} ช่อง · ${seeds} เมล็ด` : `${n} plots · ${seeds} seeds`) : th ? `${n} ช่อง` : `${n} plots` });
  }
  if (gnomeHere.length) powers.push({ id: "famGnome", word: th ? "ให้โนมรดน้ำทั้งแปลง" : "Send the gnome down the bed", go: () => void sendGnome() });
  if (glassHere.length) powers.push({ id: "thingHourglass", word: th ? "พลิกนาฬิกาทราย" : "Turn the hourglass", go: () => void turnGlass(), more: th ? `${glassHere.length} ต้น` : `${glassHere.length} plants` });
  if (!working && !offer && !note && !powers.length) return null;
  /** The plant the asking is about, as it stands. */
  const asked = asking ? seen.current.get(asking.key) : undefined;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {working ? (() => {
        // each piece of work's own game (lib/town/farm's gameFor), on the same board, told the same things
        const game = working.sweep ? "sweep" : working.work === "ditch" ? "pouring" : gameFor(working.work), title = verbOf(working.work, hand)[th ? 0 : 1];
        // (a meal's buff on the hands: steady hands for the pouring, a keen eye for the hoe and the weeding; the game of
        // tired hands is as it is)
        const growing = working.key ? seen.current.get(working.key) : undefined;
        // (and what is worked on: a crop of the second tier or better is harder for whoever is far up the farming line,
        // lib/town/farm's hardFor: a narrower mark, in whichever game it is. Bare ground and water are as they are)
        const worked = working.work === "sow" ? cropOf(hand) : working.key && working.work !== "clear" && working.work !== "till" && working.work !== "ditch" ? growing?.crop ?? null : null;
        const mods = { tool: hand ? FIELD[hand] ?? 1 : 1, spent: isSpent(purse, now), drops: true, buff: game === "steady" ? 1 : 1 + buffBy(purse, now, game === "pouring" ? "calm" : "keen"),
          hard: hardFor(worked, keeper.lines()?.lines.farming.points ?? 0) };
        const common = {
          th, title,
          onHit: (hit: boolean) => {
            sfx?.wake();
            // (tired hands at lighter work: only a miss is heard, the work's own sound comes when it is done)
            if (!hoeing || !working.key) { if (!hit) sfx?.work("knock"); return; }
            // a weed out of the ground, or the blade into the earth, and what flies up from it
            sfx?.work(hit ? (working.work === "clear" ? "pull" : "hoe") : "knock");
            const [x, y] = working.key.split(",").map(Number);
            if (hit) vfx.add(working.work === "clear" ? "leaves" : "soil", { x: x + 0.5, y: y + 0.5 });
          },
          onDone: (result: GameResult) => {
            const { key: k, work, row } = working;
            setWorking(null);
            // (a row worked at a swing is one deed, the keeper's to judge whole: told how each plot's beat went, it does
            // each plot whose beat was hit as if it had been hoed by itself, and leaves each whose beat was missed)
            if (row && k) {
              void doRow(k, Object.fromEntries(row.map((plot, i) => [plot, !!result.marks?.[i]])), result);
              return;
            }
            // (a game of tired hands is written down whatever its end; the hoe's own, when it is done, with the deed)
            if (result.dropped || !hoeing) keeper.record({ game: "farming", at: keeper.now(), won: !result.dropped, secs: result.secs, spent: true, buff: null, what: work, need: result.need, hits: result.hits, misses: result.misses });
            // with no stamina left the work is dropped at the third miss: nothing is done
            if (result.dropped) { say(hoeing ? "tired" : "shaky"); return; }
            // (the sickle's sweep: every plant it went along is picked, and each that was cut well gives one more)
            if (working.sweep && k) { void doRow(k, Object.fromEntries(working.sweep.map((p, i) => [p.key, !!result.marks?.[i]])), result); return; }
            // (tired hands steadied for a row's deed: the whole row is done)
            if (working.whole && k) { void doRow(k, {}, null); return; }
            if (work === "ditch") { if (k) void pourOver(k); return; }
            if (k) void act(k, hoeing ? result : undefined);
            else void carry();
          },
          onCancel: () => setWorking(null),
        };
        return (
          <div className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game={game}>
            {/* the buffs that have a hand in this work, twinkling over the board */}
            <BuffAura ids={working.work === "ditch" ? [] : atPlot(working.work, purse, now)} th={th} className="mb-1 justify-end rounded-md bg-[#2a190d]/70 px-2 py-1 empty:hidden" />
            {working.sweep ? <TownSweep {...common} title={ROW_VERB.pick[th ? 0 : 1]} verb={th ? "ตวัดเคียว" : "Swing"} mods={{ spent: mods.spent, buff: 1 + buffBy(purse, now, "keen") }}
                onHit={(well) => { sfx?.wake(); sfx?.work(well ? "pick" : "swish"); }}
                plants={working.sweep.map((p) => ({ place: p.place, icon: growIconOf(p.crop, 5) as IconName, hard: p.hard }))} />
              : working.row ? <TownTiming {...common} title={(ROW_VERB[working.work as RowDeed] ?? VERB[working.work])[th ? 0 : 1]} verb={th ? "ฟันจอบ" : "Swing"} need={working.row.length} mods={mods} icon={toolIcon(working.work, hand)} row />
              : game === "weeding" ? <TownWeeding {...common} need={working.need} mods={mods} />
              : game === "pouring" ? <TownPouring {...common} verb={(HOLD[working.work] ?? HOLD.pour!)[th ? 0 : 1]} need={working.need} mods={mods} icon={toolIcon(working.work, hand)} taking={working.work === "draw" || working.work === "fill"} into={(working.work === "water" && growing?.crop ? growIconOf(growing.crop, growing.stage) : INTO[working.work] ?? "plotDrop") as IconName} />
                : game === "steady" ? <TownSteady {...common} need={working.need} mods={mods} icon={toolIcon(working.work, hand)} over={(growing?.crop ? growIconOf(growing.crop, growing.stage) : "plotSoil") as IconName} />
                  : <TownTiming {...common} verb={th ? "ฟันจอบ" : "Swing"} need={working.need} mods={mods} icon={toolIcon(working.work, hand)} />}
          </div>
        );
      })() : asking ? (
        <div role="alertdialog" aria-labelledby="farm-ask-h" aria-describedby="farm-ask-p" data-state="open" data-farm-ask={asking.deed}
             className="pop-in pointer-events-auto mb-14 w-full max-w-[22rem] rounded-2xl border border-line-lit bg-surface/97 p-4 shadow-xl shadow-black/40 backdrop-blur-sm">
          <p id="farm-ask-h" className="text-read font-semibold text-ink">
            {asking.deed === "pull"
              ? (th ? "ถอนต้นที่ตายแล้วออกจากแปลง?" : "Pull the dead plant up?")
              : th ? `ขุด${asked?.crop ? nameOf(asked.crop) : "ต้นนี้"}ออกจากแปลง?` : `Dig the ${asked?.crop ? nameOf(asked.crop).toLowerCase() : "plant"} out?`}
          </p>
          <p id="farm-ask-p" className="mt-1 text-ui leading-relaxed text-muted">
            {asking.deed === "pull"
              ? (th ? "แปลงจะกลับเป็นดินว่าง" : "The plot will be bare ground again.")
              : asked?.ripe
                ? (th ? "ต้นนี้เก็บได้แล้ว ถ้าขุดออกจะไม่ได้ผลผลิต และเอาคืนไม่ได้" : "It is ripe. Dug out, it gives nothing, and it cannot be had back.")
                : (th ? "ต้นนี้ยังโตอยู่ ขุดออกแล้วจะหายไป เอาคืนไม่ได้" : "It is still growing. Dug out, it is gone, and cannot be had back.")}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button ref={leaveIt} type="button" onClick={() => setAsking(null)} data-farm-ask-no
                    className="pressable min-h-11 rounded-full border border-line-strong px-4 text-ui font-semibold text-ink transition-colors hover:border-accent hover:text-accent">
              {th ? "ยกเลิก" : "Leave it"}
            </button>
            <button type="button" onClick={digOut} data-farm-ask-yes
                    className="pressable min-h-11 rounded-full border border-chili bg-chili/15 px-4 text-ui font-semibold text-chili transition-colors hover:bg-chili/25">
              {asking.deed === "pull" ? (th ? "ถอนออก" : "Pull it up") : th ? "ขุดออก" : "Dig it out"}
            </button>
          </div>
        </div>
      ) : (offer || powers.length > 0) && (
        <div className="mb-14 flex max-w-full flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
          {offer && (
            <button type="button" onClick={begin} data-farm-offer={offer}
                    className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-read font-semibold text-bg shadow-xl shadow-black/40" data-state="open">
              {verbOf(offer, hand)[th ? 0 : 1]}
              <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>
            </button>
          )}
          {/* what a gift of the farming line does here, beside the plain deed: never in its place */}
          {powers.map((p) => (
            <button key={p.id} type="button" onClick={p.go} data-farm-gift={p.id} data-state="open" className={GIFT_BTN}
                    title={(() => { const g = giftOf(p.id); return g ? g.name[th ? "th" : "en"] : undefined; })()}>
              <span aria-hidden className="grid size-9 place-items-center rounded-full border-2 border-[#2a190d] bg-[#6b4424]"><TownIcon name={p.id as IconName} size={26} /></span>
              <span className="flex flex-col items-start leading-tight">
                {p.word}
                {p.more && <span className="font-data text-label font-normal tabular-nums text-[#f0c060]" data-farm-gift-more>{p.more}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
