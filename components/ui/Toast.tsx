"use client";

import { useEffect, useState } from "react";
import * as Radix from "@radix-ui/react-toast";
import Link from "next/link";
import GiftIcon from "@/components/ui/GiftIcon";
import { RARE_INVENTORY } from "@/lib/popoto-rare";
import { useLang } from "@/lib/i18n";

/**
 * What just happened, while you are still standing here.
 *
 * The bell has always been the record of what you missed. This is the other
 * half: something arriving while you are on the page, said once, in the corner,
 * and gone. Without it a potato sent to somebody reading the gallery landed in
 * a bell they had no reason to look at, and they found out about it tomorrow.
 *
 * Built on Radix rather than by hand because the fiddly parts are the ones that
 * matter and are easy to get wrong: announcing to a screen reader without
 * stealing focus, holding the timer while the pointer is over it, swiping it
 * away on a touch screen, and stacking two that arrive together.
 *
 * Fired through a window event rather than a context. There is one producer —
 * the bell — and a context for it would mean a provider wrapping the tree and
 * a hook threaded down to the one component that calls it.
 */

export interface ToastRequest {
  /** The line, already in the reader's language: this draws, it does not decide. */
  text: string;
  /** Drawn at 40px, round. A face, usually. */
  image?: string | null;
  /**
   * Square and whole rather than round and cropped.
   *
   * A face survives a circle — it is the shape a face is drawn in everywhere
   * — and a game item's icon does not: it is a square PNG with its corners
   * doing work, and `object-cover` in a circle eats them. So a prize shows
   * the picture rather than the middle of it.
   */
  square?: boolean;
  /** The small mark in the corner of the picture — 🥔, 📍, and so on. */
  badge?: string;
  /** Where it goes when clicked. Nothing means it is only an announcement. */
  href?: string | null;
  /**
   * Which colour it wears.
   *
   * Everything is the site accent by default, which is what makes a toast read
   * as this site interrupting you. "good" is for the handful of things that
   * are unambiguously a bit of luck — earning a ticket in the draw — and it is
   * green because green is the one colour on this site that has never meant
   * anything but that.
   *
   * "rare" is the wrapped popoto, and it is less a colour than a different
   * card: gold foil, turning light, sparks. It is allowed to be that loud
   * because it happens to one popoto in a hundred, and because the thing it is
   * announcing looks exactly like this when it opens.
   */
  tone?: "accent" | "good" | "rare";
}

const EVENT = "toast:show";

/** Say something in the corner. Safe to call from anywhere on the client. */
export function toast(t: ToastRequest) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastRequest>(EVENT, { detail: t }));
}

interface Shown extends ToastRequest { id: number }

/**
 * How long one stays up.
 *
 * Long, because the thing it is announcing is somebody talking to you and the
 * reader is by definition in the middle of something else — a line that has
 * gone by the time you look up has told you nothing. Radix holds the timer
 * while the pointer is over it, so this is the floor rather than the whole
 * time anybody gets.
 */
const LINGER = 14000;

/**
 * And how long the rare one stays up.
 *
 * Longer, for the one worth crossing the room for. The first second of it is
 * spent arriving — the card lands, the light comes up, the foil starts moving —
 * and on fourteen seconds it would be most of the way to gone by the time it
 * had finished introducing itself.
 */
const LINGER_RARE = 26000;

/**
 * How many are allowed on screen at once.
 *
 * They stack upward from the corner, and without a ceiling a quiet evening
 * followed by six people pressing the popoto button at the same moment is a
 * column of cards up the side of the window with the page behind it. The oldest
 * goes when the fifth arrives, which is the right one to lose: it has been
 * readable the longest, and it is still in the bell.
 */
const AT_ONCE = 4;

