"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WHO, type Line, type Speaker } from "@/lib/town/talk";
import type { Sprite } from "@/lib/town/scenery";

/** How fast a line is written out, and how often the mouth moves while it is. */
const TYPE_MS = 26;
const MOUTH_MS = 150;
/**
 * One picture pixel of the portrait, in CSS pixels, as near as the screen allows: on a wide screen, on a
 * phone. It is a whole number of the screen's own pixels, so every pixel of the portrait is the same size.
 */
const PIXEL_WIDE = 2;
const PIXEL_PHONE = 1.4;
function pixelFor(want: number): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.max(1, Math.round(want * dpr)) / dpr;
}

/** Something to choose at the end of a talk: what it is called, and a small note beside it (how much is waiting, say). */
export interface TalkChoice { id: string; label: string; note?: string }

/**
 * A talk with one of the town's shopkeepers (the owner, 2026-10-03: "ทำให้ NPC
 * คุยได้ด้วย … ภาพใหญ่ตอนคุย พร้อมกับบทพูด"): its large portrait, its name, and what
 * it says, a line at a time, across the foot of the map like a story game's
 * box. A tap on the box, Enter or Space finishes the line being written, then
 * goes on to the next; after the last it closes. Escape closes at once.
 *
 * A talk may end in choices instead (what one came to the stall for): they
 * show once the last line is written, the first takes the keyboard, and the
 * box then stays until one is chosen or it is closed.
 *
 * This box only talks. The lines are the town's to give (lib/town/talk), and
 * what is chosen is the town's to act on. The mouth moves while a line is
 * being written. With reduced motion the line is there at once and the mouth
 * stays shut.
 */
