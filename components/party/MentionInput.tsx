"use client";

import { useMemo, useRef, useState } from "react";
import type { PersonOption } from "@/lib/people";
import { EVERYONE } from "@/lib/mentions";
import { useLang } from "@/lib/i18n";
import { useAvatarOverrides } from "@/lib/avatars";

/**
 * A message box that finishes names for you.
 *
 * Typing "@" and a letter opens the roster, narrowed as you type, and picking
 * one writes the whole name. Which matters more here than it looks: a mention
 * only reaches somebody if the name is spelled exactly as the game spells it,
 * and FFXIV names are full of apostrophes and second words — "@Aqua" and "@Aqua
 * Eleison" are different people, and "@Br'aax" is not something anybody types
 * correctly from memory.
 *
 * Guests are in the list too. They are on the board, they can be in a party,
 * and a picker that can only name half the people in the room would send
 * anybody looking for the other half back to typing it by hand.
 *
 * The room is offered first where it matches, because "@everyone" is one of
 * the two or three things anybody actually types into this box.
 */

/** Enough of a name to be worth a list. One letter, as asked for. */
const MIN = 1;
/** More than this after the @ and it is prose, not a name being typed. */
const MAX = 32;
const SHOW = 8;

interface Hit {
  /** Null for the room. */
  id: number | null;
  name: string;
  avatar: string | null;
  guest?: boolean;
}

export default function MentionInput(
  { value, onChange, people, boxRef, ...rest }: {
    value: string;
    onChange: (v: string) => void;
    people: PersonOption[];
    boxRef?: React.RefObject<HTMLTextAreaElement | null>;
  } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>,
           "value" | "onChange" | "ref">,
) {
  const { t } = useLang();
  /*
   * The face they are wearing, not the one the roster last saw.
   *
   * Somebody who has set their own picture is that picture everywhere else on
   * this site — the member board, the seat grid, the messages two inches above
   * this list. A picker showing their Lodestone portrait instead would be the
   * one place that disagreed about what somebody looks like.
   */
  const overrides = useAvatarOverrides();
  const face = (id: number | null, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;
  const own = useRef<HTMLTextAreaElement>(null);
  const box = boxRef ?? own;
  /** Where the "@" is, and what has been typed after it. */
  const [at, setAt] = useState<{ from: number; query: string } | null>(null);
  const [hi, setHi] = useState(0);

  /*
   * The "@word" the caret is sitting in, if it is sitting in one.
   *
   * Read from the text and the caret rather than from what was last typed,
   * because somebody can click into the middle of a name they wrote a minute
   * ago, and because a paste is not a keystroke.
   */
  const look = (el: HTMLTextAreaElement) => {
    const caret = el.selectionStart ?? 0;
    const upto = el.value.slice(0, caret);
    const i = upto.lastIndexOf("@");
    if (i < 0) return setAt(null);
    // Not inside a word: an email address has an @ with something before it.
    if (i > 0 && !/[\s(\[{>]/.test(upto[i - 1])) return setAt(null);
    const query = upto.slice(i + 1);
    if (query.length < MIN || query.length > MAX || /[\n]/.test(query)) {
      return setAt(null);
    }
    setAt({ from: i, query });
    setHi(0);
  };

  const hits = useMemo<Hit[]>(() => {
    if (!at) return [];
    const q = at.query.toLowerCase();
    const room: Hit[] = EVERYONE.filter((w) => w.startsWith(q))
      .map((w) => ({ id: null, name: w, avatar: null }));
    /*
     * Starts-with before contains, and only starts-with on a single letter.
     *
     * Typing "aq" means somebody whose name begins that way far more often
     * than somebody with it in the middle. On one letter, contains matches
     * most of five hundred people — "a" is in half the roster — so a list
     * built that way is five names picked at random.
     */
    const starts: Hit[] = [];
    const inside: Hit[] = [];
    for (const p of people) {
      const n = p.name.toLowerCase();
      if (n.startsWith(q)) starts.push(p);
      else if (q.length > 1 && n.includes(q)) inside.push(p);
      if (starts.length >= SHOW) break;
    }
    return [...room, ...starts, ...inside].slice(0, SHOW);
  }, [at, people]);

  const put = (h: Hit) => {
    if (!at) return;
    const el = box.current;
    const caret = el?.selectionStart ?? value.length;
    const next = `${value.slice(0, at.from)}@${h.name} ${value.slice(caret)}`;
    onChange(next);
    setAt(null);
    // After the name and its space, which is where the sentence carries on.
    const to = at.from + h.name.length + 2;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(to, to);
    });
  };

  const keys = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!at || !hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((v) => (v + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((v) => (v - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      // Enter finishes the name rather than breaking the line — while the list
      // is open that is what it is being pressed for.
      e.preventDefault();
      put(hits[hi]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setAt(null);
    }
  };

  return (
    <div className="relative flex flex-col">
      {/*
        * Above the box, not below it.
        *
        * This sits at the foot of a window that scrolls, and a list dropping
        * downwards would open off the bottom of it — which is the one place a
        * list of eight cannot be read.
        */}
      {!!hits.length && (
        <ul className="absolute bottom-full left-0 z-[90] mb-1 max-h-64 w-[min(22rem,90%)] overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-2xl shadow-black/60">
          {hits.map((h, i) => (
            <li key={h.id ?? h.name}>
              <button type="button"
                      onMouseDown={(e) => { e.preventDefault(); put(h); }}
                      onMouseEnter={() => setHi(i)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[14.5px] ${
                        i === hi ? "bg-accent/15 text-accent" : "text-ink"}`}>
                {h.id == null ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/20 text-[13.5px] text-gold">
                    @
                  </span>
                ) : face(h.id, h.avatar) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={face(h.id, h.avatar)!} alt="" width={28} height={28}
                       className="size-7 shrink-0 rounded-full border border-line object-cover" />
                ) : (
                  /* Nobody the site has a picture of at all. Dashed, the same
                     mark the seat grid puts on somebody from outside it. */
                  <span className="size-7 shrink-0 rounded-full border border-dashed border-line" />
                )}
                <span className="truncate">{h.name}</span>
                {h.id == null && (
                  <span className="ml-auto shrink-0 font-data text-[11.5px] uppercase tracking-[0.1em] text-gold">
                    {t("party.mentionAll")}
                  </span>
                )}
                {h.guest && (
                  <span className="ml-auto shrink-0 font-data text-[11.5px] uppercase tracking-[0.1em] text-muted">
                    {t("party.mentionGuest")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea {...rest} ref={box} value={value}
                onChange={(e) => { onChange(e.target.value); look(e.target); }}
                onKeyDown={keys}
                onKeyUp={(e) => look(e.currentTarget)}
                onClick={(e) => look(e.currentTarget)}
                // Not on blur directly: clicking a name blurs the box, and a
                // list that closes before the click lands is a list nothing
                // can be picked from. The mousedown above commits first.
                onBlur={() => requestAnimationFrame(() => setAt(null))} />
    </div>
  );
}
