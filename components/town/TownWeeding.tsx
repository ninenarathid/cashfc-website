"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keptMotion } from "@/lib/town/motion";
import type { TimingMods } from "@/lib/town/timing";
import { WEEDING, cleared, dropped, patchAt, startPatch, stirring, touch, type Patch, type Tuft } from "@/lib/town/weeding";
import TownIcon, { type IconName } from "./TownIcon";
import { GameFrame, PixelGround, STAGE, useFrames, useGameHandle, type GameProps } from "./TownGame";

/** The weeds a patch can have in it: the farm's own, as they stand on its plots. */
const WEEDS: IconName[] = ["weedTuft", "weedTall", "weedClover", "weedDandelion", "weedThistle", "weedCreeper", "weedBroad", "weedFern", "weedDry", "weedBlue", "weedSeed"];
const iconOf = (t: Tuft): IconName => (t.kind === "stone" ? "weedStone" : WEEDS[t.look % WEEDS.length]);
/** Where a place of the patch is, as shares of its width and height: its middle. */
const spot = (place: number) => ({ x: ((place % WEEDING.cols) + 0.5) / WEEDING.cols, y: (Math.floor(place / WEEDING.cols) + 0.5) / WEEDING.rows });

/**
 * A weed as it comes out: up, tipping over, and gone. For whoever has turned the town's motion off (the cog's switch,
 * lib/town/motion: the town's own, not the machine's word on motion) it is simply gone.
 */
const comeOut = (still: boolean) => (el: HTMLSpanElement | null) => {
  if (!el) return;
  el.animate([{ opacity: 1, transform: "translateY(0) rotate(0)" }, { opacity: 0, transform: "translateY(-44px) rotate(-16deg)" }], { duration: still ? 1 : 380, easing: "ease-out", fill: "forwards" });
};

/**
 * Pulling weeds on the screen (lib/town/weeding): a patch of the plot's earth seen close, weeds and stones standing
 * in it. A weed that is touched comes out, root and all; a stone, or bare earth, is a miss, and the patch jolts.
 * Every little while the wind goes through and things change places: it is seen coming, as everything shivers.
 *
 * Each place is a button, so it is played by a finger, the mouse or the keys alike.
 */
