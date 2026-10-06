"use client";

import { useEffect, useRef } from "react";
import type { HuntTold } from "@/lib/town/hunt";
import { CAMP, FOREST, GREAT_TREE, WATERFALL, groundAt, zoneAt, type Vec } from "@/lib/town/world";
import TownIcon, { type IconName } from "./TownIcon";

/** The map's size on the page, in its own units: the forest as the town's map shows it, a diamond twice as wide as it is tall. */
const W = 352, H = 196, PAD = 12;
/** Where a point of the forest is on the map, in its units. */
const at = (x: number, y: number): [number, number] => {
  const u = x - FOREST.x, v = y - FOREST.y;
  return [PAD + ((u - v + FOREST.h) / (FOREST.w + FOREST.h)) * (W - 2 * PAD), PAD + ((u + v) / (FOREST.w + FOREST.h)) * (H - 2 * PAD)];
};
/** A tile's length on the map, across and down: a circle on the ground is an ellipse here. */
const TILE = [(Math.SQRT2 / (FOREST.w + FOREST.h)) * (W - 2 * PAD), (Math.SQRT2 / (FOREST.w + FOREST.h)) * (H - 2 * PAD)];
/** The ground in a sprite's washes of brown ink: water, sand, the trails, the meadow, the woods, the deep woods. */
const WASH: Record<string, string> = { water: "#8fb0ab", sand: "#d9c08a", road: "#c39a5f", grass: "#cdbd80", wood: "#b9a36c", deep: "#a68f5c" };
/** A dig's mark by how warm it was: beside the chest, near, not far, far, cold. */
export const WARM_INK = ["#b3261e", "#c8371f", "#dd7a2a", "#d9ac33", "#6f9cae", "#4f7389"];

/**
 * A sprite's treasure map, unrolled (lib/town/hunt; the forest's fifth rank): the forest drawn in brown ink, a ring in
 * red where the chest lies, a mark for every dig so far in the colour of how warm it was, and where I stand. It is to
 * be read, walked to and felt for: it says where to look, never which tile.
 */
