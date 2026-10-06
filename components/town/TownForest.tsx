"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FARMING } from "@/lib/town/farm";
import { KINDS, SPOTS, gameFor, mayGather, reaches, type Gather, type Sight, type Spot } from "@/lib/town/forest";
import { ITEMS, byOf, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx, WorkSound } from "@/lib/town/sfx";
import { WILD_WISHES } from "@/lib/town/forest-eye";
import type { WishId } from "@/lib/town/fountain";
import { charmBy, famBy } from "@/lib/town/gifts";
import { isSpent, levelOf } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import type { Vec } from "@/lib/town/world";
import TownCatching from "./TownCatching";
import TownChoosing from "./TownChoosing";
import TownDigging from "./TownDigging";
import type { FarmDraw } from "./TownFarm";
import type { GameResult } from "./TownGame";
import { ICON_ATLAS, type IconName } from "./TownIcon";
import TownSteady from "./TownSteady";
import { WHY } from "./TownTrade";
import { Vfx, type VfxKind } from "./vfx";

/** The word on the button for each way of gathering. */
const VERB: Record<Gather, [th: string, en: string]> = {
  pick: ["เก็บ", "Pick up"], choose: ["เลือกเก็บ", "Gather"], dig: ["ขุด", "Dig"], shake: ["เขย่าต้นไม้", "Shake the tree"],
};
const WHY_FOREST: Record<string, [string, string]> = {
  had: ["เก็บจากตรงนี้ไปแล้ว", "You have gathered here already"], bare: ["ไม่เหลือแล้ว", "There is none left"], far: ["ยืนไกลเกินไป", "Too far to reach"],
  none: ["ไม่มีอะไรแล้ว", "Nothing is here any more"], tool: ["ของในมือขุดไม่ได้", "What you hold does not dig"],
  shaky: ["หมดแรง มือสั่นจนเก็บไม่ขึ้น", "Too tired: your hands shake, and it comes to nothing"],
};
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

/**
 * The forest's things, to gather (the owner, 2026-10-05: "หาของป่า … สามารถเดินเข้าไปเก็บของป่าที่จะ spawn ออกมาเป็นช่วงเวลา …
 * การหาของป่าต้องเล่น minigame ด้วย"). The rules are lib/town/forest's. Every place that has something for me is drawn on
 * the map: the thing itself where it lies or grows, fruit up in its tree, and a mound of earth for what is buried
 * (which is not told until it is dug out). Standing at one, gathering it is offered as one button, when the hand
 * can do it: a hoe for what is dug, anything for the rest. Each way of gathering is a game of its own; picking
 * something up off the ground is none, but for tired hands.
 *
 * What is kept is the keeper's (lib/town/keeper): in `next dev`'s test room the browser's trial, one forest for
 * the browser.
 */
