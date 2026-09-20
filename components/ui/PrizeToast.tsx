"use client";

import { useMemo } from "react";
import Link from "next/link";
import * as Radix from "@radix-ui/react-toast";
import { useLang } from "@/lib/i18n";
import { TIER_FX, TIER_LOOK, type RareTier } from "@/lib/popoto-rare";
import { PRIZE_INVENTORY } from "@/lib/prizes";
import type { ToastRequest } from "@/components/ui/Toast";

/** R, SR or UR, on the corner of the picture. The shelf's chip, standing alone. */
function TierChip({ tier }: { tier: RareTier }) {
  const look = TIER_LOOK[tier];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-[2px] font-data text-label font-extrabold leading-none tracking-[0.06em] shadow-md shadow-black/50 ${
      tier === "ultra" ? "rare-ultra-chip text-[#2a1600]" : "text-white"}`}
          style={tier === "ultra" ? undefined : {
            background: `linear-gradient(135deg, ${look.color}, ${look.color}b3)`,
            boxShadow: `0 0 0 1px ${look.color}66, 0 2px 6px rgba(0,0,0,.45)`,
          }}>
      {look.short}
    </span>
  );
}

/**
 * Winning something, at the volume the thing is worth.
 *
 * Built on the rare popoto's card and deliberately not the same component.
 * That one is tier-blind on purpose and has to stay that way — the whole of a
 * wrapped popoto is that nobody knows what is inside until it opens, and a
 * toast that said "ultra" on the way past would give away the one thing worth
 * walking over for. This is the opposite case: the sentence has already named
 * the prize, so hiding how good it is would be hiding nothing, and the card
 * may as well say it.
 *
 * Everything that scales, scales off TIER_FX and TIER_LOOK — the same numbers
 * behind the unwrapping and the inventory card, so R, SR and UR mean the same
 * amount of noise wherever they turn up. R glows and turns slowly; SR is
 * brighter, faster and has three times the sparks; UR takes the gold foil off
 * the rare popoto's card, jolts on arrival and keeps its chip moving.
 *
 * The picture is square. A prize is an item icon and the corners of one are
 * usually where the thing actually is, so it is shown whole rather than
 * cropped into the circle a face wears.
 */
export default function PrizeToast(
  { it, onClose, linger }: {
    it: ToastRequest;
    onClose: () => void;
    /** How long it stays up, from the host that owns the timings. */
    linger: number;
  },
) {
  const { t } = useLang();
  const tier: RareTier = it.tier ?? "rare";
  const fx = TIER_FX[tier];
  const look = TIER_LOOK[tier];
  const hue = look.color;
  const ultra = tier === "ultra";

  /*
   * Fewer than the unwrapping throws, because this is a card and not a
   * screen, but in the same proportion: an SR is about twice an R and a UR
   * about twice that again. Scattered off the golden angle so they never fall
   * into a row, and fixed per render so they do not jump while it is up.
   */
  const sparks = useMemo(() => {
    const n = Math.max(3, Math.round(fx.stars * 0.6));
    return Array.from({ length: n }, (_, i) => ({
      x: `${10 + ((i * 53) % 86)}%`,
      y: `${8 + ((i * 31) % 80)}%`,
      size: 8 + (i % 3) * 5,
      delay: (i * 197) % 1700,
      light: i % 2 === 0,
    }));
  }, [fx.stars]);

  return (
    <Radix.Root duration={linger}
                onOpenChange={(open) => { if (!open) onClose(); }}
                className={`relative rounded-2xl p-[2.5px] data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=closed]:opacity-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform ${
                  ultra ? "toast-rare rare-shake-sm" : ""}`}
                style={ultra ? undefined
                  : { background: `linear-gradient(135deg, ${hue}, ${hue}44, ${hue})` }}>
      {/* The foil edge is ultra's alone — a layer under everything rather
          than a border, because a border cannot hold a gradient that moves. */}
      {ultra && <span aria-hidden className="toast-foil absolute inset-0 rounded-2xl" />}

      <div className="relative flex items-center gap-4 overflow-hidden rounded-[14px] p-4"
           style={{ background: `color-mix(in oklab, ${hue} ${ultra ? 16 : 11}%, var(--color-surface))` }}>
        {/* The wheel of light behind the prize, at the tier's own speed and
            with the tier's own number of spokes. */}
        <span aria-hidden
              className={`rare-rays-still pointer-events-none absolute left-[48px] top-1/2 rounded-full ${
                ultra ? "rare-ultra-glow" : ""}`}
              style={{
                width: `min(${Math.round(fx.raySize * 0.4)}px, 70vw)`,
                height: `min(${Math.round(fx.raySize * 0.4)}px, 70vw)`,
                ["--rays-o" as string]: ultra ? .7 : tier === "super" ? .5 : .32,
                ["--rays-speed" as string]: ultra ? "14s" : tier === "super" ? "20s" : "28s",
                background: `repeating-conic-gradient(from 0deg, transparent 0deg ${
                  360 / fx.rays / 2}deg, ${hue}bf ${360 / fx.rays / 2}deg ${360 / fx.rays}deg)`,
                WebkitMaskImage: "radial-gradient(circle, #000 8%, rgba(0,0,0,.45) 32%, transparent 66%)",
                maskImage: "radial-gradient(circle, #000 8%, rgba(0,0,0,.45) 32%, transparent 66%)",
              }} />

        {/* The whole card washed in its colour, as far as the tier reaches. */}
        <span aria-hidden className="pointer-events-none absolute inset-0"
              style={{ opacity: fx.aura,
                       background: `radial-gradient(circle at 14% 50%, ${hue} 0%, ${hue}44 34%, transparent 72%)` }} />

        <span aria-hidden className="toast-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4" />

        {sparks.map((s, i) => (
          <span key={i} aria-hidden
                className="rare-twinkle pointer-events-none absolute leading-none"
                style={{ left: s.x, top: s.y, fontSize: s.size,
                         color: s.light ? "#fffbe8" : hue,
                         textShadow: `0 0 10px ${hue}, 0 0 22px ${hue}8c`,
                         animationDelay: `${s.delay}ms` }}>
            ✦
          </span>
        ))}

        {/* The prize, lit, with its tier hanging off the corner. */}
        <span className="relative block size-16 shrink-0">
          <span aria-hidden className="rare-glow absolute -inset-2 rounded-full"
                style={{ background: `radial-gradient(circle, rgba(255,248,220,.55) 0%, ${hue}80 35%, transparent 70%)` }} />
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.image} alt=""
                 className="relative size-16 rounded-lg border-2 bg-card/60 object-contain p-0.5"
                 style={{ borderColor: hue, boxShadow: `0 0 20px ${hue}a6` }} />
          ) : (
            <span className="relative block size-16 rounded-lg border-2 bg-card"
                  style={{ borderColor: hue, boxShadow: `0 0 20px ${hue}a6` }} />
          )}
          <span className={`absolute -bottom-2 -right-2 ${ultra ? "rare-wobble" : ""}`}>
            <TierChip tier={tier} />
          </span>
        </span>

        <div className="relative min-w-0 flex-1">
          <Radix.Title className="text-lead font-medium leading-snug text-ink">
            {it.text}
          </Radix.Title>
          <Radix.Action asChild altText={t("prize.openInInventory")}>
            {/* A button rather than a word. The ordinary toast's link is one
                you may take or leave; there is something with your name on it
                at the end of this one. */}
            <Link href={it.href || PRIZE_INVENTORY} onClick={onClose}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3 text-ui font-semibold no-underline ${
                    ultra ? "rare-ultra-chip text-[#3d2c06]" : ""}`}
                  style={ultra ? undefined : {
                    background: `linear-gradient(135deg, ${hue}, ${hue}b3)`,
                    color: "#1b1005",
                  }}>
              🎁 {t("prize.openInInventory")} &rarr;
            </Link>
          </Radix.Action>
        </div>

        <Radix.Close aria-label="Close"
                     className="relative shrink-0 self-start rounded-md px-1.5 text-lead opacity-70 hover:opacity-100"
                     style={{ color: hue }}>
          ✕
        </Radix.Close>
      </div>
    </Radix.Root>
  );
}
