"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import EventDetail from "@/components/home/EventDetail";
import type { PersonOption } from "@/lib/people";
import { picsOf, type Notice } from "@/lib/events";

/**
 * What the Free Company has announced, one at a time.
 *
 * These were a stack: every notice, in full, with its poster at nearly the
 * height of a screen — so two of them were the entire front page and the third
 * pushed everything the site is actually about below the fold. Which is
 * backwards, because a notice is read once and the rest of the page is read
 * every visit.
 *
 * So one at a time, sideways. The card is the poster and the headline; the body
 * in full, the rest of the pictures and the conversation are a press away. See
 * EventDetail.
 *
 * It moves on by itself every ten seconds, and stops the moment anybody shows
 * an interest in it — a pointer over it, the keyboard inside it, or a notice
 * opened. A swipe needs no rule of its own: it moves the rail, which restarts
 * the ten seconds from where the thumb left it.
 *
 * Ten rather than the four or five a hero banner usually gets: these are read,
 * not glanced at, and a panel that takes the reader's place in a sentence away
 * from them is worse than one that never moved at all. It also stands still
 * for anybody who has asked their system for less motion, which is that
 * preference meaning what it says.
 */
export default function EventSlider(
  { people = [] }: { people?: PersonOption[] },
) {
  const { t } = useLang();
  const [items, setItems] = useState<Notice[]>([]);
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState<Notice | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase
      .from("announcements")
      /*
       * Asked for twice.
       *
       * Selecting a column the database has not heard of fails the whole query,
       * and a site whose announcements vanished because a migration had not
       * been run yet is a worse trade than a card without a reply count. The
       * same ladder the rest of this codebase climbs.
       */
      .select("id, title, body, created_at, image_url, title_en, body_en,"
        + " images, comment_count")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(async ({ data, error }) => {
        if (!error) { setItems((data ?? []) as unknown as Notice[]); return; }
        const { data: older } = await supabase
          .from("announcements")
          .select("id, title, body, created_at, image_url, title_en, body_en")
          .order("created_at", { ascending: false })
          .limit(8);
        setItems((older ?? []) as unknown as Notice[]);
      });
  }, []);

  /*
   * The rail scrolls and the marker follows it, rather than the marker driving
   * a transform.
   *
   * A native scroller is what a thumb already knows how to use — it flicks, it
   * has momentum, it snaps — and rebuilding that from pointer events is how a
   * carousel ends up worse than the browser it is running in. The arrows push
   * the same scroller. Its own bar is hidden (.no-bar, in globals): the marker
   * already says where this is, in the site's own colours, and the grey trough
   * underneath was the same sentence said twice by the operating system.
   */
  const go = useCallback((to: number) => {
    const el = rail.current;
    if (!el) return;
    const n = Math.max(0, Math.min(items.length - 1, to));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  }, [items.length]);

  const onScroll = () => {
    const el = rail.current;
    if (!el || !el.clientWidth) return;
    setAt(Math.round(el.scrollLeft / el.clientWidth));
  };

  /*
   * On to the next one, and round to the first at the end.
   *
   * Held off while a notice is open, while the pointer is on it and while the
   * keyboard is in it: the one thing a moving panel must never do is move the
   * paragraph somebody is halfway through, and the reasons to think they are
   * reading it are exactly those. `at` is in the dependencies so each step
   * starts its own ten seconds — a reader who presses an arrow gets the full
   * interval on the notice they chose rather than whatever was left of the
   * last one.
   */
  useEffect(() => {
    if (held || open || items.length < 2) return;
    if (typeof matchMedia === "function"
        && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tick = setTimeout(() => go(at + 1 >= items.length ? 0 : at + 1), 10_000);
    return () => clearTimeout(tick);
  }, [at, held, open, items.length, go]);

  if (!items.length) return null;

  return (
    <section className="mt-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <h2 className="font-data text-meta uppercase tracking-[0.22em] text-accent">
          {t("home.announcements")}
        </h2>
        {items.length > 1 && (
          <div className="ml-auto flex items-center gap-2">
            {/* Segments rather than round dots: how many there are and which
                one this is, in one glance, and the current one is the one that
                is wide. A slider hides its own contents by nature — a reader
                who cannot see there is a third notice never looks for it. */}
            <span className="flex items-center gap-1">
              {items.map((n, i) => (
                <button key={n.id} type="button" onClick={() => go(i)}
                        aria-label={String(i + 1)} aria-current={i === at}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === at ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-muted"}`} />
              ))}
            </span>
            <span className="flex items-center gap-1">
              <Arrow back label={t("common.previous")}
                     onClick={() => go(at - 1)} off={at === 0} />
              <Arrow label={t("common.next")}
                     onClick={() => go(at + 1)} off={at >= items.length - 1} />
            </span>
          </div>
        )}
      </div>

      <div ref={rail} onScroll={onScroll}
           onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
           onFocusCapture={() => setHeld(true)} onBlurCapture={() => setHeld(false)}
           className="no-bar flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {items.map((n) => (
          <div key={n.id} className="w-full shrink-0 snap-start">
            <Slide notice={n} onOpen={() => setOpen(n)} />
          </div>
        ))}
      </div>

      {open && (
        <EventDetail notice={open} people={people}
                     onCount={(c) => setItems((v) => (
                       // Only where it actually moved. Handing back the same
                       // array is how React is told nothing happened, and a
                       // slider that redrew every time the window reported the
                       // count it already had would redraw forever.
                       v.some((x) => x.id === open.id && (x.comment_count ?? 0) !== c)
                         ? v.map((x) => (x.id === open.id
                             ? { ...x, comment_count: c } : x))
                         : v))}
                     onClose={() => setOpen(null)} />
      )}
    </section>
  );
}