// ── forging: old tools ── (`glow`: the stones stand out in a light of their own, with a hoe that carries as much)
export default function TownWeeding({ th, title, need, mods, onDone, onCancel, onHit, glow = false }: GameProps & { need: number; mods: TimingMods; glow?: boolean }) {
  const patch = useRef<Patch>(startPatch(need, mods, Math.floor(Math.random() * 2 ** 31)));
  const from = useRef(0), ended = useRef(false);
  const [, setShown] = useState(0);
  /** Whether the town's motion is turned off on this device: things then change places at once, with no hop. */
  const [still] = useState(() => !keptMotion());
  /** Weeds on their way out of the ground: what each was, and where it stood. */
  const [pulled, setPulled] = useState<Array<{ tuft: Tuft; place: number; at: number }>>([]);
  const stage = useRef<HTMLDivElement>(null), things = useRef<HTMLDivElement>(null);
  const now = () => (performance.now() - from.current) / 1000;
  useEffect(() => { from.current = performance.now(); }, []);

  const finish = useCallback((p: Patch) => {
    if (ended.current) return;
    ended.current = true;
    const lost = dropped(p), secs = Math.round(now() * 10) / 10;
    window.setTimeout(() => onDone({ hits: p.hits, misses: p.misses, secs, need: p.need, ...(lost ? { dropped: true } : {}) }), lost ? 420 : 260);
  }, [onDone]);

  // the wind: when it has gone through, what stands where is drawn afresh; while it is coming, everything shivers
  useFrames((_dt, t) => {
    if (ended.current) return;
    const at = now(), next = patchAt(patch.current, at);
    if (next !== patch.current) { patch.current = next; setShown((n) => n + 1); }
    if (things.current) things.current.style.transform = stirring(next, at) ? `translateX(${Math.round(Math.sin(t / 22) * 2)}px)` : "";
  });

  const tap = useCallback((place: number) => {
    if (ended.current) return;
    const was = patchAt(patch.current, now()), next = touch(was, now(), place), hit = next.hits > was.hits;
    patch.current = next;
    onHit?.(hit);
    if (hit) {
      const tuft = was.cells[place]!;
      setPulled((list) => [...list.filter((g) => performance.now() - g.at < 500), { tuft, place, at: performance.now() }]);
    } else if (next.misses > was.misses) {
      stage.current?.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }], { duration: 180 });
    }
    setShown((n) => n + 1);
    if (cleared(next) || dropped(next)) finish(next);
  }, [onHit, finish]);

  // Escape gives the work up. Heard before the town hears it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onCancel]);

  useGameHandle({ kind: "weeding", patch: () => patchAt(patch.current, now()), touch: tap, stirring: () => stirring(patch.current, now()) }, [tap]);

  const p = patch.current;
  return (
    <GameFrame th={th} title={title} need={p.need} hits={p.hits} misses={p.misses} most={p.most} onCancel={onCancel}>
      <div ref={stage} className={`${STAGE} mt-2 aspect-[2/1] w-full`} data-look="weeding">
        <PixelGround kind="soil" className="absolute inset-0 size-full" />
        {/* the places, each a button: what stands in it is said for whoever cannot see it */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${WEEDING.cols}, 1fr)`, gridTemplateRows: `repeat(${WEEDING.rows}, 1fr)` }}>
          {p.cells.map((c, i) => (
            <button key={i} type="button" data-place={i} data-kind={c?.kind ?? "bare"}
                    aria-label={c?.kind === "weed" ? (th ? "ต้นหญ้า" : "A weed") : c?.kind === "stone" ? (th ? "ก้อนหิน" : "A stone") : th ? "ดินเปล่า" : "Bare earth"}
                    onPointerDown={(e) => { e.preventDefault(); tap(i); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) tap(i); } }}
                    className="touch-none outline-none focus-visible:shadow-[inset_0_0_0_3px_#ffe19a]" />
          ))}
        </div>
        {/* what stands in them: each thing goes to its new place when the wind has been */}
        <div ref={things} className="pointer-events-none absolute inset-0">
          {p.cells.map((c, i) => c && (
            <span key={c.id} className={`absolute -translate-x-1/2 -translate-y-[62%] ${still ? "" : "transition-[left,top] duration-150 ease-out"}`}
                  style={{ left: `${spot(i).x * 100}%`, top: `${spot(i).y * 100}%` }}>
              <span className="block" data-glow={glow && c.kind === "stone" ? "" : undefined}
                    style={{ transform: c.look % 2 ? "scaleX(-1)" : undefined, filter: glow && c.kind === "stone" ? "drop-shadow(0 0 2px #fff6d8) drop-shadow(0 0 6px #fff6d8)" : undefined }}><TownIcon name={iconOf(c)} size={c.kind === "stone" ? 44 : 54} /></span>
            </span>
          ))}
          {/* a weed pulled: up out of the ground, and gone */}
          {pulled.map((g) => (
            <span key={`${g.tuft.id}-${g.at}`} ref={comeOut(still)} className="absolute -translate-x-1/2 -translate-y-[62%]" style={{ left: `${spot(g.place).x * 100}%`, top: `${spot(g.place).y * 100}%` }}>
              <TownIcon name={iconOf(g.tuft)} size={54} />
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-xs leading-relaxed text-[#ffeccb]">
        {th ? "กดต้นหญ้าเพื่อถอน • หลีกเลี่ยงหินกับดินเปล่า • ระวังการสลับตำแหน่ง" : "Tap weeds to pull them • Avoid stones and bare earth • Watch for positions changing"}
      </p>
    </GameFrame>
  );
}
