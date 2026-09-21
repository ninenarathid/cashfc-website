"use client";

import { useMemo } from "react";
import Link from "next/link";
import * as Radix from "@radix-ui/react-toast";
import { useLang } from "@/lib/i18n";
import { WALLET, WALLET_COLOR } from "@/lib/wallet";
import type { ToastRequest } from "@/components/ui/Toast";

/**
 * Aqua, arriving with the money. See v91.
 *
 * Every other card on this site is a rectangle with its contents inside it.
 * This one has somebody standing in front of it, head and coins above the top
 * edge, because that is the difference between being told a number went up and
 * being handed something: a notice is a box, and a person is not.
 *
 * Breaking the frame is the whole design, so the box underneath has to be built
 * for it. The rounded card keeps its own overflow — the wash, the sheen and the
 * sparks are inside it and would look wrong spilling out — and she is a sibling
 * of that card rather than a child of it, hung off the root, which clips
 * nothing.
 *
 * One animation and one costume, whatever arrived on it. The tier still
 * colours the wallet's own card and still sits on the line in the list; here it
 * would only mean three drawings of the same joke, and the joke is better told
 * once and told well.
 *
 * Not the wallet's alone since v92: any prize can be set to arrive on this
 * card, which is why the button's words come in from the caller rather than
 * being written here.
 */

/**
 * Which of her, and the two drawings and the loop that go with it.
 *
 * Three things to be handed rather than three volumes of one thing: coins
 * flung in the air for the small and frequent, a full purse pushed at you for
 * something worth stopping for, and the black card for the one that is funny
 * because it is absurd. Each has its own beat, which is why each names its own
 * animation rather than sharing one with a different duration — a throw is a
 * jump, an offer is a push, and putting sunglasses on is done once.
 */
export type AquaArt = "shower" | "purse" | "card";

export const AQUA: Record<AquaArt, { from: string; to: string; move: string; cycle: number }> = {
  shower: { from: "/wallet/aqua-shower-1.webp", to: "/wallet/aqua-shower-2.webp",
            move: "hop", cycle: 1400 },
  purse: { from: "/wallet/aqua-purse-1.webp", to: "/wallet/aqua-purse-2.webp",
           move: "push", cycle: 1800 },
  card: { from: "/wallet/aqua-card-1.webp", to: "/wallet/aqua-card-2.webp",
          move: "cool", cycle: 2600 },
};

/** Every drawing of her, for the warming below. */
export const AQUA_FRAMES = Object.values(AQUA)
  .flatMap((a) => [a.from, a.to]);

/**
 * How big she stands, in the markup below: 176px on a phone and 228px
 * otherwise, with the box's width following from its height because the
 * drawings are 1040 by 1560 — two thirds as wide as they are tall.
 *
 * She was 156px and read as blurred, which she was not: the files are 427 by
 * 640 and were being drawn at 104 across, so every pixel of her was already
 * three deep. What was wrong is that a face a third of the way up a 156px
 * figure is thirty-five pixels of face. The answer to that is a bigger
 * drawing, not a sharper one.
 */

/**
 * Both drawings downloaded and decoded, once per session.
 *
 * The hop starts the instant the card appears and swaps to the second drawing
 * 476ms later, so a picture that is still arriving is a hole in the first
 * throw — and the first throw is the only one anybody actually watches. Every
 * way of hurrying that up is a way of making it likely rather than certain, so
 * the card waits for this instead: the toast is held back until she is ready to
 * move, and arrives whole.
 *
 * Decoded and not merely loaded. An image that has finished downloading still
 * costs a frame or two to turn into pixels, and that frame lands exactly where
 * the card is painting itself.
 *
 * The promises are kept for the life of the page, so the second payment of the
 * evening waits for nothing. A picture that fails resolves anyway — a card with
 * no Aqua on it is a card, and a notification nobody is ever shown because a
 * webp 404ed is a bug.
 */
const decoded: Partial<Record<AquaArt, Promise<void>>> = {};

const fetchOne = (src: string) => new Promise<void>((done) => {
  const img = new Image();
  const fin = () => done();
  img.onload = () => {
    const d = img.decode?.();
    if (d) d.then(fin, fin); else fin();
  };
  img.onerror = fin;
  img.src = src;
});

export function aquaReady(art: AquaArt = "shower"): Promise<void> {
  const a = AQUA[art] ?? AQUA.shower;
  // Per costume, not all of them: a card waits for the two drawings it is
  // going to show and not for the four it is not.
  decoded[art] ??= Promise.all([fetchOne(a.from), fetchOne(a.to)]).then(() => undefined);
  return decoded[art]!;
}

/**
 * Warmed while the browser is idle: the coins, and only the coins.
 *
 * The three pairs come to about 580KB between them at the size they are drawn
 * at, which is not a thing to make everybody who signs in fetch on the chance
 * of it. This is the pair the wallet itself uses and therefore the one almost
 * every card will be; the other two are set by hand on a prize and are fetched
 * when one of those is won, behind the wait in ToastHost.
 */
export const warmAqua = () => { void aquaReady("shower"); };

