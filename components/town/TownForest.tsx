"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FARMING } from "@/lib/town/farm";
import {
  FORAGING, SECRETS, fetches, gameFor, gamesOf, harderOf, isSecret, lanternLit, mayGather, pigletDigs, placeAt, reachOf, reaches, ruleOf,
  type ForestGame, type Gather, type Place, type SecretKind, type Sight, type SpotKind,
} from "@/lib/town/forest";
import { ITEMS, byOf, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx, WorkSound } from "@/lib/town/sfx";
import { WILD_WISHES } from "@/lib/town/forest-eye";
import type { WishId } from "@/lib/town/fountain";
import { charmBy, famBy, hasThing, usesLeft } from "@/lib/town/gifts";
import type { HuntTold } from "@/lib/town/hunt";
import { isSpent, levelOf } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import type { Vec } from "@/lib/town/world";
import TownCatching from "./TownCatching";
import TownChoosing from "./TownChoosing";
import TownDigging from "./TownDigging";
import type { FarmDraw } from "./TownFarm";
import TownForestChart from "./TownForestChart";
import TownForestMap, { WARM_INK } from "./TownForestMap";
import type { GameResult } from "./TownGame";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import TownSteady from "./TownSteady";
import { WHY } from "./TownTrade";
import { Vfx, type VfxKind } from "./vfx";

/** The word on the button for each way of gathering. */
const VERB: Record<Gather, [th: string, en: string]> = {
  pick: ["เก็บ", "Pick up"], choose: ["เลือกเก็บ", "Gather"], dig: ["ขุด", "Dig"], shake: ["เขย่าต้นไม้", "Shake the tree"],
};
/** What a secret place of the deep woods is called, on its button and on its games' board. */
const SECRET: Record<SecretKind, [th: string, en: string]> = { ring: ["วงเห็ดของภูต", "A sprite's ring"], bough: ["กิ่งของภูต", "A sprite's bough"] };
const WHY_FOREST: Record<string, [string, string]> = {
  had: ["เก็บจากตรงนี้ไปแล้ว", "You have gathered here already"], bare: ["ไม่เหลือแล้ว", "There is none left"], far: ["ยืนไกลเกินไป", "Too far to reach"],
  none: ["ไม่มีอะไรแล้ว", "Nothing is here any more"], tool: ["ของในมือขุดไม่ได้", "What you hold does not dig"],
  shaky: ["หมดแรง มือสั่นจนเก็บไม่ขึ้น", "Too tired: your hands shake, and it comes to nothing"],
  spent: ["หมูน้อยเหนื่อยแล้ว ขอพักก่อน", "The piglet is worn out for now"],
  mapless: ["วันนี้ลายแทงหมดแล้ว", "No map is left today"],
  lost: ["มันหายวับไปกับแสงหิ่งห้อย", "It is gone, with the fireflies"],
};
/** What a dig for a sprite's chest that missed says, by how warm it was (lib/town/hunt's warmthOf): beside it, near, not far, far, cold. */
const WARM: Array<[th: string, en: string]> = [
  ["", ""],
  ["กระดิ่งภูตดังรัวอยู่ข้างเท้านี่เอง!", "The sprite's bell is ringing right beside you!"],
  ["กระดิ่งภูตดังใกล้มากแล้ว", "The sprite's bell rings very near"],
  ["ได้ยินกระดิ่งภูตชัดขึ้น", "The sprite's bell is clearer here"],
  ["ได้ยินกระดิ่งภูตแว่วมาไกลๆ", "A sprite's bell, faint and far off"],
  ["เงียบสนิท ไม่มีเสียงกระดิ่งเลย", "Silence: no bell at all"],
];
/** What flies up at each way of gathering, and what it sounds like. */
const FX: Record<Gather, [VfxKind, WorkSound]> = { pick: ["leaves", "rustle"], choose: ["leaves", "pick"], dig: ["soil", "pull"], shake: ["leaves", "pick"] };
/** What each game sounds like as it goes: something got, and something missed. */
const GAME_FX: Record<string, [WorkSound, WorkSound]> = { choosing: ["pluck", "wrong"], digging: ["brush", "bruise"], catching: ["basket", "thud"], steady: ["pick", "knock"] };
/** How big a thing of the forest is drawn where it lies: screen pixels to one of its picture's, at the map's own scale 1. */
const SIZE = 0.6;
/** A thing worth so much or more glints where it lies. */
const RARE = 40;
const iconFor = (item: ItemId | null): IconName => {
  const name = item ? iconOf(item) : "mound";
  return (name in ICON_ATLAS.icons ? name : "mound") as IconName;
};
/** What is being done at a place: its game, the tile it was begun from, whether the piglet does it, and at a secret place which of its two games this is and how long the first took. */
interface Working { spot: Place; sight: Sight; game: ForestGame; from: [number, number]; pig?: boolean; stage?: 0 | 1; secs?: number }