export default function ToastHost() {
  const { t } = useLang();
  const [items, setItems] = useState<Shown[]>([]);

  useEffect(() => {
    let next = 1;
    const on = (e: Event) => {
      const detail = (e as CustomEvent<ToastRequest>).detail;
      if (!detail?.text) return;
      const id = next++;
      setItems((v) => [...v, { ...detail, id }].slice(-AT_ONCE));
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  const close = (id: number) => setItems((v) => v.filter((x) => x.id !== id));

  return (
    <Radix.Provider duration={LINGER} swipeDirection="right">
      {items.map((it) => it.tone === "rare" ? (
        <RareToast key={it.id} it={it} onClose={() => close(it.id)} />
      ) : (
        <Radix.Root key={it.id} duration={LINGER}
                    onOpenChange={(open) => { if (!open) close(it.id); }}
                    /*
                     * Tinted and edged in the site's accent rather than dressed
                     * as another card. Everything on this site is a panel with
                     * a hairline border on the same dark ground, so a toast
                     * wearing that was a thing that appeared out of nowhere and
                     * then looked like it had always been there. It has to read
                     * as an interruption, because it is one.
                     *
                     * Mixed rather than layered: an accent wash at 10% over the
                     * surface is opaque, which a panel floating over the page
                     * has to be, and follows the accent wherever the accent
                     * goes.
                     */
                    style={{
                      background: `color-mix(in oklab, ${
                        it.tone === "good" ? "var(--color-jade)" : "var(--color-accent)"
                      } 10%, var(--color-surface))`,
                    }}
                    className={`toast-slide flex items-center gap-3.5 rounded-2xl border-2 border-l-[6px] p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] ring-1 ${
                      it.tone === "good"
                        ? "border-jade/70 border-l-jade ring-jade/25"
                        : "border-accent/70 border-l-accent ring-accent/25"
                    } data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=closed]:opacity-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform`}>
          {(it.image || it.badge) && (
            <span className="relative block size-14 shrink-0">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt=""
                     className={`size-14 border ${
                       it.square ? "rounded-md bg-card/60 object-contain p-0.5"
                                 : "rounded-full object-cover"} ${
                       it.tone === "good" ? "border-jade/40" : "border-accent/40"}`} />
              ) : (
                <span className={`block size-14 border bg-card ${
                  it.square ? "rounded-md" : "rounded-full"} ${
                  it.tone === "good" ? "border-jade/40" : "border-accent/40"}`} />
              )}
              {it.badge && (
                <span className={`absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border bg-surface text-ui ${
                  it.tone === "good" ? "border-jade/50" : "border-accent/50"}`}>
                  {it.badge}
                </span>
              )}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <Radix.Title className="text-lead leading-snug text-ink">
              {it.text}
            </Radix.Title>
            {it.href && (
              // A word rather than an arrow: an arrow in the corner of a box
              // that appeared by itself is a guess, and this is the one thing
              // in it anybody is meant to press.
              <Radix.Action asChild altText={t("notif.open")}>
                <Link href={it.href} onClick={() => close(it.id)}
                      className={`mt-1 inline-block text-ui no-underline hover:underline ${
                        it.tone === "good" ? "text-jade" : "text-accent"}`}>
                  {t("notif.open")} &rarr;
                </Link>
              </Radix.Action>
            )}
          </div>

          <Radix.Close aria-label="Close"
                       className="shrink-0 self-start rounded-md px-1.5 text-lead text-muted hover:text-ink">
            ✕
          </Radix.Close>
        </Radix.Root>
      ))}

      {/* Bottom right, above everything, and out of the way of a thumb on a
          phone — where the nav is not, and where nothing on this site is.
          They stack upward with the newest at the bottom: the corner is where
          the last one appeared, so it is where the eye already is. */}
      <Radix.Viewport className="fixed bottom-5 right-5 z-[90] flex w-[min(28rem,calc(100vw-2.5rem))] flex-col gap-2.5 outline-none" />
    </Radix.Provider>
  );
}

/**
 * Where the sparks sit, in the card's own coordinates.
 *
 * Placed by hand rather than scattered at random. The card is a fixed shape
 * with a face on the left and two lines of type on the right, and the only
 * places a spark can sit without landing on a word are around the face and
 * along the edges; a random handful put one through the middle of the sentence
 * about one toast in three.
 */
const SPARKS = [
  { x: "2%",  y: "18%", size: 15, delay: 0,    light: true },
  { x: "16%", y: "86%", size: 12, delay: 420,  light: false },
  { x: "28%", y: "10%", size: 10, delay: 900,  light: false },
  { x: "57%", y: "90%", size: 11, delay: 640,  light: true },
  { x: "83%", y: "12%", size: 13, delay: 220,  light: false },
  { x: "96%", y: "64%", size: 10, delay: 1100, light: true },
  { x: "69%", y: "4%",  size: 9,  delay: 1500, light: false },
];

/**
 * The wrapped one.
 *
 * A card of its own rather than a third set of colours in the one above,
 * because almost nothing about it is that card: a frame instead of a border,
 * a wheel of light under the face, a heading the others do not have, and a
 * button where the others have a word in the corner. Threading all of that
 * through the ordinary toast as conditionals left a component where the common
 * case was hard to read and the rare one was hard to find.
 *
 * Tier-blind, and it should stay that way. The notification does not say which
 * of the three it is and it must not: the whole of a wrapped popoto is that
 * nobody knows what is in it until it is open, and a toast that said "ultra"
 * on the way past would have given away the one thing worth walking over for.
 */
function RareToast({ it, onClose }: { it: Shown; onClose: () => void }) {
  const { t } = useLang();
  return (
    <Radix.Root duration={LINGER_RARE}
                onOpenChange={(open) => { if (!open) onClose(); }}
                className="toast-rare relative rounded-2xl p-[2.5px] data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=closed]:opacity-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform">
      {/* The foil edge: a layer under everything rather than a border, because
          a border cannot hold a gradient that moves. */}
      <span aria-hidden className="toast-foil absolute inset-0 rounded-2xl" />

      <div className="relative flex items-center gap-4 overflow-hidden rounded-[14px] p-4"
           style={{ background: "color-mix(in oklab, var(--color-gold) 14%, var(--color-surface))" }}>
        {/* Spokes of light turning behind the sender's face — the same wheel
            that comes up behind the potato when a parcel opens, slower and
            fainter, because this one has a sentence lying across it. */}
        <span aria-hidden
              className="rare-rays-still pointer-events-none absolute left-[48px] top-1/2 size-[260px] rounded-full"
              style={{
                ["--rays-o" as string]: .5,
                ["--rays-speed" as string]: "22s",
                background: "repeating-conic-gradient(from 0deg, transparent 0deg 15deg, rgba(229,204,128,.75) 15deg 30deg)",
                WebkitMaskImage: "radial-gradient(circle, #000 8%, rgba(0,0,0,.45) 32%, transparent 66%)",
                maskImage: "radial-gradient(circle, #000 8%, rgba(0,0,0,.45) 32%, transparent 66%)",
              }} />

        {/* The glint that crosses it every few seconds. */}
        <span aria-hidden className="toast-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4" />

        {SPARKS.map((s, i) => (
          <span key={i} aria-hidden
                className="rare-twinkle pointer-events-none absolute leading-none"
                style={{ left: s.x, top: s.y, fontSize: s.size,
                         color: s.light ? "#fffbe8" : "var(--color-gold)",
                         textShadow: "0 0 10px rgba(229,204,128,.9), 0 0 22px rgba(229,204,128,.55)",
                         animationDelay: `${s.delay}ms` }}>
            ✦
          </span>
        ))}

        {/* The face, lit, with the parcel hanging off it. The parcel keeps the
            small shake it has on the shelf: something in it wants out. */}
        <span className="relative block size-16 shrink-0">
          <span aria-hidden className="rare-glow absolute -inset-2 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,248,224,.55) 0%, rgba(229,204,128,.5) 35%, transparent 70%)" }} />
          {it.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.image} alt=""
                 className="relative size-16 rounded-full border-2 border-gold object-cover shadow-[0_0_20px_rgba(229,204,128,.65)]" />
          ) : (
            <span className="relative block size-16 rounded-full border-2 border-gold bg-card shadow-[0_0_20px_rgba(229,204,128,.65)]" />
          )}
          <span className="rare-wobble absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-gold/70 bg-surface shadow-[0_0_12px_rgba(229,204,128,.75)]">
            <GiftIcon size={17} />
          </span>
        </span>

        <div className="relative min-w-0 flex-1">
          {/* No heading above the sentence. It read "a rare popoto" over a
              line whose whole point is that nobody knows yet what this is —
              naming it first gave away the sentence's own ending, and in a
              card this loud it was one gold thing too many. The frame, the
              light and the parcel have already said which kind of toast this
              is by the time anybody starts reading. */}
          <Radix.Title className="text-lead font-medium leading-snug text-ink">
            {it.text}
          </Radix.Title>
          <Radix.Action asChild altText={t("rare.openInInventory")}>
            {/* A button, and the foil one at that. The ordinary toast's link is
                a word you may take or leave; this is the whole point of the
                card, and there is a parcel with your name on it at the end of
                it. */}
            <Link href={it.href || RARE_INVENTORY} onClick={onClose}
                  className="rare-ultra-chip mt-2 inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-3 text-ui font-semibold text-[#3d2c06] no-underline">
              <GiftIcon size={15} />
              {t("rare.openInInventory")} &rarr;
            </Link>
          </Radix.Action>
        </div>

        <Radix.Close aria-label="Close"
                     className="relative shrink-0 self-start rounded-md px-1.5 text-lead text-gold/70 hover:text-gold">
          ✕
        </Radix.Close>
      </div>
    </Radix.Root>
  );
}