function Arrow(
  { back = false, off, label, onClick }: {
    back?: boolean; off: boolean; label: string; onClick: () => void;
  },
) {
  return (
    <button type="button" onClick={onClick} disabled={off} aria-label={label}
            className="grid size-8 place-items-center rounded-full border border-line bg-card/60 text-muted transition-colors hover:border-accent/60 hover:text-accent disabled:pointer-events-none disabled:opacity-25">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
           stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden
           style={back ? undefined : { transform: "rotate(180deg)" }}>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}

/**
 * One notice, as a card.
 *
 * The poster is the whole poster. It was cropped to a strip of a fixed height,
 * which is right for a photograph and wrong for this: these are drawn to be
 * read — the date, the prize and the rules are in small type down one side —
 * and a crop takes away the half that says what the event actually is.
 *
 * Contained, so nothing is cut, over a blurred copy of itself: a tall poster in
 * a wide frame then reads as a deliberate mount rather than as two black bars,
 * and one row of cards can hold a banner and a portrait without either of them
 * looking broken.
 */
function Slide(
  { notice, onOpen }: { notice: Notice; onOpen: () => void },
) {
  const { t, lang } = useLang();
  const title = (lang === "en" ? notice.title_en : null) || notice.title;
  const body = (lang === "en" ? notice.body_en : null) || notice.body;
  const pics = picsOf(notice);
  const talk = notice.comment_count ?? 0;

  return (
    /*
     * The press target is one button laid over the card, not a button wrapped
     * around it. A <button> may only contain text and pictures — a heading and
     * a paragraph are neither, and a browser that forgives it hands a screen
     * reader the whole card as one long label.
     */
    <article className="group relative isolate overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:border-accent/50">
      {pics.length > 0 && (
        /*
         * The picture sets the height; the frame does not.
         *
         * A fixed frame has to be wrong for one of them: tall enough for a
         * portrait poster leaves a banner floating in a field of blur, and
         * short enough for a banner shrinks the poster to a postage stamp in
         * the middle of the card. So the sharp copy is in the flow and the
         * blurred one is laid over whatever it leaves — a banner gets a short
         * card and a poster a tall one, and neither is cropped nor shrunk.
         */
        <div className="relative isolate overflow-hidden bg-bg">
          {/* The fill: the same picture again, out of focus. Hidden from the
              reading order — announcing it twice helps nobody. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pics[0]} alt="" aria-hidden loading="lazy"
               className="absolute inset-0 size-full scale-125 object-cover opacity-30 blur-2xl" />
          <span aria-hidden className="absolute inset-0 bg-bg/25" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pics[0]} alt={title} loading="lazy"
               className="relative mx-auto block max-h-[26rem] w-auto max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02] sm:max-h-[32rem]" />

          {pics.length > 1 && (
            <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full border border-line/60 bg-bg/80 px-2.5 py-1 font-data text-meta text-ink/90 backdrop-blur-sm">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                   stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
                   strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="13" height="13" rx="2" />
                <path d="M8 21h11a2 2 0 0 0 2-2V8" />
              </svg>
              {t("home.picsN", { n: pics.length })}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 py-3.5 sm:px-5">
        <div className="font-data text-meta uppercase tracking-[0.16em] text-muted">
          {fmtDate(notice.created_at)}
        </div>
        <h3 className="font-display text-[19px] font-semibold leading-snug text-ink">
          {title}
        </h3>

        {/* Two lines of it, because the card is a way in and not the thing
            itself. A notice that fits in two lines has been read by the time
            somebody decides whether to press. */}
        {body && (
          <p className="line-clamp-2 whitespace-pre-wrap text-lead leading-relaxed text-muted">
            {body}
          </p>
        )}

        <div className="mt-1 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-read font-medium text-accent transition-colors group-hover:border-accent group-hover:bg-accent/20">
            {t("home.readOn")}
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden
                 className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </span>

          {/* In words, not a speech-balloon emoji: that character is drawn
              differently on every platform and at this size is a smudge on
              most of them. */}
          <span className="ml-auto flex items-center gap-1.5 text-ui text-muted">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden>
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.7-5a8.2 8.2 0 0 1-.7-3.4 8.4 8.4 0 0 1 8.5-8.1 8.4 8.4 0 0 1 8.5 8z" />
            </svg>
            {talk ? t("home.replyN", { n: talk }) : t("home.noReplies")}
          </span>
        </div>
      </div>

      <button type="button" onClick={onOpen} aria-label={title}
              className="absolute inset-0 rounded-2xl" />
    </article>
  );
}
