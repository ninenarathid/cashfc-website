"use client";

import { useMemo } from "react";
import { TIER_FX, TIER_LOOK, type RareTier } from "@/lib/popoto-rare";

/**
 * The fanfare a prize arrives with, scaled to a card.
 *
 * Used by the prize inventory and by the wallet, which is why it lives on its
 * own rather than inside either of them.
 *
 * The rare popoto's, not a second one: the same TIER_FX numbers and the same
 * keyframes out of globals.css, so R, SR and UR mean the same amount of noise
 * whichever of the two things is making it. What is different is where it
 * happens — a popoto takes over the screen because it is a thing you open,
 * and a prize is a row in a list you came to on purpose, so it stays inside
 * its own card and lets the rest of the page alone.
 */
export function Fanfare({ tier, hue }: { tier: RareTier; hue: string }) {
  const fx = TIER_FX[tier];
  const look = TIER_LOOK[tier];
  const ultra = tier === "ultra";

  const stars = useMemo(() => Array.from({ length: fx.stars }, (_, i) => {
    const a = i * 2.39996;            // the golden angle, so they never line up
    const r = 30 + ((i * 37) % 100) / 100 * 45;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.5,
             size: 6 + (i % 4) * 4, delay: (i * 173) % 1600, light: i % 2 === 0 };
  }), [fx.stars]);

  const crumbs = useMemo(() => Array.from({ length: look.crumbs }, (_, i) => {
    const a = (i / look.crumbs) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
    const r = (40 + (i % 4) * 18) * fx.reach;
    return { dx: `${Math.cos(a) * r}px`, dy: `${Math.sin(a) * r * 0.6}px`,
             size: (4 + (i % 3) * 2) * (ultra ? 1.4 : 1), light: i % 3 === 0,
             delay: (i % 5) * 40 };
  }), [look.crumbs, fx.reach, ultra]);

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <span className="rare-flash absolute inset-0"
            style={{ ["--flash" as string]: fx.flash,
                     background: `radial-gradient(circle at 12% 50%, #fff 0%, ${hue} 60%, transparent 100%)` }} />
      <span className={`rare-aura absolute inset-0 ${ultra ? "rare-ultra-glow" : ""}`}
            style={{ ["--aura" as string]: fx.aura,
                     background: `radial-gradient(circle at 12% 50%, ${hue} 0%, ${hue}55 30%, transparent 70%)` }} />
      {/* Everything below is pinned to the icon on the left, which is the
          thing that was won — the middle of the card is its name. */}
      <span className="absolute left-[2.1rem] top-1/2">
        <span className={`${"rare-rays"} absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full ${ultra ? "rare-ultra-glow" : ""}`}
              style={{
                width: `min(${fx.raySize / 2.4}px, 60vw)`, height: `min(${fx.raySize / 2.4}px, 60vw)`,
                ["--rays-o" as string]: ultra ? 1 : tier === "super" ? .85 : .6,
                ["--rays-speed" as string]: ultra ? "14s" : tier === "super" ? "20s" : "28s",
                background: `repeating-conic-gradient(from 0deg, transparent 0deg ${360 / fx.rays / 2}deg, ${
                  ultra ? "rgba(255,255,255,.9)" : `${hue}cc`} ${360 / fx.rays / 2}deg ${360 / fx.rays}deg)`,
                WebkitMaskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,.5) 35%, transparent 70%)",
                maskImage: "radial-gradient(circle, #000 12%, rgba(0,0,0,.5) 35%, transparent 70%)",
              }} />
        {Array.from({ length: fx.rings }, (_, i) => (
          <span key={`ring${i}`}
                className="rare-ring absolute left-0 top-0 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ borderColor: i % 2 && ultra ? "#fff" : hue,
                         boxShadow: `0 0 14px ${hue}, inset 0 0 10px ${hue}`,
                         animationDelay: `${120 + i * 150}ms`,
                         ["--ring-scale" as string]: 2 + fx.reach * 1.6 + i * .6 }} />
        ))}
        {crumbs.map((c, i) => (
          <span key={`c${i}`} className="rare-burst absolute left-0 top-0 rounded-full"
                style={{ width: c.size, height: c.size,
                         background: c.light ? "#fff4d6" : ultra ? `hsl(${(i * 47) % 360} 95% 65%)` : hue,
                         boxShadow: `0 0 ${c.size}px ${c.light ? "#fff" : hue}`,
                         animationDelay: `${160 + c.delay}ms`,
                         ["--dx" as string]: c.dx, ["--dy" as string]: c.dy }} />
        ))}
        {stars.map((st, i) => (
          <span key={`s${i}`} className="rare-twinkle absolute left-0 top-0"
                style={{ transform: `translate(${st.x}px, ${st.y}px)`,
                         width: st.size, height: st.size,
                         animationDelay: `${st.delay}ms`,
                         background: st.light ? "#fff" : hue,
                         clipPath: "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)" }} />
        ))}
      </span>
    </span>
  );
}

export default Fanfare;