export default function TownForest({ keeper, th, tile, near, sfx, bottom, art, register }: {
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
  const [working, setWorking] = useState<{ spot: Spot; sight: Sight; game: NonNullable<ReturnType<typeof gameFor>> } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2600); return () => clearTimeout(t); }, [note]);
  const vfx = useMemo(() => new Vfx(), []);

  // What every place has for me now: looked at afresh when something changes and every few seconds, not every frame.
  const seen = useRef<Sight[]>([]);
  seen.current = near ? keeper.wild() : [];

  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, s, now: t, img, still, self, dark, over } = frame;
      // (in the dark, what can be gathered within the lamp's light glints: on my own screen, and nothing more is found for it)
      const reach = (dark ?? 0) > 0.3 && self ? lamp.current : 0;
      let lit = 0;
      vfx.draw(frame);
      if (!img?.complete || !img.naturalWidth) return;
      const blit = (name: IconName, at: Vec, lift = 0, k = SIZE * s) => {
        const cell = ICON_ATLAS.icons[name];
        if (!cell) return;
        const [x, y, w, h] = cell;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, w, h, Math.round(at.x - (w * k) / 2), Math.round(at.y - h * k + 5 * s - lift), w * k, h * k);
      };
      for (const sight of seen.current) {
        const spot = SPOTS[sight.id];
        if (!spot) continue;
        const at = project({ x: spot.x + 0.5, y: spot.y + 0.5 });
        if (!onScreen(at)) continue;
        const icon = iconFor(sight.item), fruit = spot.kind === "fruit", rare = !!sight.item && ITEMS[sight.item].pays >= RARE;
        if (!fruit && reach > 0 && Math.hypot(spot.x + 0.5 - self!.x, spot.y + 0.5 - self!.y) <= reach) lit++;
        // (fruit hangs in the crown of its tree, in front of it; everything else lies at its place)
        things.push({ depth: spot.x + spot.y + (fruit ? 1.05 : 0.6), draw: () => {
          if (fruit) {
            for (const [dx, up] of [[-14, 58], [10, 66], [2, 46]]) blit(icon, { x: at.x + dx * s, y: at.y }, (up + (still ? 0 : Math.sin(t / 700 + spot.id + dx) * 1.5)) * s, SIZE * s * 0.62);
          } else {
            blit(icon, at);
            // (the lamp's glint on it: over the night's dark, where it shows)
            if (reach > 0 && Math.hypot(spot.x + 0.5 - self!.x, spot.y + 0.5 - self!.y) <= reach) {
              over?.(() => {
                const d = Math.max(2, Math.round(2.5 * s)), gx = Math.round(at.x + 9 * s), gy = Math.round(at.y - 24 * s);
                ctx.fillStyle = `rgba(255,236,170,${(still ? 0.9 : 0.5 + 0.45 * Math.sin(t / 380 + spot.id * 1.7)).toFixed(3)})`;
                ctx.fillRect(gx - d, gy, 3 * d, d);
                ctx.fillRect(gx, gy - d, d, 3 * d);
              });
            }
            if (sight.n > 1 && KINDS[spot.kind].how !== "dig") blit(icon, { x: at.x + 11 * s, y: at.y + 3 * s }, 0, SIZE * s * 0.8);
          }
          if (rare && (still || Math.floor(t / 420 + spot.id) % 3 !== 0)) blit("plotShine", { x: at.x + 9 * s, y: at.y }, 18 * s, SIZE * s * 0.8);
        } });
      }
      glints.current = lit;
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
  const here = tile && near ? seen.current.map((sight) => ({ sight, spot: SPOTS[sight.id] })).filter(({ spot }) => spot && reaches(spot, tile) && mayGather(spot.kind, hand))
    .sort((a, b) => Math.hypot(a.spot.x - tile[0], a.spot.y - tile[1]) - Math.hypot(b.spot.x - tile[0], b.spot.y - tile[1]))[0] ?? null : null;
  const hereId = here?.spot.id ?? -1;
  const nameOf = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const say = useCallback((why: string) => { const w = WHY_FOREST[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);

  /** Gather from a place, and say what came of it. */
  const act = useCallback(async (spot: Spot, at: [number, number], went: { misses: number; wrong: number; secs?: number }) => {
    const did = await keeper.gatherDo(spot.id, at, went);
    if (!did.ok) { say(did.why); return; }
    setNote(did.got.map(([id, n]) => `${nameOf(id)} ×${n}`).join(" · "));
    const how = KINDS[spot.kind].how, [fx, sound] = FX[how], where = { x: spot.x + 0.5, y: spot.y + 0.5 };
    sfx?.wake();
    sfx?.work(sound);
    vfx.add(fx, where);
    if (did.got.length) vfx.add("pop", where, { icon: did.got[0][0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the names are read when the thing is got
  }, [keeper, th, sfx, say, vfx]);

  const begin = useCallback(() => {
    if (!here || !tile) return;
    const game = gameFor(KINDS[here.spot.kind].how, spent);
    if (game) { setWorking({ ...here, game }); if (game === "catching") { sfx?.wake(); sfx?.work("shake"); } }
    else void act(here.spot, tile, { misses: 0, wrong: 0 });
  }, [here, tile, spent, act, sfx]);

  // walking off leaves the work
  useEffect(() => { if (working && working.spot.id !== hereId) setWorking(null); }, [working, hereId]);

  // The space bar is the button (while a game is up it is the game's).
  useEffect(() => {
    if (working || !here) return;
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
  }, [working, here, begin]);

  // (for scripts in `next dev`: what the forest has for me, what is offered where I stand, and the way to begin it)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      sights: () => seen.current.map((x) => ({ ...x, ...SPOTS[x.id] })), glints: () => glints.current, here: () => (here ? { ...here.sight, kind: here.spot.kind } : null), act: begin,
      game: () => working?.game ?? null,
    };
    (window as unknown as { __townForest?: typeof handle }).__townForest = handle;
    return () => { delete (window as unknown as { __townForest?: typeof handle }).__townForest; };
  }, [here, begin, working]);

  if (!working && !here && !note) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {working && tile ? (() => {
        const { spot, sight, game } = working, how = KINDS[spot.kind].how, title = th ? VERB[how][0] : VERB[how][1];
        const done = (r: GameResult) => {
          setWorking(null);
          // (tired hands that let it fall have gathered nothing, and lost nothing)
          if (r.dropped) { say("shaky"); return; }
          // among mushrooms a look-alike taken is a toadstool; among anything else, one fewer
          const wrong = game === "choosing" ? r.misses : 0;
          void act(spot, tile, { misses: game === "choosing" ? (spot.kind === "mushrooms" ? 0 : wrong) : r.misses, wrong, secs: r.secs });
        };
        const common = { th, title, onDone: done, onCancel: () => setWorking(null), onHit: (hit: boolean) => { sfx?.wake(); sfx?.work(GAME_FX[game][hit ? 0 : 1]); } };
        return (
          <div className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game={game}>
            {game === "choosing" ? <TownChoosing {...common} need={sight.n} spent={spent} eye={eye} icon={iconFor(sight.item)} scene={art("gameFloor")} />
              : game === "digging" ? <TownDigging {...common} need={sight.n} spent={spent} eye={eye} scene={art("gameMound")} />
                : game === "catching" ? <TownCatching {...common} need={sight.n} spent={spent} eye={eye + famBy(purse, "famSquirrel")} icon={iconFor(sight.item)} scene={art("gameCrown")} />
                  : <TownSteady {...common} need={FARMING.tired} mods={{ spent: true, drops: true }} icon="hand" over={iconFor(sight.item)} />}
          </div>
        );
      })() : here && (
        <button type="button" onClick={begin} data-forest-offer={KINDS[here.spot.kind].how} data-state="open"
                className="pop-in pressable pointer-events-auto mb-14 flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-read font-semibold text-bg shadow-xl shadow-black/40">
          {th ? VERB[KINDS[here.spot.kind].how][0] : VERB[KINDS[here.spot.kind].how][1]}
          <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>
        </button>
      )}
    </div>
  );
}