export default function TownForestMap({ th, hunt, probes, self, left, still, onClose }: {
  th: boolean;
  hunt: HuntTold;
  /** The digs of this hunt that missed, as this page saw them: where, and how warm. */
  probes: Array<{ x: number; y: number; warm: number }>;
  self: Vec | null;
  /** How many maps I have left today, this one used. */
  left: number;
  still: boolean;
  onClose: () => void;
}) {
  const ground = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ground.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const k = c.width / W;
    ctx.clearRect(0, 0, c.width, c.height);
    for (let v = 0; v < FOREST.h; v++) for (let u = 0; u < FOREST.w; u++) {
      const x = FOREST.x + u, y = FOREST.y + v, g = groundAt(x, y), [px, py] = at(x + 0.5, y + 0.5);
      ctx.fillStyle = WASH[g === "wood" && zoneAt(x, y) === "deep" ? "deep" : g] ?? WASH.wood;
      ctx.fillRect(Math.round((px - 2) * k), Math.round((py - 1) * k), Math.ceil(4 * k), Math.ceil(2 * k));
    }
  }, []);
  // Escape rolls it up. Heard before the town hears it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onClose]);

  const [cx, cy] = at(hunt.area.x + 0.5, hunt.area.y + 0.5), me = self ? at(self.x, self.y) : null;
  const [fx, fy] = at(CAMP.fire.x + 0.5, CAMP.fire.y + 0.5), [tx, ty] = at(GREAT_TREE.x + 1.5, GREAT_TREE.y + 1.5), [wx, wy] = at(WATERFALL.x, WATERFALL.y), [gx, gy] = at(FOREST.x + 48, FOREST.y + FOREST.h - 1);
  const ink = "#5a3a1c";
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/45 p-2" data-forest-map data-map-n={hunt.n} data-map-digs={hunt.digs} onClick={onClose}>
      <section aria-label={th ? "ลายแทงของภูตป่า" : "A sprite's treasure map"} onClick={(e) => e.stopPropagation()} data-state="open"
               className="pop-in w-full max-w-[26rem] rounded-[6px] border-[3px] border-[#6b4a22] bg-[#ecd9a8] p-2 shadow-[inset_0_0_0_2px_#f6e9c4,inset_0_0_26px_rgba(120,80,30,0.35),0_14px_28px_rgba(0,0,0,0.6)] sm:max-w-[44rem]">
        <div className="flex min-h-9 items-center gap-2 px-1">
          <TownIcon name={"thingMap" as IconName} size={26} />
          <h2 className="font-display text-title font-semibold text-[#4a2d12]">{th ? "ลายแทงของภูตป่า" : "A sprite's treasure map"}</h2>
          {/* which of the day's three this is: a mark each, the ones used inked in */}
          <span className="ml-1 flex gap-1" aria-label={`${hunt.n} / ${hunt.n + left}`} data-map-left={left}>
            {Array.from({ length: hunt.n + left }, (_, i) => <span key={i} className={`size-2.5 rotate-45 border-2 border-[#4a2d12] ${i < hunt.n ? "bg-[#b3261e]" : "bg-transparent"}`} />)}
          </span>
          <button type="button" onClick={onClose} className="pressable ml-auto rounded-md px-2.5 py-1.5 text-meta text-[#6b4a22] hover:text-[#2f1b08]">{th ? "ม้วนเก็บ" : "Roll up"}</button>
        </div>
        <div className="relative mt-1 w-full overflow-hidden rounded-[3px] border-2 border-[#8a6a3a] bg-[#e4cf98]" style={{ aspectRatio: `${W} / ${H}` }}>
          <canvas ref={ground} width={W * 2} height={H * 2} aria-hidden className="absolute inset-0 size-full opacity-90 [image-rendering:pixelated]" />
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
            {/* what a sprite would draw of the forest: the camp's fire, the great tree, the waterfall, the way in */}
            <g fill="none" stroke={ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d={`M${fx - 4} ${fy + 3} L${fx} ${fy - 4} L${fx + 4} ${fy + 3} Z`} fill="#d9843a" />
              <path d={`M${tx} ${ty + 5} V${ty - 1}`} />
              <circle cx={tx} cy={ty - 4} r="4.2" fill="#7f9a4a" />
              <path d={`M${wx - 3} ${wy - 3} q1.5 2 0 4 t0 4 M${wx} ${wy - 3} q1.5 2 0 4 t0 4 M${wx + 3} ${wy - 3} q1.5 2 0 4 t0 4`} stroke="#3f6f8a" />
              <path d={`M${gx} ${gy + 2} v-7 m-3 3 l3 -3 l3 3`} />
            </g>
            {/* the ring the chest lies inside, in a sprite's unsteady red */}
            <ellipse cx={cx} cy={cy} rx={hunt.area.r * TILE[0]} ry={hunt.area.r * TILE[1]} fill="rgba(179,38,30,0.10)" stroke="#b3261e" strokeWidth="1.6" strokeDasharray="5 3 2 3" strokeLinecap="round" data-map-ring>
              {!still && <animate attributeName="stroke-dashoffset" from="0" to="26" dur="2.6s" repeatCount="indefinite" />}
            </ellipse>
            {/* every dig so far, in the colour of how warm it was */}
            {probes.map((p, i) => { const [px, py] = at(p.x + 0.5, p.y + 0.5); return <circle key={i} cx={px} cy={py} r="2.6" fill={WARM_INK[Math.min(5, Math.max(0, p.warm))]} stroke={ink} strokeWidth="0.7" data-map-probe={p.warm} />; })}
            {me && (
              <g data-map-me>
                <circle cx={me[0]} cy={me[1]} r="3.4" fill="#fff6dc" stroke={ink} strokeWidth="1.2" />
                <circle cx={me[0]} cy={me[1]} r="1.3" fill={ink} />
              </g>
            )}
          </svg>
        </div>
      </section>
    </div>
  );
}
