"use client";

import { useEffect, useState } from "react";
import * as Radix from "@radix-ui/react-toast";
import Link from "next/link";
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
  /** The small mark in the corner of the picture — 🥔, 📍, and so on. */
  badge?: string;
  /** Where it goes when clicked. Nothing means it is only an announcement. */
  href?: string | null;
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
      {items.map((it) => (
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
                      background:
                        "color-mix(in oklab, var(--color-accent) 10%, var(--color-surface))",
                    }}
                    className="pop-in flex items-center gap-3.5 rounded-2xl border-2 border-accent/70 border-l-[6px] border-l-accent p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] ring-1 ring-accent/25 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=closed]:opacity-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform">
          {(it.image || it.badge) && (
            <span className="relative block size-14 shrink-0">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt=""
                     className="size-14 rounded-full border border-accent/40 object-cover" />
              ) : (
                <span className="block size-14 rounded-full border border-accent/40 bg-card" />
              )}
              {it.badge && (
                <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border border-accent/50 bg-surface text-[12px]">
                  {it.badge}
                </span>
              )}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <Radix.Title className="text-[14px] leading-snug text-ink">
              {it.text}
            </Radix.Title>
            {it.href && (
              // A word rather than an arrow: an arrow in the corner of a box
              // that appeared by itself is a guess, and this is the one thing
              // in it anybody is meant to press.
              <Radix.Action asChild altText={t("notif.open")}>
                <Link href={it.href} onClick={() => close(it.id)}
                      className="mt-1 inline-block text-[12.5px] text-accent no-underline hover:underline">
                  {t("notif.open")} &rarr;
                </Link>
              </Radix.Action>
            )}
          </div>

          <Radix.Close aria-label="Close"
                       className="shrink-0 self-start rounded-md px-1.5 text-[14px] text-muted hover:text-ink">
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