/**
 * The forest's things, to gather (the owner, 2026-10-05: "หาของป่า … สามารถเดินเข้าไปเก็บของป่าที่จะ spawn ออกมาเป็นช่วงเวลา …
 * การหาของป่าต้องเล่น minigame ด้วย"). The rules are lib/town/forest's. Every place that has something for me is drawn on
 * the map: the thing itself where it lies or grows, fruit up in its tree, and a mound of earth for what is buried
 * (which is not told until it is dug out). Standing at one, gathering it is offered as one button, when the hand
 * can do it: a hoe for what is dug, anything for the rest. Each way of gathering is a game of its own; picking
 * something up off the ground is none, but for tired hands.
 *
 * The gifts of the forest's ranks (lib/town/gifts) are seen here: a squirrel fetches what lies on the ground as I
 * walk past; a piglet digs with no hoe; and the firefly lantern shows what every place holds at any hour (a glint of
 * fireflies over each, what lies buried, the whole forest on a chart) and the secret places of the deep woods, which
 * take two games running.
 *
 * What is kept is the keeper's (lib/town/keeper): in `next dev`'s test room the browser's trial, one forest for
 * the browser.
 */
export default function TownForest({ keeper, th, tile, near, sfx, bottom, art, register, sendPet }: {
  keeper: Keeper;
  th: boolean;
  /** The tile I stand still on, when I do. */
  tile: [number, number] | null;
  /** Whether I am on the forest's map: what it has is looked at afresh while I am. */
  near: boolean;
  sfx: FishSfx | null;
  /** How far up from the foot of the map the button and the game sit. */
  bottom: string;
  /** A picture out of the town's scenery, by its name: the scene each game is played on (the forest's own sheet has them). */
  art: (name: string) => Sprite | null;
  /** Hand the map the way to draw the forest's things (and take it back with null). */
  register: (draw: FarmDraw | null) => void;
  /** Send my familiar running to a tile and back to my heels (the squirrel, fetching: lib/town/gifts). */
  sendPet?: (to: Vec) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!near) return;
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 5000);
    return () => { stop(); clearInterval(t); };
  }, [keeper, near]);
  // (what the forest has is asked for while I am in it)
  useEffect(() => (near ? keeper.look("wild") : undefined), [near, keeper]);
  const [working, setWorking] = useState<Working | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /** Whose doing the note is of: the squirrel's, when it fetched the thing; the piglet's; the lantern's (its picture goes beside the words). */
  const [noteBy, setNoteBy] = useState<IconName | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => { setNote(null); setNoteBy(null); }, 2600); return () => clearTimeout(t); }, [note]);
  const vfx = useMemo(() => new Vfx(), []);

  // What every place has for me now: looked at afresh when something changes and every few seconds, not every frame.
  const seen = useRef<Sight[]>([]);
  seen.current = near ? keeper.wild() : [];

  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, s, now: t, img, still, self, dark, over } = frame;
      // (where I am this frame, walking or not: the squirrel fetches what I pass; and whether the town stands still)
      selfAt.current = self;
      stillNow.current = still;
      // (in the dark, what can be gathered within the lamp's light glints: on my own screen, and nothing more is found for it)
      const reach = (dark ?? 0) > 0.3 && self ? lamp.current : 0;
      // (the firefly lantern: every place with something has fireflies over it, at any hour and however far; and in the dark it is seen as by day)
      const lit = lantern.current, night = Math.max(0, Math.min(1, ((dark ?? 0) - 0.15) / 0.5));
      let glinting = 0, flies = 0;
      vfx.draw(frame);
      if (!img?.complete || !img.naturalWidth) return;
      const blit = (name: IconName, at: Vec, lift = 0, k = SIZE * s) => {
        const cell = ICON_ATLAS.icons[name];
        if (!cell) return;
        const [x, y, w, h] = cell;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, w, h, Math.round(at.x - (w * k) / 2), Math.round(at.y - h * k + 5 * s - lift), w * k, h * k);
      };
      /** A few fireflies about a point: each a bright speck in a soft halo, drifting on its own beat, glowing and going dim. Drawn over the dark. */
      const fireflies = (at: Vec, n: number, wide: number, up: number, seed: number) => over?.(() => {
        const d = Math.max(2, Math.round(1.6 * s));
        for (let i = 0; i < n; i++) {
          const beat = seed * 1.7 + i * 2.39, tt = still ? beat : t / 950 + beat;
          const x = Math.round(at.x + Math.cos(tt * 1.3 + i) * wide * s * (0.45 + 0.55 * Math.sin(tt * 0.61 + i * 1.9)));
          const y = Math.round(at.y - (up + 7 * Math.sin(tt * 0.83 + i * 0.7) + i * 2.5) * s);
          const a = still ? 0.9 : 0.25 + 0.75 * Math.max(0, Math.sin(tt * 2.1 + i * 1.31));
          ctx.fillStyle = `rgba(190,255,90,${(a * 0.28).toFixed(3)})`;
          ctx.fillRect(x - d, y - d, 3 * d, 3 * d);
          ctx.fillStyle = `rgba(232,255,160,${a.toFixed(3)})`;
          ctx.fillRect(x, y, d, d);
        }
      });
      for (const sight of seen.current) {
        const spot = placeAt(sight.id);
        if (!spot) continue;
        const at = project({ x: spot.x + 0.5, y: spot.y + 0.5 });
        if (!onScreen(at)) continue;
        const icon = iconFor(sight.item), secret = isSecret(spot.id), how = ruleOf(spot).how;
        const fruit = spot.kind === "fruit" || spot.kind === "bough", rare = !!sight.item && ITEMS[sight.item].pays >= RARE;
        if (!fruit && reach > 0 && Math.hypot(spot.x + 0.5 - self!.x, spot.y + 0.5 - self!.y) <= reach) glinting++;
        /** The thing as it is drawn at its place (`glow`: again over the night's dark, as bright as by day, for the lantern's wearer). */
        const paint = (glow: boolean) => {
          if (spot.kind === "ring") {
            // a ring of pale caps about the place, the far ones first, and what it guards in its middle
            const ring = iconFor("glowMushroom");
            for (let i = 0; i < 8; i++) {
              const turn = Math.PI * (1.25 + i * 0.25);
              blit(ring, { x: at.x + Math.cos(turn) * 21 * s, y: at.y + Math.sin(turn) * 10.5 * s }, 0, SIZE * s * 0.5);
              if (i === 3) blit(icon, at, (10 + (still ? 0 : Math.sin(t / 600 + spot.id) * 2)) * s, SIZE * s * 0.85);
            }
          } else if (fruit) {
            // (fruit hangs in the crown of its tree, in front of it; a sprite's hoard on its bough the same)
            for (const [dx, up] of [[-14, 58], [10, 66], [2, 46]]) blit(icon, { x: at.x + dx * s, y: at.y }, (up + (still ? 0 : Math.sin(t / 700 + spot.id + dx) * 1.5)) * s, SIZE * s * 0.62);
          } else {
            blit(how === "dig" ? "mound" : icon, at);
            if (sight.n > 1 && how !== "dig") blit(icon, { x: at.x + 11 * s, y: at.y + 3 * s }, 0, SIZE * s * 0.8);
            // (what lies buried, for whoever sees it: over its mound)
            if (how === "dig" && sight.item) blit(icon, { x: at.x, y: at.y }, (22 + (still ? 0 : Math.sin(t / 520 + spot.id) * 2)) * s, SIZE * s * 0.7);
          }
          if (!glow && rare && (still || Math.floor(t / 420 + spot.id) % 3 !== 0)) blit("plotShine", { x: at.x + 9 * s, y: at.y }, 18 * s, SIZE * s * 0.8);
        };
        things.push({ depth: spot.x + spot.y + (fruit ? 1.05 : 0.6), draw: () => {
          paint(false);
          // (the lamp's glint on it: over the night's dark, where it shows)
          if (!fruit && reach > 0 && Math.hypot(spot.x + 0.5 - self!.x, spot.y + 0.5 - self!.y) <= reach) {
            over?.(() => {
              const d = Math.max(2, Math.round(2.5 * s)), gx = Math.round(at.x + 9 * s), gy = Math.round(at.y - 24 * s);
              ctx.fillStyle = `rgba(255,236,170,${(still ? 0.9 : 0.5 + 0.45 * Math.sin(t / 380 + spot.id * 1.7)).toFixed(3)})`;
              ctx.fillRect(gx - d, gy, 3 * d, d);
              ctx.fillRect(gx, gy - d, d, 3 * d);
            });
          }
        } });
        if (lit) {
          flies++;
          if (night > 0) over?.(() => { ctx.save(); ctx.globalAlpha = night; paint(true); ctx.restore(); });
          fireflies({ x: at.x, y: at.y }, secret ? 7 : 2, secret ? 24 : 9, fruit ? 50 : secret ? 16 : 12, spot.id + 1);
        }
      }
      // (and a few about my own doll: the lantern is lit)
      if (lit && self) fireflies(project({ x: self.x, y: self.y }), 3, 13, 26, 0.5);
      // A sprite's treasure map: every dig of the hunt that missed is a little hole with a mote of how warm it was, and
      // the last one rings like the bell it heard; the chest, when it is found, comes up out of the ground.
      const wall = performance.now();
      for (const p of probes.current) {
        const at = project({ x: p.x + 0.5, y: p.y + 0.5 });
        if (!onScreen(at)) continue;
        const ink = WARM_INK[Math.min(5, Math.max(0, p.warm))], age = wall - p.at;
        things.push({ depth: p.x + p.y + 0.55, draw: () => blit("earthHole", at, 0, SIZE * s * 0.9) });
        over?.(() => {
          const d = Math.max(2, Math.round(2.4 * s)), my = Math.round(at.y - (16 + (still ? 0 : Math.sin(t / 420 + p.x) * 2)) * s);
          ctx.fillStyle = "rgba(20,14,8,0.75)";
          ctx.fillRect(Math.round(at.x) - d - 1, my - d - 1, 2 * d + 2, 2 * d + 2);
          ctx.fillStyle = ink;
          ctx.fillRect(Math.round(at.x) - d, my - d, 2 * d, 2 * d);
          // (the bell, for a moment after the dig: the warmer, the more rings)
          if (age < 2400 && !still) {
            ctx.save();
            ctx.strokeStyle = ink;
            ctx.lineWidth = Math.max(1.5, 2 * s);
            for (let i = 0; i < 6 - p.warm; i++) {
              const life = ((age / 900 + i * 0.22) % 1), fade = (1 - life) * Math.min(1, (2400 - age) / 500);
              ctx.globalAlpha = Math.max(0, fade) * 0.9;
              ctx.beginPath();
              ctx.ellipse(at.x, at.y, (8 + life * 34) * s, (4 + life * 17) * s, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        });
      }
      const chest = chestAt.current;
      if (chest && wall - chest.at < 2600) {
        const at = project({ x: chest.x + 0.5, y: chest.y + 0.5 }), life = (wall - chest.at) / 2600, up = still ? 1 : Math.min(1, life * 3.2);
        over?.(() => {
          ctx.save();
          ctx.globalAlpha = life > 0.8 ? (1 - life) / 0.2 : 1;
          // (out of the earth: only what is above the ground is drawn)
          ctx.beginPath();
          ctx.rect(at.x - 60 * s, at.y - 120 * s, 120 * s, 126 * s);
          ctx.clip();
          blit("spriteChest" as IconName, at, (-34 + 34 * (1 - (1 - up) * (1 - up))) * s, SIZE * s * 1.15);
          ctx.restore();
        });
        fireflies({ x: at.x, y: at.y }, 8, 26, 22, 7);
      }
      glints.current = glinting;
      fliesOver.current = flies;
    });
    return () => register(null);
  }, [register, vfx]);

  // The place I stand at, if it has something for me and my hand can gather it.
  const purse = keeper.purse(), hand = handOf(purse), spent = isSpent(purse, keeper.now());
  // (the fountain's forest eye: each game a little kinder, lib/town/forest-eye)
  // (and a meal of the forest's own leaves it too, the more at each of its levels: items' byOf)
  const eye = byOf(WILD_WISHES.forest, levelOf(purse, keeper.now(), WILD_WISHES.forest as WishId));
  // (the forest walker's lamp worn as a charm: how far its light reaches about me, in tiles; none without it. lib/town/gifts)
  const lamp = useRef(0), glints = useRef(0);
  lamp.current = charmBy(purse, "charmLamp", 0);
  // (the firefly lantern worn: what every place holds is seen at any hour, the buried things and the secret places too)
  const lit = near && lanternLit(purse), lantern = useRef(false), fliesOver = useRef(0), stillNow = useRef(false);
  lantern.current = lit;
  // (worn or taken off: what the forest has for me is asked for again, since it is not the same)
  const wasLit = useRef<boolean | null>(null);
  useEffect(() => { if (wasLit.current !== null && wasLit.current !== lit && near) keeper.nudged("wild"); wasLit.current = lit; }, [lit, near, keeper]);
  const [chart, setChart] = useState(false);
  useEffect(() => { if (!lit) setChart(false); }, [lit]);
  // (a sprite's treasure map, lib/town/hunt: whether I have the thing, the maps left today, the hunt I am on, the digs
  // of it this page has seen, and whether the map is unrolled)
  const mapHad = near && hasThing(purse, "thingMap"), mapsLeft = usesLeft(purse, "thingMap", keeper.now()), hunt: HuntTold | null = mapHad ? keeper.hunt() : null;
  const [mapOpen, setMapOpen] = useState(false);
  const probes = useRef<Array<{ x: number; y: number; warm: number; at: number }>>([]), chestAt = useRef<{ x: number; y: number; at: number } | null>(null), digging = useRef(false);
  const huntN = hunt?.n ?? 0;
  useEffect(() => { probes.current = []; }, [huntN]);
  useEffect(() => { if (!mapHad) setMapOpen(false); }, [mapHad]);
  /** Whether a dig for the chest is offered where I stand: on the hunt, standing still, in or about the map's ring. */
  const digHere = !!hunt && !!tile && Math.max(Math.abs(tile[0] - hunt.area.x), Math.abs(tile[1] - hunt.area.y)) <= hunt.area.r + 2;
  /** My points on the forest's line: its good things are harder for a practised hand (lib/town/forest's harderOf). */
  const points = keeper.lines()?.lines.forest.points ?? 0;
  // (a truffle piglet at my heels digs with no hoe held, so many holes to these hours: lib/town/forest's pigletDigs)
  const piglet = pigletDigs(purse, keeper.now());
  /**
   * Whether whoever keeps the game knows that a squirrel fetches. Members had a squirrel before it fetched anything,
   * and a page goes out before its database's file is run: a page that fetched for a database that does not know of
   * it would be refused from two tiles off, and from one would spend its member's stamina as a picking by hand does,
   * as they walked. So the page fetches only where the keeper gives the forest's later gifts (the same file brings
   * both); until then a squirrel is what it was.
   */
  const fetchKept = keeper.gives("famPiglet");
  const reachFor = (how: Gather) => (!fetchKept && fetches(purse, how) ? FORAGING.reach : reachOf(purse, how));
  const here = tile && near ? seen.current.flatMap((sight) => { const spot = placeAt(sight.id); return spot ? [{ sight, spot }] : []; })
    .filter(({ spot }) => reaches(spot, tile, reachFor(ruleOf(spot).how)) && (isSecret(spot.id) || mayGather(spot.kind as SpotKind, hand) || (piglet && ruleOf(spot).how === "dig")))
    .sort((a, b) => Math.hypot(a.spot.x - tile[0], a.spot.y - tile[1]) - Math.hypot(b.spot.x - tile[0], b.spot.y - tile[1]))[0] ?? null : null;
  const hereId = here?.spot.id ?? -1, hereSecret = !!here && isSecret(here.spot.id), hereHow = here ? ruleOf(here.spot).how : "pick";
  /** Of what is offered here: whether my own hands can do it, and whether the piglet can. (A secret place is for the hands alone.) */
  const byHand = !!here && (hereSecret || mayGather(here.spot.kind as SpotKind, hand)), byPig = !!here && !hereSecret && piglet && hereHow === "dig";
  const nameOf = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const say = useCallback((why: string) => { const w = WHY_FOREST[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);

  /** Gather from a place, and say what came of it. */
  const act = useCallback(async (spot: Place, at: [number, number], went: { misses: number; wrong: number; secs?: number; with?: string; lost?: boolean }) => {
    const did = await keeper.gatherDo(spot.id, at, went);
    if (!did.ok) { say(did.why); return; }
    const secret = isSecret(spot.id), where = { x: spot.x + 0.5, y: spot.y + 0.5 };
    sfx?.wake();
    if (did.lost) {
      // (a secret place's games not both won: my turn at it is spent, and it is gone)
      setNoteBy("charmFirefly" as IconName);
      say("lost");
      sfx?.work("wrong");
      vfx.add("mist", where);
      return;
    }
    setNoteBy(went.with === "famPiglet" ? ("famPiglet" as IconName) : secret ? ("charmFirefly" as IconName) : null);
    // (of a secret place, how many of them I have gathered from now: my own record)
    const record = secret ? ` · ${th ? "จุดลับ" : "secret places"} ${keeper.purse().forest?.secrets?.length ?? 0}/${SECRETS.length}` : "";
    setNote(did.got.map(([id, n]) => `${nameOf(id)} ×${n}`).join(" · ") + record);
    const how = ruleOf(spot).how, [fx, sound] = FX[how];
    sfx?.work(sound);
    vfx.add(fx, where);
    if (secret) vfx.add("sparkle", where);
    if (did.got.length) vfx.add("pop", where, { icon: did.got[0][0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the names are read when the thing is got
  }, [keeper, th, sfx, say, vfx]);

  /** Begin what is offered here: by my own hands, or (`pig`) by the piglet, where it is the piglet's to do. */
  const begin = useCallback((pig = false) => {
    if (!here || !tile) return;
    // (with no hoe in the hand the piglet's way is the only one)
    const withPig = byPig && (pig || !byHand);
    if (!withPig && !byHand) return;
    // (what a squirrel fetches is no work of my hands: no game for it, tired or not)
    const game = fetchKept && fetches(purse, hereHow) ? null : gameFor(hereHow, spent);
    if (game) { setWorking({ ...here, game, from: tile, pig: withPig, ...(hereSecret ? { stage: 0 as const } : {}) }); if (game === "catching") { sfx?.wake(); sfx?.work("shake"); } }
    else void act(here.spot, tile, { misses: 0, wrong: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the purse is read when the button is pressed
  }, [here, tile, spent, act, sfx, byHand, byPig, hereSecret, hereHow, fetchKept]);

  /**
   * The squirrel at my heels fetches what lies on the ground as I pass it (lib/town/forest's `fetches`): looked for a
   * few times a second from where I am, walking or standing; one thing at a time; it runs there and back. A place
   * that gave nothing (a bag with no room for it, somebody else's last share) is left alone for a while.
   */
  const selfAt = useRef<Vec | null>(null), fetching = useRef(false), left = useRef(new Map<number, number>()), fetched = useRef(0);
  const squirrel = near && fetchKept && fetches(purse, "pick");
  useEffect(() => {
    if (!squirrel) return;
    const look = async () => {
      const me = selfAt.current;
      if (!me || fetching.current) return;
      const at: [number, number] = [Math.floor(me.x), Math.floor(me.y)], now = Date.now();
      const sight = seen.current.find((x) => { const spot = placeAt(x.id); return !!spot && ruleOf(spot).how === "pick" && reaches(spot, at, FORAGING.squirrel) && (left.current.get(x.id) ?? 0) < now; });
      const spot = sight ? placeAt(sight.id) : null;
      if (!sight || !spot) return;
      const where = { x: spot.x + 0.5, y: spot.y + 0.5 };
      fetching.current = true;
      sendPet?.({ x: spot.x, y: spot.y });
      try {
        const did = await keeper.gatherDo(spot.id, at, { misses: 0, wrong: 0 });
        if (!did.ok) {
          // (no room, or nothing there for me after all: not asked again for a while; a full bag is said once)
          left.current.set(sight.id, now + (did.why === "full" ? 12_000 : 30_000));
          if (did.why === "full") { setNoteBy("famSquirrel" as IconName); say("full"); }
          return;
        }
        fetched.current++;
        setNoteBy("famSquirrel" as IconName);
        setNote(did.got.map(([id, n]) => `${nameOf(id)} ×${n}`).join(" · "));
        sfx?.wake();
        sfx?.work("rustle");
        vfx.add("leaves", where);
        if (did.got.length) vfx.add("pop", where, { icon: did.got[0][0] });
      } finally { fetching.current = false; }
    };
    const t = setInterval(() => { void look(); }, 220);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the names are read when the thing is got
  }, [squirrel, keeper, sendPet, sfx, vfx, say, th]);

  /** Unroll a map: one of the day's is used, and a hunt begins. */
  const unroll = useCallback(async () => {
    const did = await keeper.mapUse();
    if (!did.ok) { say(did.why === "spent" ? "mapless" : did.why); return; }
    sfx?.wake();
    sfx?.work("rustle");
  }, [keeper, say, sfx]);
  /** Dig for the chest where I stand: the bell says how warm it was, or the chest comes up. */
  const digFor = useCallback(async () => {
    if (!tile || digging.current) return;
    digging.current = true;
    try {
      const did = await keeper.mapDig(tile);
      if (!did.ok) { setNoteBy("thingMap" as IconName); say(did.why); return; }
      const where = { x: tile[0] + 0.5, y: tile[1] + 0.5 };
      sfx?.wake();
      vfx.add("soil", where);
      if (!did.found) {
        probes.current = [...probes.current, { x: tile[0], y: tile[1], warm: did.warm, at: performance.now() }];
        sfx?.work(did.warm <= 2 ? "pluck" : "pull");
        setNoteBy("thingMap" as IconName);
        setNote(th ? WARM[did.warm][0] : WARM[did.warm][1]);
        return;
      }
      chestAt.current = { x: tile[0], y: tile[1], at: performance.now() };
      sfx?.work("pick");
      vfx.add("sparkle", where);
      if (did.got.length) vfx.add("pop", where, { icon: did.got[0][0], lift: 26 });
      setMapOpen(false);
      setNoteBy("spriteChest" as IconName);
      setNote(did.got.map(([id, n]) => `${nameOf(id)} ×${n}`).join(" · "));
    } finally { digging.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the names are read when the chest is up
  }, [keeper, tile, th, sfx, say, vfx]);

  /**
   * Leave the work that is up. At a secret place, once its games are begun, leaving them is losing them: my turn at
   * the place is spent (lib/town/forest's gather, `lost`).
   */
  const leave = useCallback((w: Working | null) => {
    setWorking(null);
    // (told from the tile its games were begun on: walking off is no way out of them)
    if (w && w.stage !== undefined) void act(w.spot, w.from, { misses: 0, wrong: 0, lost: true });
  }, [act]);
  // walking off leaves the work
  useEffect(() => { if (working && working.spot.id !== hereId) leave(working); }, [working, hereId, leave]);

  // The space bar is the button (while a game is up it is the game's).
  useEffect(() => {
    if (working || (!here && !digHere) || chart || mapOpen) return;
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      if ((e.key !== " " && e.code !== "Space") || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      // (what a place offers first; with nothing here, the dig for the chest)
      if (here) begin(); else void digFor();
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [working, here, begin, chart, mapOpen, digHere, digFor]);

  // (for scripts in `next dev`: what the forest has for me, what is offered where I stand, and the way to begin it)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      sights: () => seen.current.map((x) => ({ ...x, ...placeAt(x.id), secret: isSecret(x.id) })), glints: () => glints.current, here: () => (here ? { ...here.sight, kind: here.spot.kind } : null), act: () => begin(),
      game: () => working?.game ?? null,
      /** How many things the squirrel has fetched since the page came up. */
      fetched: () => fetched.current,
      /** What is offered where I stand: by my own hands, by the piglet; and the way to have the piglet do it. */
      offers: () => ({ hand: byHand, piglet: byPig }), actPiglet: () => begin(true),
      /** The firefly lantern: whether it is lit, over how many places on the screen its fireflies are, and the chart. */
      lit: () => lantern.current, flies: () => fliesOver.current, chart: (open: boolean) => setChart(open), secrets: () => SECRETS.map((p) => ({ ...p })),
      /** A sprite's map: the hunt I am on, the digs of it this page saw, whether a dig is offered here, and the ways to unroll a map and to dig. */
      hunt: () => hunt, probes: () => probes.current.map((p) => ({ x: p.x, y: p.y, warm: p.warm })), digHere: () => digHere, unroll: () => unroll(), digFor: () => digFor(), map: (open: boolean) => setMapOpen(open),
      /** The tile I stand still on, as this page has it. */
      tile: () => tile,
      /** At a secret place: which of its two games is up (0, 1), or null. And how much harder what is up is for me. */
      stage: () => working?.stage ?? null, harder: () => (working ? harderOf(working.sight.item, points) : null),
    };
    (window as unknown as { __townForest?: typeof handle }).__townForest = handle;
    return () => { delete (window as unknown as { __townForest?: typeof handle }).__townForest; };
  }, [here, begin, working, byHand, byPig, points, hunt, digHere, unroll, digFor, tile]);

  return (
    <>
      {/* the firefly lantern's own button: the whole forest on a chart */}
      {lit && !working && (
        <button type="button" onClick={() => setChart(true)} data-forest-lantern aria-label={th ? "ป่าในแสงหิ่งห้อย" : "The forest by firefly light"}
                className="pressable pointer-events-auto absolute left-3 top-[11.5rem] z-20 grid size-11 place-items-center rounded-full border border-[#c8f07a]/70 bg-[#101a12]/85 shadow-lg shadow-black/40 backdrop-blur-sm">
          <TownIcon name={"charmFirefly" as IconName} size={30} />
        </button>
      )}
      {chart && lit && <TownForestChart th={th} sights={seen.current} self={selfAt.current} still={stillNow.current} onClose={() => setChart(false)} />}
      {/* a sprite's treasure map: its own button (the maps left today; a red mark while a hunt is on), and the map itself */}
      {mapHad && !working && (hunt || mapsLeft > 0) && (
        <button type="button" onClick={() => setMapOpen(true)} data-forest-mapchip data-hunt={hunt ? hunt.n : ""} data-left={mapsLeft} aria-label={th ? "ลายแทงของภูตป่า" : "A sprite's treasure map"}
                className="pressable pointer-events-auto absolute left-3 top-[15rem] z-20 grid size-11 place-items-center rounded-full border border-[#e2c27a]/80 bg-[#3a2513]/85 shadow-lg shadow-black/40 backdrop-blur-sm">
          <TownIcon name={"thingMap" as IconName} size={30} />
          {hunt ? <span aria-hidden className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-[#3a2513] bg-[#e0392b] ${stillNow.current ? "" : "animate-pulse motion-reduce:animate-none"}`} />
            : <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-[#3a2513] bg-[#f0c060] font-data text-label font-semibold tabular-nums text-[#3a2209]">{mapsLeft}</span>}
        </button>
      )}
      {mapOpen && mapHad && (hunt
        ? <TownForestMap th={th} hunt={hunt} probes={probes.current} self={selfAt.current} left={mapsLeft} still={stillNow.current} onClose={() => setMapOpen(false)} />
        : (
          // rolled up still: unrolling it uses one of the day's
          <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/45 p-2" data-forest-map-rolled onClick={() => setMapOpen(false)}>
            <section aria-label={th ? "ลายแทงของภูตป่า" : "A sprite's treasure map"} onClick={(e) => e.stopPropagation()} data-state="open"
                     className="pop-in flex w-full max-w-[18rem] flex-col items-center gap-3 rounded-[6px] border-[3px] border-[#6b4a22] bg-[#ecd9a8] p-4 shadow-[inset_0_0_0_2px_#f6e9c4,inset_0_0_26px_rgba(120,80,30,0.35),0_14px_28px_rgba(0,0,0,0.6)]">
              <TownIcon name={"thingMap" as IconName} size={84} />
              <button type="button" onClick={() => void unroll()} disabled={mapsLeft <= 0} data-forest-unroll
                      className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] px-4 text-read font-semibold text-[#3a2209] shadow-[inset_0_-4px_0_#c98f2f,inset_0_2px_0_#ffe19a] disabled:opacity-50">
                {th ? "คลี่ลายแทง" : "Unroll the map"}
                <span className="rounded-full bg-[#3a2209]/15 px-2 py-px font-data text-meta tabular-nums">{mapsLeft}</span>
              </button>
              <button type="button" onClick={() => setMapOpen(false)} className="pressable rounded-md px-2.5 py-1 text-meta text-[#6b4a22] hover:text-[#2f1b08]">{th ? "ยังก่อน" : "Not yet"}</button>
            </section>
          </div>
        ))}
      {(working || here || note || digHere) && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
          {note && (
            <p className="pop-in flex items-center gap-1.5 rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-forest-note={noteBy ?? ""} aria-live="polite">
              {noteBy && <TownIcon name={noteBy} size={20} />}{note}
            </p>
          )}
          {working && tile ? (() => {
            const { spot, sight, game, pig, stage } = working, how = ruleOf(spot).how, secret = stage !== undefined, games = gamesOf(spot);
            const title = secret ? `${th ? SECRET[spot.kind as SecretKind][0] : SECRET[spot.kind as SecretKind][1]} · ${stage + 1}/2`
              : pig ? (th ? "หมูน้อยขุด" : "The piglet digs") : th ? VERB[how][0] : VERB[how][1];
            // (a good thing is harder for a practised hand; what is buried and unseen is dug as by anybody)
            const hard = harderOf(sight.item, points);
            const done = (r: GameResult) => {
              // (tired hands that let it fall have gathered nothing, and lost nothing)
              if (!secret && r.dropped) { setWorking(null); say("shaky"); return; }
              if (secret) {
                // a secret place: not one miss in either game, or it is gone; the first won, the second begins
                if (r.dropped || r.misses > 0) { setWorking(null); void act(spot, working.from, { misses: Math.max(1, r.misses), wrong: 0, secs: (working.secs ?? 0) + r.secs, lost: true }); return; }
                if (stage === 0 && games) { sfx?.wake(); sfx?.work("pick"); setWorking({ ...working, game: gameFor(games[1], spent)!, stage: 1, secs: r.secs }); if (games[1] === "shake") sfx?.work("shake"); return; }
                setWorking(null);
                void act(spot, working.from, { misses: 0, wrong: 0, secs: (working.secs ?? 0) + r.secs });
                return;
              }
              setWorking(null);
              // among mushrooms a look-alike taken is a toadstool; among anything else, one fewer
              const wrong = game === "choosing" ? r.misses : 0;
              void act(spot, tile, { misses: game === "choosing" ? (spot.kind === "mushrooms" ? 0 : wrong) : r.misses, wrong, secs: r.secs, ...(pig ? { with: "famPiglet" } : {}) });
            };
            const common = { th, title, onDone: done, onCancel: () => leave(working), onHit: (hit: boolean) => { sfx?.wake(); sfx?.work(GAME_FX[game][hit ? 0 : 1]); } };
            return (
              <div key={`${spot.id}:${stage ?? "x"}`} className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game={game} data-secret-stage={stage ?? ""}>
                {game === "choosing" ? <TownChoosing {...common} need={sight.n} spent={spent} eye={eye} harder={hard} icon={iconFor(sight.item)} scene={art("gameFloor")} />
                  : game === "digging" ? <TownDigging {...common} need={sight.n} spent={spent} eye={eye} how={{ gentle: !!pig, harder: hard }} scene={art("gameMound")} />
                    : game === "catching" ? <TownCatching {...common} need={sight.n} spent={spent} eye={eye + (secret ? 0 : famBy(purse, "famSquirrel"))} harder={hard} icon={iconFor(sight.item)} scene={art("gameCrown")} />
                      : <TownSteady {...common} need={FARMING.tired} mods={{ spent: true, drops: true }} icon="hand" over={iconFor(sight.item)} />}
              </div>
            );
          })() : (here || digHere) && (
            <div className="pointer-events-none mb-14 flex max-w-[16.5rem] flex-wrap items-center justify-center gap-2 sm:max-w-none">
              {here && byHand && (hereSecret ? (
                // a secret place of the deep woods: its own button, with a mark for each of its two games
                <button type="button" onClick={() => begin()} data-forest-offer="secret" data-secret-kind={here.spot.kind} data-state="open"
                        className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border-2 border-[#c8f07a] bg-[#16210f] py-1 pl-2 pr-4 text-read font-semibold text-[#e8ffb8] shadow-[0_0_18px_rgba(200,240,122,0.45),0_10px_20px_rgba(0,0,0,0.45)]">
                  <span className="grid size-10 place-items-center rounded-full bg-[#c8f07a]/15"><TownIcon name={"charmFirefly" as IconName} size={30} /></span>
                  {th ? SECRET[here.spot.kind as SecretKind][0] : SECRET[here.spot.kind as SecretKind][1]}
                  <span aria-hidden className="flex gap-1"><span className="size-2.5 rounded-full bg-[#c8f07a]" /><span className="size-2.5 rounded-full bg-[#c8f07a]" /></span>
                  <kbd aria-hidden className="hidden rounded border border-[#c8f07a]/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-[#c8f07a]/80 sm:inline">Space</kbd>
                </button>
              ) : (
                <button type="button" onClick={() => begin()} data-forest-offer={hereHow} data-state="open"
                        className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-read font-semibold text-bg shadow-xl shadow-black/40">
                  {th ? VERB[hereHow][0] : VERB[hereHow][1]}
                  <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>
                </button>
              ))}
              {/* on a sprite's hunt, in or about the map's ring: a dig for the chest */}
              {digHere && (
                <button type="button" onClick={() => void digFor()} data-forest-offer="chest" data-state="open"
                        className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border-2 border-[#6b4a22] bg-[#ecd9a8] py-1 pl-2 pr-4 text-read font-semibold text-[#4a2d12] shadow-xl shadow-black/40">
                  <span className="grid size-10 place-items-center rounded-full bg-[#6b4a22]/15"><TownIcon name={"spriteChest" as IconName} size={30} /></span>
                  {th ? "ขุดหาหีบ" : "Dig for the chest"}
                  {!here && <kbd aria-hidden className="hidden rounded border border-[#6b4a22]/50 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-[#6b4a22] sm:inline">Space</kbd>}
                </button>
              )}
              {/* the piglet's way, beside the hoe's where there is a hoe: its picture, and the holes it has left to these hours */}
              {here && byPig && (
                <button type="button" onClick={() => begin(true)} data-forest-offer="piglet" data-left={usesLeft(purse, "famPiglet", keeper.now())} data-state="open"
                        className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-gold py-1 pl-2 pr-4 text-read font-semibold text-bg shadow-xl shadow-black/40">
                  <span className="grid size-10 place-items-center rounded-full bg-bg/25"><TownIcon name={"famPiglet" as IconName} size={30} /></span>
                  {th ? "ให้หมูน้อยขุด" : "Let the piglet dig"}
                  <span className="rounded-full bg-bg/25 px-2 py-px font-data text-meta tabular-nums">{usesLeft(purse, "famPiglet", keeper.now())}</span>
                  {!byHand && <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