export default function WalletToast(
  { it, onClose, linger }: {
    it: ToastRequest;
    onClose: () => void;
    /** How long it stays up, from the host that owns the timings. */
    linger: number;
  },
) {
  const { t } = useLang();
  const hue = WALLET_COLOR;
  /** Where this one leads, and what the button says about it. See ToastRequest. */
  const cta = it.cta ?? t("wallet.openInProfile");
  const art = AQUA[it.aqua ?? "shower"] ?? AQUA.shower;

  /*
   * Sparks around her, fixed per render so they do not jump while the card is
   * up, and off the golden angle so they never fall into a row. Fewer than the
   * prize toast throws: she is already carrying the noise.
   */
  const sparks = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    x: `${6 + ((i * 47) % 78)}%`,
    y: `${(i % 2 ? 4 : 52) + ((i * 23) % 34)}%`,
    size: 9 + (i % 3) * 5,
    delay: (i * 211) % 1400,
    light: i % 2 === 0,
  })), []);

  return (
    /*
     * The whole of her height, with the card sitting at the bottom of it.
     *
     * She stands taller than the card she is standing on, which is the point
     * — and the toasts are a column, so whatever she overhangs by comes out
     * of the one above. It did: her head landed across somebody else's
     * notification and hid the line they were meant to read.
     *
     * So the room she needs is the card's own room. The card keeps its size
     * and stays at the bottom; everything above it is empty and lets clicks
     * through, and the column spaces the next toast off the top of her rather
     * than off the top of the card.
     */
    <Radix.Root duration={linger}
                onOpenChange={(open) => { if (!open) onClose(); }}
                className="pointer-events-none relative flex min-h-[var(--aqua-h)] flex-col justify-end [--aqua-h:176px] data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=closed]:opacity-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform sm:[--aqua-h:228px]">

      {/* The gold edge, which is the card's and not the root's now that the
          root is mostly empty air. */}
      <div className="pointer-events-auto relative rounded-2xl p-[2.5px]"
           style={{ background: `linear-gradient(135deg, ${hue}, ${hue}44, ${hue})` }}>

        {/* The card. Its own box, with its own overflow, so everything painted
            into it stays in it — and so the one thing meant to escape has to be
            outside it rather than merely allowed out. */}
        <div className="relative overflow-hidden rounded-[14px] py-[18px] pl-[120px] pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,.10),inset_0_-1px_0_rgba(0,0,0,.3)] sm:pl-[156px]"
             style={{ background: `linear-gradient(158deg,`
               + ` color-mix(in oklab, ${hue} 17%, var(--color-surface)) 0%,`
               + ` color-mix(in oklab, ${hue} 9%, var(--color-surface)) 55%,`
               + ` color-mix(in oklab, ${hue} 13%, var(--color-surface)) 100%)` }}>
          <span aria-hidden className="pointer-events-none absolute inset-0"
                style={{ opacity: .3,
                         background: `radial-gradient(circle at 16% 60%, ${hue} 0%, ${hue}44 36%, transparent 74%)` }} />
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

          <div className="relative min-w-0">
            <Radix.Title className="text-lead font-semibold leading-snug text-ink [text-shadow:0_1px_2px_rgba(0,0,0,.4)]">
              {it.text}
            </Radix.Title>
            <Radix.Action asChild altText={cta}>
              <Link href={it.href || WALLET} onClick={onClose}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3 text-ui font-semibold no-underline shadow-[0_2px_10px_rgba(0,0,0,.35)] transition-[filter] hover:brightness-110"
                    style={{ background: `linear-gradient(135deg, ${hue}, ${hue}b3)`,
                             color: "#1b1005" }}>
                💰 {cta} &rarr;
              </Link>
            </Radix.Action>
          </div>

          <Radix.Close aria-label="Close"
                       className="absolute right-2 top-2 rounded-md px-1.5 text-lead opacity-70 hover:opacity-100"
                       style={{ color: hue }}>
            ✕
          </Radix.Close>
        </div>
      </div>

      {/*
        And Aqua, outside the box.

        Anchored to the bottom of the card and taller than it, so she stands on
        its floor and comes out of the top. Leftwards and upwards only: the
        column of toasts is pinned to the bottom right corner of the window, so
        those are the two directions with room in them.
      */}
      <span aria-hidden
            className="aqua-enter pointer-events-none absolute bottom-0 left-[-10px] block h-[var(--aqua-h)] w-[calc(var(--aqua-h)*2/3)]">
        <span aria-hidden
              className="aqua-lamp absolute bottom-2 left-1/2 block size-28 -translate-x-1/2 rounded-full sm:size-36"
              style={{ background: `radial-gradient(circle, ${hue}cc 0%, ${hue}55 42%, transparent 72%)`,
                       animationDuration: `${art.cycle}ms` }} />
        {/* What she is standing on. A drawing with nothing under it floats
            however carefully it is placed, and one soft ellipse is the whole
            of the fix. Outside the loop, so it stays on the floor while she
            leaves it. */}
        <span aria-hidden
              className="absolute bottom-[3px] left-1/2 block h-[7px] w-[42%] -translate-x-1/2 rounded-[50%] bg-black/55 blur-[3px]" />
        {/* Both drawings, stacked and swapped on a frame rather than faded. */}
        <span className={`aqua-${art.move} absolute inset-0 block origin-bottom`}>
          {[art.from, art.to].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt=""
                 className={`absolute inset-0 size-full select-none object-contain object-bottom aqua-${art.move}-${i === 0 ? "a" : "b"}`}
                 // Dark under her for separation from the card, and only a
                 // little gold: a wide glow on a drawing this size spreads its
                 // own line art and reads as being out of focus.
                 style={{ filter: `drop-shadow(0 4px 10px rgba(0,0,0,.55)) drop-shadow(0 0 9px ${hue}44)` }} />
          ))}
        </span>
      </span>
    </Radix.Root>
  );
}