export default function TownTalk({ who, lines, choices, onPick, th, phone, reduced, art, onClose }: {
  who: Speaker;
  lines: Line[];
  choices?: TalkChoice[];
  onPick?: (id: string) => void;
  th: boolean;
  phone: boolean;
  reduced: boolean;
  /** The town's own pixel art for a picture's name, once the scenery has come. */
  art: (name: string) => Sprite | null;
  onClose: () => void;
}) {
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(reduced ? Infinity : 0);
  const [mouth, setMouth] = useState(false);
  const box = useRef<HTMLElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const text = th ? lines[at].th : lines[at].en;
  const writing = shown < text.length;
  const last = at + 1 >= lines.length;
  const choosing = !!choices?.length && last && !writing;

  // The line writes itself out, and the mouth moves while it does. (A new talk is a new one of these: the
  // town gives each its own key, so it starts at its first line.)
  useEffect(() => {
    if (!writing) return;
    const type = setInterval(() => setShown((n) => n + 1), TYPE_MS);
    const talk = setInterval(() => setMouth((m) => !m), MOUTH_MS);
    return () => { clearInterval(type); clearInterval(talk); };
  }, [writing, at]);

  const go = useCallback(() => {
    if (writing) { setShown(Infinity); return; }
    if (at + 1 >= lines.length) { if (!choices?.length) onClose(); return; }
    setAt(at + 1);
    setShown(reduced ? Infinity : 0);
  }, [writing, at, lines.length, choices, onClose, reduced]);

  // The keyboard: on with Enter or Space, away with Escape, wherever the focus is. Heard before the
  // town hears it (the town takes Enter to start typing in its chat) and kept from it. The button
  // takes the focus all the same, so a screen reader lands on the talk; when the choices come, the
  // first of them does, and Enter or Space presses whichever of the talk's buttons has it.
  useEffect(() => { (choosing ? first : next).current?.focus({ preventScroll: true }); }, [choosing]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      // (a number picks that choice, while the choices are there: nothing else has the numbers during a talk)
      if (choosing && /^Digit[1-9]$/.test(e.code) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const c = choices![Number(e.code.slice(5)) - 1];
        if (c) { e.preventDefault(); e.stopPropagation(); onPick?.(c.id); }
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); e.stopPropagation();
      if (!choosing) { go(); return; }
      const held = document.activeElement as HTMLElement | null;
      if (held?.tagName === "BUTTON" && box.current?.contains(held)) held.click(); else onPick?.(choices![0].id);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, go, choosing, choices, onPick]);

  const w = WHO[who];
  return (
    <section ref={box} aria-labelledby="town-talk-h" className="tk tk-window relative flex flex-col gap-2 px-5 pb-4 pt-4" onClick={go}>
      {/* The keeper stands on the box's top edge, outside its frame, with the name on a ribbon beside them (until
          2026-10-09 a small picture inside a navy panel, the choices pills that wrapped where they pleased). */}
      <span className="pointer-events-none absolute bottom-full left-2 -mb-3 flex items-end gap-1.5">
        <Portrait sprite={art(w.art[writing && mouth ? 1 : 0])} pixel={pixelFor(phone ? PIXEL_PHONE : PIXEL_WIDE)} />
        <h2 id="town-talk-h" className="tk-ribbon mb-1.5 shrink-0 whitespace-nowrap px-3.5 py-1.5 font-display text-ui font-semibold">{th ? w.name.th : w.name.en}</h2>
      </span>
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 truncate text-meta text-muted">{th ? w.job.th : w.job.en}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="pressable -mr-2 -mt-1 ml-auto shrink-0 px-3 py-1.5 text-meta text-muted hover:text-ink">
          {th ? "ปิด" : "Close"}
        </button>
      </div>
      {/* the whole line is always there for a screen reader; what is written so far is what the eye sees */}
      <p className="sr-only" aria-live="polite">{text}</p>
      <p aria-hidden className={`text-read leading-relaxed text-ink ${choosing ? "min-h-[3em]" : "min-h-[4.5em]"}`}>
        {text.slice(0, shown)}
      </p>
      {choosing ? (
        // (each choice a button of its own width's worth, in two columns and three on a wide screen: none wraps)
        <div role="group" aria-label={th ? "เลือก" : "Choose"} className="grid max-h-[40vh] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3" onClick={(e) => e.stopPropagation()}>
          {choices!.map((c, i) => (
            <button key={c.id} ref={i === 0 ? first : undefined} type="button" onClick={() => onPick?.(c.id)}
                    className={`pressable tk ${i === 0 ? "tk-btn" : "tk-btn-wood"} flex min-h-11 items-center justify-center gap-1.5 px-3 py-1.5 text-center font-display text-ui font-medium leading-tight`}>
              {!phone && <kbd aria-hidden className="tk-key">{i + 1}</kbd>}{c.label}{c.note && <span className="font-data text-meta text-gold">{c.note}</span>}
            </button>
          ))}
          <button type="button" onClick={onClose}
                  className="pressable tk tk-btn-wood flex min-h-11 items-center justify-center px-3 py-1.5 font-display text-ui font-medium opacity-75">
            {th ? "ไว้เจอกัน" : "See you"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex gap-1">
            {lines.map((_, i) => (
              <span key={i} className={`size-1.5 ${i === at ? "bg-accent" : i < at ? "bg-accent/40" : "bg-line-strong"}`} />
            ))}
          </span>
          <button ref={next} type="button" onClick={(e) => { e.stopPropagation(); go(); }}
                  className="pressable tk tk-btn ml-auto min-h-11 px-5 py-2 font-display text-ui font-medium">
            {last && !writing && !choices?.length ? (th ? "ไว้เจอกัน" : "See you") : (th ? "ต่อไป" : "Next")}
          </button>
        </div>
      )}
    </section>
  );
}

/** The speaker's portrait from the scenery, in hard pixels, standing on the box's top edge; nothing until it has come. */
function Portrait({ sprite, pixel }: { sprite: Sprite | null; pixel: number }) {
  if (!sprite) return <span aria-hidden className="w-24 shrink-0" />;
  const [x, y, w, h] = sprite.at;
  return (
    <span aria-hidden className="shrink-0" style={{
      width: w * pixel, height: h * pixel,
      backgroundImage: `url(${sprite.src})`,
      backgroundSize: `${sprite.sheet[0] * pixel}px ${sprite.sheet[1] * pixel}px`,
      backgroundPosition: `${-x * pixel}px ${-y * pixel}px`,
      imageRendering: "pixelated",
    }} />
  );
}
