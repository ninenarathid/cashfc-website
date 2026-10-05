"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WATER } from "@/lib/town/farm";
import { GROUND, reaches, type Dropped } from "@/lib/town/ground";
import { ITEMS, iconOf, potIconOf } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import type { Vec } from "@/lib/town/world";
import type { FarmDraw } from "./TownFarm";
import { ICON_ATLAS, type IconName } from "./TownIcon";
import { StackIcon, WHY, WHY_GROUND } from "./TownTrade";

/**
 * What a tap on the map came to here: nothing of the ground's (null), or a thing's: picked up where I stand, or to be
 * walked to. With `peek` nothing is done: it only says whether a thing is drawn under that point.
 */
export type GroundTap = (x: number, y: number, peek?: boolean) => { walk: Vec | null } | null;
/** Where things on one tile lie beside each other, in tiles from the tile's corner: the first a little before whoever stands there. */
const SPREAD: Array<[number, number]> = [[0.72, 0.72], [0.42, 0.86], [0.86, 0.42], [0.3, 0.52], [0.52, 0.3], [0.62, 0.98]];
/** How wide a thing is drawn on the ground, in the map's own pixels; and the last seconds of its time, in which it flickers. */
const WIDE = 20, LAST = 3000;
/** The picture of a stack: the thing's own, but a pot of food is its dish's pot, and a bucket with water in it is full. */
const pictureOf = (d: Dropped): string => (d.stack.of ? potIconOf(d.stack.of.dish) : d.stack.water && d.stack.item in WATER.buckets ? `${d.stack.item}Full` : iconOf(d.stack.item));

/**
 * Things dropped on the ground (lib/town/ground; the owner, 2026-10-05: "ทิ้งของ
 * ที่ไม่ใช้จากกระเป๋าได้ ลงพื้น คนอื่นเก็บได้ แต่ถ้าไม่มีคนเก็บจะหายไปใน 10 วิ"). What
 * lies about is drawn where it lies, on whichever map, flickering as its time
 * runs out. Whoever stands by a thing is offered it; a tap on a thing picks it
 * up from where I stand, or walks to it and picks it up there.
 *
 * Dropping is the bag's (TownTrade): this is the ground's side of it.
 *
 * What is kept is the keeper's: for a member the database's (v134), in `next
 * dev`'s test room the browser's trial. A keeper that knows of no ground (the
 * database before v134) has nothing lying anywhere.
 */
