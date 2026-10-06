"use client";

import { useEffect, useRef } from "react";
import { isSecret, placeAt, type Sight } from "@/lib/town/forest";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import { FOREST, groundAt, zoneAt, type Vec } from "@/lib/town/world";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";

/** The chart's size on the page, in its own units: the forest seen as the map shows it, a diamond twice as wide as it is tall. */
const W = 352, H = 196, PAD = 10;
/** Where a tile of the forest is on the chart, as shares of its width and height. */
const at = (x: number, y: number): [number, number] => {
  const u = x - FOREST.x, v = y - FOREST.y;
  return [(PAD + ((u - v + FOREST.h) / (FOREST.w + FOREST.h)) * (W - 2 * PAD)) / W, (PAD + ((u + v) / (FOREST.w + FOREST.h)) * (H - 2 * PAD)) / H];
};
/** The ground's colours by firefly light: water, sand, the trails, the meadow, the woods, and the deep woods beyond the stream. */
const INK: Record<string, string> = { water: "#2c6f93", sand: "#b9a26b", road: "#a88a5c", grass: "#5f8f45", wood: "#35502a", deep: "#243a25" };
const iconFor = (item: ItemId | null): IconName => {
  const name = item ? iconOf(item) : "mound";
  return (name in ICON_ATLAS.icons ? name : "mound") as IconName;
};

/**
 * The whole forest by firefly light (lib/town/gifts' charmFirefly, the forest's fourth rank): a chart of the map with
 * what every place holds for its wearer now, at any hour, the buried things and the secret places of the deep woods
 * among them, and where they themselves stand. On the wearer's own screen. It shows; it finds nothing more.
 */
export default function TownForestChart({ th, sights, self, still, onClose }: {
  th: boolean;
  /** What every place has for me now: with the lantern worn, all of it. */
  sights: Sight[];
  /** Where I stand. */
  self: Vec | null;
  /** Whether the town stands still (the map's own switch, and the device's). */
  still: boolean;
  onClose: () => void;
}) {
  const ground = useRef<HTMLCanvasElement>(null);
  // The ground, drawn once: a dot a tile, as the map lays them.
  useEffect(() => {
    const c = ground.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const k = c.width / W;
    ctx.clearRect(0, 0, c.width, c.height);
    for (let v = 0; v < FOREST.h; v++) for (let u = 0; u < FOREST.w; u++) {
      const x = FOREST.x + u, y = FOREST.y + v, g = groundAt(x, y), [px, py] = at(x + 0.5, y + 0.5);
      ctx.fillStyle = INK[g === "wood" && zoneAt(x, y) === "deep" ? "deep" : g] ?? INK.wood;
      ctx.fillRect(Math.round(px * c.width - 2 * k), Math.round(py * c.height - k), Math.ceil(4 * k), Math.ceil(2 * k));
    }
  }, []);
  // Escape puts it away. Heard before the town hears it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [onClose]);

  const me = self ? at(self.x, self.y) : null;
  const secrets = sights.filter((s) => isSecret(s.id)).length;
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/45 p-2" data-forest-chart data-places={sights.length} data-secrets={secrets} onClick={onClose}>
      <section aria-label={th ? "ป่าในแสงหิ่งห้อย" : "The forest by firefly light"} onClick={(e) => e.stopPropagation()}
               className="pop-in w-full max-w-[26rem] rounded-lg border-[3px] border-[#16210f] bg-[#101a12] p-2 shadow-[inset_0_0_0_2px_#3d5a2c,0_14px_28px_rgba(0,0,0,0.6)] sm:max-w-[44rem]" data-state="open">
        <div className="flex min-h-9 items-center gap-2 px-1">
          <TownIcon name={"charmFirefly" as IconName} size={26} />
          <h2 className="font-display text-title font-semibold text-[#e8ffb8] [text-shadow:0_2px_0_#16210f]">{th ? "ป่าในแสงหิ่งห้อย" : "The forest by firefly light"}</h2>
          <button type="button" onClick={onClose} className="pressable ml-auto rounded-md px-2.5 py-1.5 text-meta text-[#b9d490] hover:text-[#f3ffd9]">{th ? "ปิด" : "Close"}</button>
        </div>
        <div className="relative mt-1 w-full overflow-hidden rounded-[4px] border-[3px] border-[#16210f] bg-[#0b120c]" style={{ aspectRatio: `${W} / ${H}` }}>
          <canvas ref={ground} width={W * 2} height={H * 2} aria-hidden className="absolute inset-0 size-full [image-rendering:pixelated]" />
          {sights.map((s) => {
            const p = placeAt(s.id);
            if (!p) return null;
            const [px, py] = at(p.x + 0.5, p.y + 0.5), secret = isSecret(s.id);
            return (
              <span key={s.id} data-chart-place={s.id} data-secret={secret ? "1" : "0"} title={s.item ? `${th ? ITEMS[s.item].name.th : ITEMS[s.item].name.en} ×${s.n}` : undefined}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${secret ? "z-10" : ""}`} style={{ left: `${px * 100}%`, top: `${py * 100}%` }}>
                {secret && <span aria-hidden className={`absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d6ff78]/35 shadow-[0_0_10px_4px_rgba(214,255,120,0.45)] ${still ? "" : "animate-pulse motion-reduce:animate-none"}`} />}
                <span className="relative block [filter:drop-shadow(0_1px_0_rgba(0,0,0,0.8))] sm:scale-150"><TownIcon name={iconFor(s.item)} size={secret ? 20 : 14} /></span>
              </span>
            );
          })}
          {me && (
            <span data-chart-me className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${me[0] * 100}%`, top: `${me[1] * 100}%` }}>
              <span aria-hidden className={`absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffe19a]/60 ${still ? "" : "animate-ping motion-reduce:animate-none"}`} />
              <span className="relative block size-2.5 rounded-full border-2 border-[#16210f] bg-[#ffe19a]" />
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