export default function TownGround({ keeper, th, here, bottom, sfx, register, registerTap }: {
  keeper: Keeper;
  th: boolean;
  /** The tile I stand still on, while nothing else is open over the map; null otherwise. */
  here: [number, number] | null;
  /** How far up from the foot of the map what is offered sits. */
  bottom: string;
  sfx: FishSfx | null;
  /** Hand the map the way to draw what lies about, and the way to ask whether a tap was on one of them (and take each back with null). */
  register: (draw: FarmDraw | null) => void;
  registerTap: (tap: GroundTap | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const lying = keeper.ground() ?? [], some = lying.length > 0;
  // (while anything lies: looked at again a few times a second, for the seconds it has left and for its going)
  useEffect(() => {
    if (!some) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [some]);
  const lyingRef = useRef<Dropped[]>(lying), hereRef = useRef(here);
  lyingRef.current = lying;
  hereRef.current = here;
  /** Where each thing is on the screen, as last drawn; the thing a tap asked for, to be picked up when I have walked to it; and whether a picking up is on its way. */
  const boxes = useRef<Array<{ id: number; x0: number; y0: number; x1: number; y1: number }>>([]);
  const want = useRef<number | null>(null), busy = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3200); return () => clearTimeout(t); }, [note]);

  const take = useCallback(async (id: number) => {
    const at = hereRef.current;
    if (!at || busy.current) return;
    busy.current = true;
    const did = await keeper.groundTake(id, at);
    busy.current = false;
    if (!did.ok) { const w = WHY_GROUND[did.why] ?? WHY[did.why as keyof typeof WHY] ?? WHY.none; setNote(th ? w[0] : w[1]); return; }
    sfx?.wake();
    sfx?.work("pick");
    const name = did.item in ITEMS ? (th ? ITEMS[did.item].name.th : ITEMS[did.item].name.en) : did.item;
    setNote(`${th ? "เก็บ" : "Picked up:"} ${name}${did.n > 1 ? ` ×${did.n}` : ""}`);
  }, [keeper, th, sfx]);

  // The map draws them, and asks here whether a tap was on one.
  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, sign, s, now: t, img, still } = frame;
      boxes.current = [];
      if (!img?.complete || !img.naturalWidth) return;
      const now = keeper.now(), on = new Map<string, number>();
      for (const d of lyingRef.current) {
        const tile = `${d.at[0]},${d.at[1]}`, nth = on.get(tile) ?? 0;
        on.set(tile, nth + 1);
        const [ox, oy] = SPREAD[nth % SPREAD.length], at = project({ x: d.at[0] + ox, y: d.at[1] + oy });
        if (!onScreen(at)) continue;
        const cell = ICON_ATLAS.icons[pictureOf(d) as IconName] ?? ICON_ATLAS.icons.mystery;
        if (!cell) continue;
        const [sx, sy, w, h] = cell, k = (WIDE * s) / Math.max(w, h), left = d.until - now;
        const bob = still ? 0 : Math.sin(t / 320 + d.id) * 1.2 * s, x = Math.round(at.x - (w * k) / 2), y = Math.round(at.y - h * k - 2 * s - bob);
        boxes.current.push({ id: d.id, x0: x - 6, y0: y - 6, x1: x + w * k + 6, y1: at.y + 6 });
        things.push({ depth: d.at[0] + ox + d.at[1] + oy, draw: () => {
          // its shadow, which stays put; the thing itself, fainter by turns in its last seconds (a still map shows it faint)
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          ctx.beginPath();
          ctx.ellipse(at.x, at.y, 7 * s, 3 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          const faint = left < LAST && (still || Math.floor(left / 180) % 2 === 0);
          ctx.globalAlpha = faint ? 0.4 : 1;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, sx, sy, w, h, x, y, w * k, h * k);
          ctx.globalAlpha = 1;
        } });
        if (d.stack.n > 1) sign(`×${d.stack.n}`, at.x, y - 4 * s);
      }
    });
    registerTap((x, y, peek = false) => {
      const hit = [...boxes.current].reverse().find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
      const d = hit ? lyingRef.current.find((l) => l.id === hit.id) : undefined;
      if (peek) return d ? { walk: null } : null;
      // (a tap anywhere else: whatever was being walked to is no longer wanted)
      if (!d) { want.current = null; return null; }
      const at = hereRef.current;
      if (at && reaches(d, at)) { want.current = null; void take(d.id); return { walk: null }; }
      want.current = d.id;
      return { walk: { x: d.at[0], y: d.at[1] } };
    });
    return () => { register(null); registerTap(null); };
  }, [register, registerTap, keeper, take]);

  // Walked up to the thing that was tapped: picked up, if it still lies there.
  const hereKey = here ? `${here[0]},${here[1]}` : "";
  useEffect(() => {
    const id = want.current, at = hereRef.current;
    if (id === null || !at) return;
    const d = lyingRef.current.find((l) => l.id === id);
    if (!d) { want.current = null; return; }
    if (reaches(d, at)) { want.current = null; void take(id); }
  }, [hereKey, take]);

  // (for scripts in `next dev`: what lies about, where each is on the screen, and picking one up)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = { lying: () => keeper.ground(), boxes: () => boxes.current.map((b) => ({ id: b.id, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 })), take, want: () => want.current, here: () => hereRef.current, note: () => note, lasts: GROUND.lasts };
    (window as unknown as { __townGround?: typeof handle }).__townGround = handle;
    return () => { delete (window as unknown as { __townGround?: typeof handle }).__townGround; };
  }, [keeper, take, note]);

  const near = here ? lying.filter((d) => reaches(d, here)).slice(0, 3) : [];
  if (!near.length && !note) return null;
  const now = keeper.now();
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-ground-note>{note}</p>}
      {near.length > 0 && (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          {near.map((d) => {
            const name = th ? ITEMS[d.stack.item].name.th : ITEMS[d.stack.item].name.en, secs = Math.max(1, Math.ceil((d.until - now) / 1000));
            return (
              <button key={d.id} type="button" onClick={() => void take(d.id)} data-ground-take={d.id} data-item={d.stack.item} data-state="open"
                      aria-label={`${th ? "เก็บ" : "Pick up"} ${name} ×${d.stack.n}`}
                      className="pop-in pressable flex min-h-12 items-center gap-2 rounded-full border border-line-lit bg-surface/95 pl-3 pr-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent">
                <StackIcon stack={d.stack} size={24} />
                <span className="max-w-[10rem] truncate">{th ? "เก็บ" : "Pick up"} {name}{d.stack.n > 1 && <span className="font-data font-normal tabular-nums text-muted"> ×{d.stack.n}</span>}</span>
                {/* the seconds it still lies there */}
                <span aria-hidden className={`font-data tabular-nums ${d.until - now < LAST ? "text-gold" : "text-muted"}`}>{secs}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
